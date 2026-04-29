/**
 * src/main.jsx
 * ─────────────────────────────────────────────
 * Calibr – React app bootstrap
 *
 * Mounts the <App /> component into the #root div
 * defined in index.html.
 *
 * React.StrictMode is enabled in development:
 *   - Warns about deprecated patterns
 *   - Double-invokes some hooks to catch side effects
 *   - Has NO effect in production builds
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./index.css"; // Tailwind base styles + global overrides

const GOOGLE_CLIENT_ID = "1015567038496-n9c6eh8vuq31icu3gtqhjabq9kvl4lhr.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
