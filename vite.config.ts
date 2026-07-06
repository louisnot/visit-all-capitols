import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project page served at https://louisnot.github.io/visit-all-capitols/
// Base path is only needed for the production build; dev serves from "/".
// (set base to "/" if you move this to a user page or a custom domain root)
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/visit-all-capitols/" : "/",
  plugins: [react()],
}));
