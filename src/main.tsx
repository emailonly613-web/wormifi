import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerWormifiServiceWorker } from "./pwa";
import "./pwa.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerWormifiServiceWorker();
