import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.json': 'application/json; charset=utf-8',
};

function serveParentDocsMiddleware(server) {
  server.middlewares.use((req, res, next) => {
    const cleanUrl = (req.url || '').split('?')[0];
    if (!cleanUrl.startsWith('/foundry/') && !cleanUrl.startsWith('/resources/')) {
      return next();
    }

    const decoded = decodeURIComponent(cleanUrl).replace(/^\/+/, '');
    const targetPath = path.resolve(repoRoot, decoded);

    // Prevent path traversal outside repoRoot
    if (!targetPath.startsWith(repoRoot + path.sep)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      const ext = path.extname(targetPath).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
      fs.createReadStream(targetPath).pipe(res);
      return;
    }

    next();
  });
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-palantir-docs-assets',
      configureServer(server) {
        serveParentDocsMiddleware(server);
      },
      configurePreviewServer(server) {
        serveParentDocsMiddleware(server);
      },
      closeBundle() {
        const distDir = path.resolve(__dirname, 'dist');
        if (!fs.existsSync(distDir)) return;
        for (const dir of ['foundry', 'resources']) {
          const linkPath = path.join(distDir, dir);
          const relTarget = path.join('..', '..', dir);
          try {
            if (!fs.existsSync(linkPath)) {
              fs.symlinkSync(relTarget, linkPath, 'dir');
            }
          } catch {
            // Non-fatal if symlinks are unsupported
          }
        }
      },
    },
  ],
  build: {
    target: 'esnext',
  },
});
