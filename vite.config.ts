import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localAdmin } from "./dev/localAdmin";
import { community } from "./dev/community";
export default defineConfig({
  plugins: [react(), localAdmin(), community()],
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    watch: {
      ignored: [
        "**/public/content/**",
        "**/.local-admin/**",
        "**/.student-auth/**",
      ],
    },
    fs: {
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/.local-admin/**",
        "**/.student-auth/**",
      ],
    },
  },
});
