import { defineConfig } from 'vite';

// base './' -> asset paths relative, so the build works on GitHub Pages project
// sites (https://user.github.io/repo/) without extra configuration. Routing is
// hash based, so no SPA fallback is required either.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    host: true,
    open: false,
  },
  preview: {
    host: true,
  },
});
