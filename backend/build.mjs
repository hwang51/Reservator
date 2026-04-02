import { build } from 'esbuild';
import { execSync }  from 'child_process';
import fs            from 'fs';
import path          from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, '..');
const dist      = path.join(__dirname, 'dist');
const release   = path.join(root, 'release');

function run(cmd, cwd = __dirname) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function copyDir(src, dst) {
  fs.cpSync(src, dst, { recursive: true, force: true });
}

async function main() {
  // ── 1. 초기화 ────────────────────────────────────────────────────────────────
  // 기존 파일 보존 (빌드 후 복원)
  const releaseEnv   = path.join(release, '.env');
  const releaseGuide = path.join(release, '시작하기.txt');
  const releaseDb    = path.join(release, 'data.db');
  const savedEnv     = fs.existsSync(releaseEnv)   ? fs.readFileSync(releaseEnv,   'utf8') : null;
  const savedGuide   = fs.existsSync(releaseGuide) ? fs.readFileSync(releaseGuide, 'utf8') : null;
  const savedDb      = fs.existsSync(releaseDb)    ? fs.readFileSync(releaseDb)            : null;

  fs.rmSync(dist,    { recursive: true, force: true });
  fs.rmSync(release, { recursive: true, force: true });
  fs.mkdirSync(dist,    { recursive: true });
  fs.mkdirSync(release, { recursive: true });

  // ── 2. 프론트엔드 빌드 ────────────────────────────────────────────────────────
  console.log('\n▶ [1/4] 프론트엔드 빌드...');
  run('npm run build', path.join(root, 'frontend'));

  // ── 3. 백엔드 번들링 (TypeScript → CJS) ────────────────────────────────────
  console.log('\n▶ [2/4] 백엔드 번들링...');
  await build({
    entryPoints:  [path.join(__dirname, 'src/index.ts')],
    bundle:       true,
    platform:     'node',
    target:       'node24',
    format:       'cjs',
    outfile:      path.join(dist, 'bundle.cjs'),
    // 네이티브 모듈은 외부로 분리 (pkg가 별도 처리)
    external:          ['better-sqlite3'],
    tsconfig:          path.join(__dirname, 'tsconfig.json'),
    define:            { 'process.env.NODE_ENV': '"production"' },
    // .ts 파일을 .js보다 우선 탐색 (src/ 에 구 컴파일 .js 파일이 있어도 무시)
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  });
  console.log('   → dist/bundle.cjs 생성');

  // ── 4. 릴리즈 폴더 구성 ──────────────────────────────────────────────────────
  console.log('\n▶ [3/4] 릴리즈 폴더 구성...');

  // 프론트엔드 정적 파일
  copyDir(path.join(root, 'frontend', 'dist'), path.join(release, 'frontend'));
  console.log('   → release/frontend/ 복사');

  // better-sqlite3 네이티브 바이너리
  const nodeSrc = path.join(__dirname, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
  fs.copyFileSync(nodeSrc, path.join(dist, 'better_sqlite3.node'));
  console.log('   → dist/better_sqlite3.node 복사');

  // bindings 모듈은 build/better_sqlite3.node 를 가장 먼저 탐색하므로,
  // pkg 스냅샷 안에서도 찾을 수 있도록 해당 위치에 미리 복사해둔다
  const bindingBuildDir = path.join(__dirname, 'node_modules', 'better-sqlite3', 'build');
  fs.copyFileSync(nodeSrc, path.join(bindingBuildDir, 'better_sqlite3.node'));
  console.log('   → node_modules/better-sqlite3/build/better_sqlite3.node 복사 (bindings 첫 탐색 경로)');

  // .env.example → release/.env.example
  fs.copyFileSync(path.join(root, '.env.example'), path.join(release, '.env.example'));

  // ── 5. pkg로 exe 생성 ─────────────────────────────────────────────────────
  console.log('\n▶ [4/4] EXE 패키징...');
  run(
    [
      'npx @yao-pkg/pkg dist/bundle.cjs',
      '--target node24-win-x64',
      `--output ${path.join(release, 'reservator.exe')}`,
      '--public',
      `--config ${path.join(__dirname, 'pkg.config.json')}`,
    ].join(' ')
  );

  // better_sqlite3.node → release/ 로 복사 (exe 옆에 위치)
  fs.copyFileSync(
    path.join(dist, 'better_sqlite3.node'),
    path.join(release, 'better_sqlite3.node')
  );

  // .env 복원 (있었으면) / 없었으면 .env.example → .env 복사
  if (savedEnv !== null) {
    fs.writeFileSync(releaseEnv, savedEnv, 'utf8');
    console.log('   → release/.env 복원');
  } else {
    fs.copyFileSync(path.join(root, '.env.example'), releaseEnv);
    console.log('   → release/.env 생성 (example 복사) — 값을 직접 입력하세요');
  }

  // 시작하기.txt 복원
  if (savedGuide !== null) {
    fs.writeFileSync(releaseGuide, savedGuide, 'utf8');
    console.log('   → release/시작하기.txt 복원');
  }

  // data.db 복원
  if (savedDb !== null) {
    fs.writeFileSync(releaseDb, savedDb);
    console.log('   → release/data.db 복원');
  }

  // ── 완료 ────────────────────────────────────────────────────────────────────
  console.log('\n✅ 빌드 완료!');
  console.log('\n📦 배포 폴더: release/');
  console.log('   reservator.exe        ← 실행 파일');
  console.log('   frontend/             ← 웹 UI 파일');
  console.log('   better_sqlite3.node   ← DB 바이너리');
  console.log('   .env.example          ← 환경변수 템플릿');
  console.log('\n🚀 실행 방법:');
  console.log('   1. release/.env.example → release/.env 로 복사 후 값 입력');
  console.log('   2. reservator.exe 실행');
  console.log('   3. 브라우저에서 http://localhost:5000 접속');
}

main().catch(err => { console.error(err); process.exit(1); });
