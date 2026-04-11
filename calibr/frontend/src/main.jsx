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
import App from "./App.jsx";
import "./index.css"; // Tailwind base styles + global overrides

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
