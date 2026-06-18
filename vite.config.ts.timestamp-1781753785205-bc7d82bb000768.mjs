// vite.config.ts
import { defineConfig } from "file:///C:/Users/%E7%99%BD%E4%B8%9C%E9%91%AB/work01/SoloCoder/5585-vue-poll/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/%E7%99%BD%E4%B8%9C%E9%91%AB/work01/SoloCoder/5585-vue-poll/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import path from "path";
import Inspector from "file:///C:/Users/%E7%99%BD%E4%B8%9C%E9%91%AB/work01/SoloCoder/5585-vue-poll/node_modules/unplugin-vue-dev-locator/dist/vite.mjs";
import traeBadgePlugin from "file:///C:/Users/%E7%99%BD%E4%B8%9C%E9%91%AB/work01/SoloCoder/5585-vue-poll/node_modules/vite-plugin-trae-solo-badge/dist/vite-plugin.esm.js";
var __vite_injected_original_dirname = "C:\\Users\\\u767D\u4E1C\u946B\\work01\\SoloCoder\\5585-vue-poll";
var vite_config_default = defineConfig({
  server: {
    port: 5176,
    strictPort: true
  },
  build: {
    sourcemap: "hidden"
  },
  plugins: [
    vue(),
    Inspector(),
    traeBadgePlugin({
      variant: "dark",
      position: "bottom-right",
      prodOnly: true,
      clickable: true,
      clickUrl: "https://www.trae.ai/solo?showJoin=1",
      autoTheme: true,
      autoThemeTarget: "#app"
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "sass:color"; @use "@/assets/styles/variables" as *; @use "@/assets/styles/mixins" as *;`,
        api: "modern-compiler",
        silenceDeprecations: ["color-functions", "global-builtin", "import", "legacy-js-api"]
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxcdTc2N0RcdTRFMUNcdTk0NkJcXFxcd29yazAxXFxcXFNvbG9Db2RlclxcXFw1NTg1LXZ1ZS1wb2xsXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxcdTc2N0RcdTRFMUNcdTk0NkJcXFxcd29yazAxXFxcXFNvbG9Db2RlclxcXFw1NTg1LXZ1ZS1wb2xsXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy8lRTclOTklQkQlRTQlQjglOUMlRTklOTElQUIvd29yazAxL1NvbG9Db2Rlci81NTg1LXZ1ZS1wb2xsL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBJbnNwZWN0b3IgZnJvbSAndW5wbHVnaW4tdnVlLWRldi1sb2NhdG9yL3ZpdGUnXG5pbXBvcnQgdHJhZUJhZGdlUGx1Z2luIGZyb20gJ3ZpdGUtcGx1Z2luLXRyYWUtc29sby1iYWRnZSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3NixcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICB9LFxuICBidWlsZDoge1xuICAgIHNvdXJjZW1hcDogJ2hpZGRlbicsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBJbnNwZWN0b3IoKSxcbiAgICB0cmFlQmFkZ2VQbHVnaW4oe1xuICAgICAgdmFyaWFudDogJ2RhcmsnLFxuICAgICAgcG9zaXRpb246ICdib3R0b20tcmlnaHQnLFxuICAgICAgcHJvZE9ubHk6IHRydWUsXG4gICAgICBjbGlja2FibGU6IHRydWUsXG4gICAgICBjbGlja1VybDogJ2h0dHBzOi8vd3d3LnRyYWUuYWkvc29sbz9zaG93Sm9pbj0xJyxcbiAgICAgIGF1dG9UaGVtZTogdHJ1ZSxcbiAgICAgIGF1dG9UaGVtZVRhcmdldDogJyNhcHAnLFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcbiAgY3NzOiB7XG4gICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgc2Nzczoge1xuICAgICAgICBhZGRpdGlvbmFsRGF0YTogYEB1c2UgXCJzYXNzOmNvbG9yXCI7IEB1c2UgXCJAL2Fzc2V0cy9zdHlsZXMvdmFyaWFibGVzXCIgYXMgKjsgQHVzZSBcIkAvYXNzZXRzL3N0eWxlcy9taXhpbnNcIiBhcyAqO2AsXG4gICAgICAgIGFwaTogJ21vZGVybi1jb21waWxlcicsXG4gICAgICAgIHNpbGVuY2VEZXByZWNhdGlvbnM6IFsnY29sb3ItZnVuY3Rpb25zJywgJ2dsb2JhbC1idWlsdGluJywgJ2ltcG9ydCcsICdsZWdhY3ktanMtYXBpJ10sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1VixTQUFTLG9CQUFvQjtBQUNwWCxPQUFPLFNBQVM7QUFDaEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sZUFBZTtBQUN0QixPQUFPLHFCQUFxQjtBQUo1QixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsV0FBVztBQUFBLEVBQ2I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLFVBQVU7QUFBQSxJQUNWLGdCQUFnQjtBQUFBLE1BQ2QsU0FBUztBQUFBLE1BQ1QsVUFBVTtBQUFBLE1BQ1YsVUFBVTtBQUFBLE1BQ1YsV0FBVztBQUFBLE1BQ1gsVUFBVTtBQUFBLE1BQ1YsV0FBVztBQUFBLE1BQ1gsaUJBQWlCO0FBQUEsSUFDbkIsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILHFCQUFxQjtBQUFBLE1BQ25CLE1BQU07QUFBQSxRQUNKLGdCQUFnQjtBQUFBLFFBQ2hCLEtBQUs7QUFBQSxRQUNMLHFCQUFxQixDQUFDLG1CQUFtQixrQkFBa0IsVUFBVSxlQUFlO0FBQUEsTUFDdEY7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
