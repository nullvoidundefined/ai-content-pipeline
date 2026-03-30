# AI Content Pipeline — Technical Summary

## Architecture

The AI Content Pipeline is a three-service architecture that decouples content submission from AI processing. An Express 5 API server handles authentication, batch creation, and data retrieval. A dedicated BullMQ worker service pulls jobs from a Redis queue, fetches content from URLs or accepts raw text, and sends it to the Anthropic Claude API using tool calling to produce structured summaries. A Next.js 15 frontend provides the user interface, polling the API for progress updates as items complete.

The API and worker share a PostgreSQL database on Neon and a Redis instance on Railway, but run as independent processes. This separation means the API stays responsive regardless of how many items are queued for AI processing. The worker controls throughput with a concurrency limit of 3 simultaneous jobs and a rate limiter of 10 jobs per minute, preventing Claude API overload.

The frontend is a standard Next.js App Router application deployed on Vercel. It uses TanStack React Query for server state management with a 3-second polling interval that activates while batches are processing. Authentication flows through httpOnly session cookies, with CSRF protection via double-submit cookie pattern.

## Stack

| Layer              | Technology                            | Purpose                                |
| ------------------ | ------------------------------------- | -------------------------------------- |
| Frontend           | Next.js 15, React 19                  | App Router SSR, client-side UI         |
| State Management   | TanStack React Query                  | Server state, polling, cache           |
| Styling            | SCSS Modules, CSS Custom Properties   | Component-scoped styles                |
| API Server         | Express 5, TypeScript                 | REST API, session auth, job enqueuing  |
| Validation         | Zod                                   | Request validation, type inference     |
| Queue              | BullMQ 5, Redis                       | Job queue with retry and rate limiting |
| Worker             | Node.js, @anthropic-ai/sdk            | Job processing, Claude tool calling    |
| Content Extraction | @extractus/article-extractor          | URL text extraction with fallback      |
| Database           | PostgreSQL (Neon), node-pg-migrate    | Persistent storage, schema migrations  |
| Auth               | Cookie sessions, bcrypt               | Session-based authentication           |
| Security           | helmet, csrf-csrf, express-rate-limit | Headers, CSRF, rate limiting           |
| Logging            | pino, pino-http                       | Structured JSON logging                |

## Key Patterns

### Single-Pass Tool Calling

The worker uses Claude's tool calling API in a single-pass pattern. Content is sent to the model along with a `summarize` tool definition, and Claude returns a `tool_use` content block containing a structured summary and key points array. Unlike multi-turn agentic loops (App 8), this pattern sends one request and extracts the result from the response without further interaction.

### Async Job Queue with BullMQ

The API enqueues jobs onto a `content-process` Redis queue. The worker picks them up with concurrency of 3 and a rate limiter of 10 jobs per 60 seconds. Failed jobs retry up to 3 times with exponential backoff starting at 5 seconds. This decoupling allows the API to return immediately after batch creation while processing happens in the background.

### Content Extraction with Fallback

URL items go through a two-tier extraction pipeline. The primary method uses `@extractus/article-extractor` to parse clean article text. If that fails, the worker falls back to a raw HTTP fetch that strips `<script>`, `<style>`, and all HTML tags. All content is truncated to 8,000 characters before being sent to Claude.

### Cookie Session Authentication

Authentication uses server-side sessions stored in PostgreSQL. A 32-byte random token is generated at login, its SHA256 hash is stored in the `sessions` table, and the raw token is sent as an httpOnly `sid` cookie. The `loadSession` middleware hashes the incoming cookie and looks up the session on every request.

### Batch Status State Machine

Batches transition through `pending` -> `processing` -> `complete` (or `failed`). After each item completes, the worker runs a SQL UPDATE that recalculates `completed_items` and `failed_items` counts. When no items remain in `queued` or `processing` status, the batch transitions to `complete` (or `failed` if all items failed).

## Data Flow

1. **User submits batch** — the frontend POSTs an array of 1-50 items (each URL or text) to `/batches`
2. **API validates input** — Zod schema validates item structure, types, and URL format
3. **Batch and items created** — the API inserts a `batches` row and corresponding `batch_items` rows in PostgreSQL
4. **Jobs enqueued** — each item is added to the `content-process` BullMQ queue in Redis
5. **Worker picks up job** — the BullMQ worker dequeues a job and marks the item as `processing`
6. **Content fetched** — for URL items, the worker extracts article text; for text items, the raw input is used (truncated to 8,000 chars)
7. **Claude processes content** — the worker sends content plus the `summarize` tool definition to Claude's messages API
8. **Tool result extracted** — the worker reads the `tool_use` block from Claude's response, extracting `summary` and `key_points`
9. **Results stored** — the item is updated in PostgreSQL with summary, tags (key points), and `complete` status
10. **Batch counts updated** — a SQL query recalculates completed/failed counts and transitions the batch status when all items finish

## API Endpoints

