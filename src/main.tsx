import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// No StrictMode: the map/trip logic is imperative (D3 + direct DOM), so we
// initialize it exactly once rather than letting StrictMode double-invoke effects.
createRoot(document.getElementById("root")!).render(<App />);
