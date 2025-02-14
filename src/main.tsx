import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import ErrorFallback from "./ErrorFallback.tsx";
import { ErrorBoundary } from "react-error-boundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>
);
