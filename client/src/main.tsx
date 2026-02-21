import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Import gateway store FIRST to register WS event handlers before any connect()
import "@/stores/gatewayStore";
import App from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(<App />);
