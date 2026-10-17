# Deployment & DevOps

## Environment Strategy

| Environment | Purpose | Services | Deployment |
|-------------|---------|----------|------------|
| **Local** | Development, testing | Bun runtime; local Supabase (Docker); local MongoDB (Docker); local Ably emulator | `bun dev`; `docker compose up` |
| **Staging** | Pre-production testing | Same stack as production but scaled | Render/staging project; Vercel preview |
| **Production** | Live user facing | Production services with free-tier limits | Render Web Service; Vercel/Netlify; Ably production tier if needed |

## Local Development Setup

```bash
# 1. Clone repo
git clone https://github.com/your-org/knots.git
cd knots

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with local values (see below)

# 4. Start local services (Supabase + MongoDB)
docker compose up -d

# 5. Run migrations (Supabase)
npx supabase db push

# 6. Start dev server
bun dev
# App: http://localhost:5173
# API: http://localhost:5173/api/v1 (rewritten to Bun server)

# 7. Run tests
bun test          # Vitest unit tests
bun test --e2e   # Playwright E2E (if headed mode)
bun run lint     # Biome lint
bun run format   # Biome format
```

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Run Test Suite
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Bun
        uses: oven-sh/bun-action@v1
        with:
          bun-version: latest
      - name: Install dependencies
        run: bun install
      - name: Run Vitest unit tests
        run: bun test --coverage
      - name: Run Biome lint
        run: biome check --write .
      - name: Run typecheck
        run: tsc --noEmit
      
  security:
    name: Security Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Bun
        uses: oven-sh/bun-action@v1
      - name: Run npm audit
        run: bun audit
      - name: Run TruffleHog
        uses: trufflesecurity/trufflehog-action@v2
        with:
          folder: .
      - name: Check Dependabot alerts
        uses: dependabot/fetch-alerts-action@v1
      
  build:
    name: Build Application
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Bun
        uses: oven-sh/bun-action@v1
      - name: Install dependencies
        run: bun install
      - name: Build Next.js
        run: bun next build
      - name: Verify build artifacts
        run: ls out/.next/standalone/
      
  deploy:
    name: Deploy to Production
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Setup Bun
        uses: oven-sh/bun-action@v1
      - name: Install dependencies
        run: bun install
      - name: Build Next.js
        run: bun next build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-dir: .
      - name: Deploy to Render
        # Manual approval step for Render deployment
        run: echo "Trigger Render deployment manually"
```

## Rollback Strategy

| Scenario | Rollback Method | RTO (Recovery Time Objective) |
|----------|-----------------|------------------------------|
| **Bad deployment** | Revert to previous Git tag; `vercel rollback` or Render redeploy from prior build | < 5 minutes |
| **Database migration failure** | Supabase migration revert; point-in-time recovery (PITR) if needed | < 15 minutes |
| **Ably channel issues** | Switch to different Ably channel key; Ably supports key rotation | < 2 minutes |
| **MongoDB data corruption** | Restore from last successful backup (MongoDB Atlas point-in-time) | < 30 minutes |
| **Supabase breach** | Rotate keys, generate new Knot IDs for all users; invalidate old sessions | < 1 hour (communication to users) |

**Rollback Procedure**:

1. Identify the failure point (logs, monitoring alerts)
2. If frontend: `vercel rollback --target production`
3. If backend: Redeploy previous Docker image tag on Render
4. If database: Supabase `db revert` or MongoDB Atlas backup restore
5. Communicate to users if Knot IDs or sessions invalidated
6. Verify all critical paths functional post-rollback

## Monitoring and Alerting

| Metric | Threshold | Alert Channel |
|--------|-----------|---------------|
| **Error rate (Sentry)** | > 2% of requests | Slack #knots-errors |
| **Ably connection drops** | > 3/minute | Slack #knots-alerts |
| **MongoDB TTL lag** | Messages not auto-deleting within 1h | Email on-call |
| **Supabase connection pool exhaustion** | > 80% usage | Slack #knots-alerts |
| **Rate limit triggers** | > 5/minute per IP | Log only (informational) |
| **Frontend JS errors** | > 5 unique errors/user/session | Sentry dashboard |

### Sentry Configuration

```javascript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,        // 10% of transactions for profiling
  attachStacktrace: true,
  release: process.env.npm_package_version,
  
  // Sanitize - never send PII or Knot IDs to Sentry
  beforeSend: (event) => {
    // Redact any user-identifying data
    if (event.request) {
      event.request.headers = event.request.headers?.filter(
        (h: string) => !h.startsWith('x-knots-') && h !== 'authorization'
      )
    }
    return event
  }
})
```

## Free-Tier Service Configuration

| Service | Free Tier Details | Configuration |
|---------|-------------------|---------------|
| **Render** | Free Web Service; 750hrs/month; 15-min spin-down after inactivity | Use KeepAlive ping service or accept spin-down; handle graceful reconnection |
| **Vercel** | Free tier; unlimited bandwidth; no credit card required | Deploy frontend; automatic preview on PR |
| **Netlify** | Free tier; similar to Vercel | Alternative frontend host |
| **Ably Free** | 6M messages/month; 100 concurrent connections per channel; no card needed | Configure channel permissions; monitor message count |
| **Supabase Free** | PostgreSQL 500MB; 1GB file storage; no card needed | Set up RLS policies; enable TTL on message tables |
| **MongoDB Atlas M0** | Free tier; 512MB storage; no card needed | Create TTL indexes on `message_blobs.created_at` |
| **Cloudflare R2** | 10GB storage; 1GB/download/day; no card needed | Set up bucket policy; pre-signed URLs for uploads |
| **Biome** | Open source (free) | Lint + format in CI |
| **Vitest** | Open source (free) | Unit test framework |
| **Playwright** | Open source (free) | E2E testing |