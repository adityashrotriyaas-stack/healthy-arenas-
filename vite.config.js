import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // npm run dev serves the SPA; vercel dev on 3131 provides the API
      "/api": "http://localhost:3131",
    },
  },
});
