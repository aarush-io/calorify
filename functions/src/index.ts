import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function userRef(uid: string) {
  return db.collection("users").doc(uid);
}

/** Throw an HttpsError if the caller is not authenticated. */
function requireAuth(
  context: functions.https.CallableContext
): asserts context is functions.https.CallableContext & {
  auth: NonNullable<functions.https.CallableContext["auth"]>;
} {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in."
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. scanFood
//    Accepts a plain-text food description (or OCR'd text from a photo).
//    Calls OpenRouter → Gemini 2.0 Flash and returns structured nutrition data.
//    Guards: anonymous users blocked, free-tier limit enforced, no double-inc.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanFoodRequest {
  description: string; // e.g. "a bowl of oatmeal with blueberries"
}

export interface ScanFoodResponse {
  foodName: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export const scanFood = functions
  .runWith({ secrets: ["OPENROUTER_API_KEY"] })
  .https.onCall(async (data: ScanFoodRequest, context) => {
    // ── Auth guard ──────────────────────────────────────────────────────────
    requireAuth(context);

    const uid = context.auth.uid;
    const isAnonymous = context.auth.token.firebase?.sign_in_provider === "anonymous";

    if (isAnonymous) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Sign in with Google to use AI food scan."
      );
    }

    // ── Quota guard (atomic transaction to prevent double-increment) ────────
    const ref = userRef(uid);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", "User profile not found.");
      }

      const data = snap.data()!;
      const plan: string = data.plan ?? "free";
      const used: number = data.aiScansUsed ?? 0;
      const limit: number = data.aiScansLimit ?? 10;

      if (plan !== "pro" && used >= limit) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          `You have used all ${limit} free AI scans. Upgrade to Pro for unlimited scans.`
        );
      }

      // Reserve the scan slot now — we'll confirm after the AI call succeeds.
      // Using a "scanning: true" flag prevents concurrent requests from both
      // reading `used` before either has written the increment.
      if (data.scanning === true) {
        throw new functions.https.HttpsError(
          "already-exists",
          "A scan is already in progress."
        );
      }
      tx.update(ref, { scanning: true });

      return { plan, used, limit };
    });

    // ── OpenRouter / Gemini call ─────────────────────────────────────────────
    let nutrition: ScanFoodResponse;

    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("OPENROUTER_API_KEY secret not configured.");

      const prompt = `You are a nutrition expert. Analyze the following food description and return a JSON object ONLY — no markdown, no explanation.

Food: "${data.description.trim().slice(0, 500)}"

Return exactly this shape:
{
  "foodName": "string (canonical name)",
  "calories": number (kcal for one serving),
  "protein": number (grams),
  "carbs": number (grams),
  "fats": number (grams)
}

Rules:
- calories must be a positive integer
- protein/carbs/fats are floats rounded to 1 decimal
- If you cannot identify the food, return { "error": "unrecognised" }`;

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://calorify.app",
            "X-Title": "Calorify",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-exp",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1, // low temp for consistent structured output
            max_tokens: 200,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter error ${response.status}: ${errText}`);
      }

      const aiData = await response.json();
      const raw: string = aiData.choices?.[0]?.message?.content ?? "";

      // Strip accidental markdown fences
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (parsed.error === "unrecognised") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Could not identify that food. Try a more specific description."
        );
      }

      nutrition = {
        foodName: String(parsed.foodName),
        calories: Math.round(Number(parsed.calories)),
        protein: parsed.protein != null ? Number(parsed.protein) : undefined,
        carbs: parsed.carbs != null ? Number(parsed.carbs) : undefined,
        fats: parsed.fats != null ? Number(parsed.fats) : undefined,
      };
    } catch (err) {
      // Release the scanning lock on failure so user can retry
      await ref.update({ scanning: false });

      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError(
        "internal",
        "AI scan failed. Please try again."
      );
    }

    // ── Commit scan usage increment ──────────────────────────────────────────
    await ref.update({
      aiScansUsed: admin.firestore.FieldValue.increment(1),
      scanning: false,
    });

    return nutrition;
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. createRazorpaySubscription
//    Creates a Razorpay subscription and returns the subscription id + key.
//    The frontend uses these to open the Razorpay checkout.
// ─────────────────────────────────────────────────────────────────────────────

export const createRazorpaySubscription = functions
  .runWith({ secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] })
  .https.onCall(async (_data, context) => {
    requireAuth(context);

    const uid = context.auth.uid;
    const isAnonymous =
      context.auth.token.firebase?.sign_in_provider === "anonymous";

    if (isAnonymous) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Sign in with Google to subscribe."
      );
    }

    // Check they're not already Pro
    const snap = await userRef(uid).get();
    const userData = snap.data();
    if (userData?.plan === "pro" && userData?.subscriptionStatus === "active") {
      throw new functions.https.HttpsError(
        "already-exists",
        "You are already a Pro subscriber."
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay secrets not configured.");
    }

    // Create Razorpay subscription via REST API
    // (Using fetch instead of SDK to keep the bundle lean)
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: process.env.RAZORPAY_PLAN_ID, // set in Firebase env config
        total_count: 12, // 12 monthly billing cycles
        quantity: 1,
        notes: { uid, app: "calorify" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      functions.logger.error("Razorpay subscription creation failed", errText);
      throw new functions.https.HttpsError(
        "internal",
        "Could not create subscription. Please try again."
      );
    }

    const sub = await response.json();

    // Store pending subscription id so verifyPayment can validate it
    await userRef(uid).update({
      pendingSubscriptionId: sub.id,
    });

    return {
      subscriptionId: sub.id as string,
      keyId: keyId,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. verifyRazorpayPayment
//    Called by frontend after Razorpay checkout succeeds.
//    Verifies HMAC signature — never trusts the frontend's claim of success.
//    Only upgrades the user to Pro after cryptographic verification passes.
// ─────────────────────────────────────────────────────────────────────────────

export interface VerifyPaymentRequest {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const verifyRazorpayPayment = functions
  .runWith({ secrets: ["RAZORPAY_KEY_SECRET"] })
  .https.onCall(async (data: VerifyPaymentRequest, context) => {
    requireAuth(context);

    const uid = context.auth.uid;

    const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } =
      data;

    if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing payment verification fields."
      );
    }

    // ── Verify the subscription belongs to this user ─────────────────────────
    const snap = await userRef(uid).get();
    const userData = snap.data();

    if (userData?.pendingSubscriptionId !== razorpay_subscription_id) {
      functions.logger.warn("Subscription ID mismatch", {
        uid,
        expected: userData?.pendingSubscriptionId,
        received: razorpay_subscription_id,
      });
      throw new functions.https.HttpsError(
        "permission-denied",
        "Subscription ID does not match. Payment rejected."
      );
    }

    // ── HMAC-SHA256 signature verification ──────────────────────────────────
    const crypto = await import("crypto");
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;

    const payload = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const expectedSig = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      functions.logger.warn("Razorpay signature mismatch", { uid });
      throw new functions.https.HttpsError(
        "permission-denied",
        "Payment signature invalid. Do not upgrade."
      );
    }

    // ── Signature valid — upgrade user ───────────────────────────────────────
    await userRef(uid).update({
      plan: "pro",
      subscriptionStatus: "active",
      subscriptionId: razorpay_subscription_id,
      latestPaymentId: razorpay_payment_id,
      upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
      pendingSubscriptionId: admin.firestore.FieldValue.delete(),
    });

    functions.logger.info("User upgraded to Pro", { uid });

    return { success: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 4. handleRazorpayWebhook
//    Optional but recommended: handles subscription cancellations/failures
//    from Razorpay's server-side webhook so the app stays in sync even if
//    the user closes the app mid-session.
// ─────────────────────────────────────────────────────────────────────────────

export const handleRazorpayWebhook = functions
  .runWith({ secrets: ["RAZORPAY_WEBHOOK_SECRET"] })
  .https.onRequest(async (req, res) => {
    const crypto = await import("crypto");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    // Verify webhook signature
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = JSON.stringify(req.body);
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSig) {
      functions.logger.warn("Webhook signature mismatch");
      res.status(400).send("Invalid signature");
      return;
    }

    const event = req.body;
    functions.logger.info("Razorpay webhook", { event: event.event });

    if (
      event.event === "subscription.cancelled" ||
      event.event === "subscription.completed" ||
      event.event === "subscription.halted"
    ) {
      const subId: string = event.payload?.subscription?.entity?.id;
      if (!subId) {
        res.status(200).send("ok");
        return;
      }

      // Find user by subscriptionId and downgrade
      const query = await db
        .collection("users")
        .where("subscriptionId", "==", subId)
        .limit(1)
        .get();

      if (!query.empty) {
        const userDoc = query.docs[0];
        await userDoc.ref.update({
          plan: "free",
          subscriptionStatus: "inactive",
          aiScansLimit: 10,
        });
        functions.logger.info("User downgraded", { uid: userDoc.id, event: event.event });
      }
    }

    res.status(200).send("ok");
  });
