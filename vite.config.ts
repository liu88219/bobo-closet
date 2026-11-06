import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base './' ensures GitHub Pages works cleanly at https://liu88219.github.io/bobo-closet/
export default defineConfig({
  plugins: [react()],
  base: './',
});
