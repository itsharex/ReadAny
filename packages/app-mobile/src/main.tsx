/**
 * Entry point — mount React app for mobile
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@readany/core/i18n";
import "./styles/globals.css";
import { setPlatformService } from "@readany/core/services";
import { MobilePlatformService } from "./lib/platform/mobile-platform-service";

// Register mobile platform service
const mobilePlatform = new MobilePlatformService();
mobilePlatform.initSync().catch(console.error);
setPlatformService(mobilePlatform);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
