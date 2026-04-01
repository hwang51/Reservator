import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import taskRoutes from './routes/tasks.js';
import { schedulerService } from './services/scheduler.js';

dotenv.config();

const app  = express();
const port = process.env.PORT || 5000;

// ── 프론트엔드 dist 경로 감지 ──────────────────────────────────────────────────
// 1) pkg 실행 exe 모드: exe 옆 frontend/ 폴더
// 2) esbuild 번들 모드: dist/bundle.cjs 옆 frontend/ 폴더
// 3) tsx 개발 모드:    src/index.ts 기준 ../../frontend/dist
function getFrontendDist(): string {
  const isPkg = Boolean((process as any).pkg);

  if (isPkg) {
    return path.join(path.dirname(process.execPath), 'frontend');
  }

  const candidates: string[] = [];
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.resolve(dir, 'frontend'));           // dist/frontend
    candidates.push(path.resolve(dir, '../../frontend/dist')); // src → repo root
  } catch {}
  candidates.push(path.resolve(process.cwd(), '../frontend/dist'));

  return candidates.find(p => fs.existsSync(p)) ?? candidates[0];
}

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/tasks', taskRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 정적 파일 서빙
const frontendDist = getFrontendDist();
console.log(`[SERVER] frontend: ${frontendDist}`);
app.use(express.static(frontendDist));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

schedulerService.startAllTasks();

app.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`[SERVER] ${url}`);
  exec(`start ${url}`);
});