| Method | Path                 | Purpose                                    |
| ------ | -------------------- | ------------------------------------------ |
| POST   | `/auth/register`     | Create account, return session cookie      |
| POST   | `/auth/login`        | Authenticate, return session cookie        |
| POST   | `/auth/logout`       | Clear session cookie                       |
| GET    | `/auth/me`           | Get current authenticated user             |
| POST   | `/batches`           | Create batch with 1-50 items, enqueue jobs |
| GET    | `/batches`           | List user's batches (paginated)            |
| GET    | `/batches/:id`       | Get single batch by ID                     |
| GET    | `/batches/:id/items` | Get items for a batch (paginated)          |
| GET    | `/health`            | Basic health check                         |
| GET    | `/health/ready`      | Readiness check (verifies DB connection)   |
| GET    | `/api/csrf-token`    | Generate and return CSRF token             |

## Database Schema

### `users`

| Column          | Type        | Notes                          |
| --------------- | ----------- | ------------------------------ |
| `id`            | UUID        | Primary key, gen_random_uuid() |
| `email`         | TEXT        | Unique                         |
| `password_hash` | TEXT        | bcrypt, 12 rounds              |
| `created_at`    | TIMESTAMPTZ | Default NOW()                  |
| `updated_at`    | TIMESTAMPTZ | Auto-updated via trigger       |

### `sessions`

| Column       | Type        | Notes                              |
| ------------ | ----------- | ---------------------------------- |
| `id`         | TEXT        | Primary key (SHA256 hash of token) |
| `user_id`    | UUID        | FK -> users (CASCADE)              |
| `expires_at` | TIMESTAMPTZ | 7-day TTL                          |
| `created_at` | TIMESTAMPTZ | Default NOW()                      |

### `batches`

| Column            | Type        | Notes                                    |
| ----------------- | ----------- | ---------------------------------------- |
| `id`              | UUID        | Primary key                              |
| `user_id`         | UUID        | FK -> users                              |
| `status`          | VARCHAR(50) | pending / processing / complete / failed |
| `total_items`     | INTEGER     | Count of items in batch                  |
| `completed_items` | INTEGER     | Items with status complete               |
| `failed_items`    | INTEGER     | Items with status failed                 |
| `created_at`      | TIMESTAMPTZ | Default NOW()                            |
| `completed_at`    | TIMESTAMPTZ | Nullable, set when all items finish      |
| `updated_at`      | TIMESTAMPTZ | Auto-updated via trigger                 |

### `batch_items`

| Column           | Type        | Notes                                   |
| ---------------- | ----------- | --------------------------------------- |
| `id`             | UUID        | Primary key                             |
| `batch_id`       | UUID        | FK -> batches                           |
| `input_type`     | VARCHAR(10) | url or text                             |
| `input_url`      | TEXT        | Nullable, populated for URL items       |
| `input_text`     | TEXT        | Nullable, populated for text items      |
| `status`         | VARCHAR(50) | queued / processing / complete / failed |
| `classification` | JSONB       | Nullable, flexible schema               |
| `entities`       | JSONB       | Nullable, flexible schema               |
| `tags`           | TEXT[]      | Array of extracted key points           |
| `summary`        | TEXT        | Nullable, AI-generated summary          |
| `error`          | TEXT        | Nullable, error message on failure      |
| `attempts`       | INTEGER     | Processing attempt count (max 3)        |
| `processed_at`   | TIMESTAMPTZ | Nullable, set on completion             |
| `created_at`     | TIMESTAMPTZ | Default NOW()                           |
| `updated_at`     | TIMESTAMPTZ | Auto-updated via trigger                |

## Environment Variables

| Variable              | Service        | Required   | Description                          |
| --------------------- | -------------- | ---------- | ------------------------------------ |
| `DATABASE_URL`        | Server, Worker | Yes        | Neon PostgreSQL connection string    |
| `REDIS_URL`           | Server, Worker | Yes        | Railway Redis connection string      |
| `ANTHROPIC_API_KEY`   | Worker         | Yes        | Claude API key for tool calling      |
| `CORS_ORIGIN`         | Server         | Production | Allowed frontend origin              |
| `CSRF_SECRET`         | Server         | Yes        | Secret for double-submit CSRF tokens |
| `NODE_ENV`            | Server, Worker | No         | production or development            |
| `PORT`                | Server         | No         | Server port (default 3001)           |
| `NEXT_PUBLIC_API_URL` | Frontend       | Yes        | API server base URL                  |

## Decisions

- **Single-pass tool calling over multi-turn agentic loop** — Summarization is a single-step task. A multi-turn loop would add latency and complexity without benefit. The agentic pattern is deferred to App 8 where it is needed.
- **BullMQ + Redis over in-process queuing** — Decoupling the API from processing enables independent scaling, built-in retry with exponential backoff, and rate limiting. The worker can be scaled horizontally by deploying additional instances.
- **Cookie sessions over JWT** — Server-side sessions make revocation trivial (delete the row). No token refresh complexity, no client-side token storage concerns. The tradeoff is a database lookup per request, which is acceptable at this scale.
- **Polling over WebSockets** — A 3-second polling interval provides acceptable latency for batch processing that takes seconds to minutes. No persistent connection overhead, simpler deployment, and easier debugging compared to WebSocket infrastructure.
- **JSONB columns for classification and entities** — These fields use flexible JSONB storage so the schema can evolve as AI output structures change, without requiring database migrations.
