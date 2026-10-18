import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/components/arc/foundation.css";
import "./index.css";
import { App } from "./App";
import { StoryPage } from "./StoryPage";

// Versi 1 (dashboard umum) di "/", versi 2 (satu halaman bercerita) di "/#cerita".
const Page = window.location.hash === "#cerita" ? StoryPage : App;
window.addEventListener("hashchange", () => window.location.reload());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
