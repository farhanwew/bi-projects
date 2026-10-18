import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/components/arc/foundation.css";
import "./index.css";
import { Shell } from "./Shell";

// Tautan lama: "#cerita" ke dashboard versi 2, "#/revisi" (bekas halaman lampiran) ke versi 2 dengan catatan revisi.
if (window.location.hash === "#cerita") window.location.replace("#/cerita");
if (window.location.hash.startsWith("#/revisi")) window.location.replace("#/cerita?catatan");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
