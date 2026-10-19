import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { registerMultiplayerRoutes } from './server/multiplayer.ts';

dotenv.config();
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
registerMultiplayerRoutes(app);

const port = Number(process.env.PORT) || 3000;
const root = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(root, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
  }
  app.listen(port, '0.0.0.0', () => console.log('Dafaha listening on port ' + port));
}
startServer().catch(error => { console.error('Server startup failed:', error); process.exitCode = 1; });
