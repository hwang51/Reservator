# ─── Stage 1: Frontend Build ──────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-slim AS production

# Chromium + 한글 폰트 + 네이티브 모듈 빌드 도구
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-nanum \
    python3 \
    make \
    g++ \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer가 내장 Chrome 다운로드를 건너뛰고 시스템 Chromium 사용
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app/backend

# 패키지 설치 (devDependencies 제외)
COPY backend/package*.json ./
RUN npm ci --omit=dev

# 백엔드 소스 복사
COPY backend/ ./

# 빌드된 프론트엔드 복사
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# DB 저장 경로 (볼륨 마운트 지점)
ENV DB_PATH=/data/data.db
VOLUME ["/data"]

EXPOSE 5000

CMD ["npx", "tsx", "src/index.ts"]
