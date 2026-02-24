import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "rgba(20, 20, 30, 0.95)",
            color: "#F8FAFC",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            backdropFilter: "blur(20px)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            padding: "12px 16px",
          },
          success: {
            iconTheme: { primary: "#10B981", secondary: "#0A0A0F" },
          },
          error: {
            iconTheme: { primary: "#EF4444", secondary: "#0A0A0F" },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
