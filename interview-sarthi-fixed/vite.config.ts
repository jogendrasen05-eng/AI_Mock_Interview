import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    plugins: [
      tanstackStart(),
      nitro(
        isDev
          ? {
              routeRules: {
                "/api/**": { proxy: "http://localhost:5000/api/**" },
              },
            }
          : {}
      ),
      viteReact(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
    ],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
