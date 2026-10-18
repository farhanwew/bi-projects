import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/components/arc/foundation.css";
import "./index.css";
import { Shell } from "./Shell";

// Tautan lama "#cerita" tetap diarahkan ke halaman cerita.
if (window.location.hash === "#cerita") window.location.replace("#/cerita");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
