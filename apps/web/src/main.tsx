import "@xyflow/react/dist/style.css";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";
import { App } from "./App.js";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  </StrictMode>
);


