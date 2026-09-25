import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build in un unico file HTML autosufficiente (three.js incluso):
// si apre anche offline e si pubblica così com'è.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
});
