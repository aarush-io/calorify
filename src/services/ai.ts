/**
 * src/services/ai.ts
 *
 * Frontend-only wrappers for the AI Firebase Functions.
 * The actual OpenRouter call never happens here — it lives in functions/src/index.ts.
 * This file just calls the Firebase callable endpoints and types the responses.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";

const functions = getFunctions();

// ── Types (mirrored from functions/src/index.ts) ──────────────────────────────

export interface ScanFoodRequest {
  description: string;
}

export interface ScanFoodResult {
  foodName: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export interface SubscriptionResult {
  subscriptionId: string;
  keyId: string;
}

export interface VerifyPaymentRequest {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// ── Callables ─────────────────────────────────────────────────────────────────

const _scanFood = httpsCallable<ScanFoodRequest, ScanFoodResult>(
  functions,
  "scanFood"
);

const _createSubscription = httpsCallable<void, SubscriptionResult>(
  functions,
  "createRazorpaySubscription"
);

const _verifyPayment = httpsCallable<VerifyPaymentRequest, { success: boolean }>(
  functions,
  "verifyRazorpayPayment"
);

/**
 * Call the backend AI scanner.
 * Throws a typed error with .message if quota exceeded or AI fails.
 */
export async function scanFoodAI(description: string): Promise<ScanFoodResult> {
  if (!navigator.onLine) {
    throw new Error("You're offline. Connect to the internet to use AI scan.");
  }

  if (!auth.currentUser) {
    throw new Error("You must be signed in to use AI scan.");
  }

  const result = await _scanFood({ description });
  return result.data;
}

/**
 * Create a Razorpay subscription — returns the id and publishable key
 * needed to open the Razorpay checkout modal on the frontend.
 */
export async function createSubscription(): Promise<SubscriptionResult> {
  const result = await _createSubscription();
  return result.data;
}

/**
 * Verify the payment after Razorpay checkout succeeds.
 * Only after this returns { success: true } should the UI show Pro status.
 */
export async function verifyPayment(
  payload: VerifyPaymentRequest
): Promise<boolean> {
  const result = await _verifyPayment(payload);
  return result.data.success;
}
