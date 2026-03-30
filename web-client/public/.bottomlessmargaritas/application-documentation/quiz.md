# AI Content Pipeline — Quiz Questions

Each question has four options. Only one is correct (marked with **bold**).

---

**1. What is the primary AI pattern demonstrated by this application?**

- A) Retrieval-augmented generation (RAG)
- B) Streaming server-sent events (SSE)
- **C) Tool calling (function calling)**
- D) Multi-turn agentic loop

? Tool calling is a technique where the LLM is given tool definitions and returns structured tool_use blocks instead of plain text responses.

> This application uses Claude's tool calling API to produce structured summaries. The model receives a `summarize` tool definition and returns a `tool_use` content block with a summary and key points array. This is single-pass tool calling, not a multi-turn agentic loop.

---

**2. How many services run independently in the system architecture?**

- A) Two (API and frontend)
- **B) Three (API server, worker, frontend)**
- C) Four (API server, worker, frontend, queue service)
- D) Five (API, worker, frontend, Redis, PostgreSQL)

? Consider which components are deployed as separate application processes, not managed infrastructure services.

> The three independently deployed services are the Express API server, the BullMQ worker, and the Next.js frontend. Redis and PostgreSQL are managed infrastructure, not application services.

---

**3. What queue technology connects the API server to the worker?**

- A) RabbitMQ
- **B) BullMQ backed by Redis**
- C) Amazon SQS
- D) PostgreSQL LISTEN/NOTIFY

? The queue needs to support job retry, rate limiting, and concurrency control built-in.

> BullMQ is a Redis-based queue for Node.js that provides built-in retry with exponential backoff, rate limiting, concurrency control, and job lifecycle events. The queue is named `content-process`.

---

**4. What is the maximum number of items allowed per batch?**

- A) 10
- B) 25
- **C) 50**
- D) 100

? The Zod validation schema enforces both minimum and maximum item counts on the `items` array.

> The `createBatchSchema` uses `.max(50, 'Maximum 50 items per batch')` on the items array, enforcing a hard limit of 50 items per batch submission.

---

**5. What model does the worker use for content analysis?**

- A) claude-3-opus-20240229
- B) claude-3-haiku-20240307
- **C) claude-sonnet-4-20250514**
- D) gpt-4-turbo

? The model is specified in the `anthropic.messages.create()` call inside the content processor.

> The worker's content processor calls `anthropic.messages.create()` with `model: 'claude-sonnet-4-20250514'`, using Claude Sonnet 4 for a balance of quality and speed.

---

**6. How does the worker handle URL content extraction?**

- A) Sends the raw URL to Claude and lets the model fetch it
- B) Uses a headless browser to render the page
- **C) Uses @extractus/article-extractor with a raw fetch fallback**
- D) Scrapes the page with Puppeteer and extracts text

? The worker has a two-tier extraction strategy for handling different types of web pages.

> The worker first tries `@extractus/article-extractor` to parse clean article text. If that fails, it falls back to a raw HTTP fetch that strips `<script>`, `<style>`, and all HTML tags. Both paths truncate the result to 8,000 characters.

---

**7. What is the maximum character length for content sent to Claude?**

- A) 2,000 characters
- B) 4,000 characters
- **C) 8,000 characters**
- D) 16,000 characters

? Both URL-extracted content and raw text input are truncated to the same limit before being sent to the LLM.

> All content is truncated to 8,000 characters before being sent to Claude. This applies to both URL-extracted text (in the content fetcher service) and raw text input (in the content processor).

---

**8. What authentication method does the application use?**

- A) JWT tokens in Authorization header
- B) Supabase Auth with @supabase/ssr
- **C) Cookie-based sessions with bcrypt password hashing**
- D) OAuth 2.0 with Google Sign-In

? The server generates a random token, hashes it, stores the hash in the database, and sends the raw token as a cookie.

> The application uses server-side cookie sessions. A 32-byte random token is generated at login, its SHA256 hash is stored in the `sessions` table, and the raw token is sent as an httpOnly `sid` cookie. Passwords are hashed with bcrypt.

---

**9. How many times will a failed job be retried before being marked as permanently failed?**

- A) 1 time
- B) 2 times
- **C) 3 times (including the original attempt)**
- D) 5 times

? The BullMQ queue is configured with an `attempts` option in `defaultJobOptions`.

> The queue configuration sets `attempts: 3` in `defaultJobOptions`, meaning a job will be tried up to 3 times total. Retries use exponential backoff starting at 5 seconds.

---

**10. What type of backoff strategy is used for job retries?**

- A) Linear backoff with 10-second intervals
- **B) Exponential backoff starting at 5 seconds**
- C) Fixed 30-second delay between retries
- D) No backoff, immediate retry

? The backoff configuration is set in the BullMQ queue's `defaultJobOptions.backoff` property.

> The queue uses `backoff: { type: 'exponential', delay: 5000 }`, meaning the first retry waits 5 seconds, the second waits 10 seconds, and so on, doubling each time.

---

**11. What is the worker's concurrency limit?**

- **A) 3 simultaneous jobs**
- B) 5 simultaneous jobs
- C) 10 simultaneous jobs
- D) 1 job at a time

? Concurrency is configured in the BullMQ Worker constructor options.

> The worker is instantiated with `concurrency: 3`, allowing up to 3 jobs to be processed simultaneously. This is paired with a rate limiter of 10 jobs per minute.

---

**12. What rate limit does the worker enforce on job processing?**

- A) 5 jobs per minute
- **B) 10 jobs per minute**
- C) 20 jobs per minute
- D) 60 jobs per minute

? The limiter is configured alongside concurrency in the Worker constructor.

> The worker sets `limiter: { max: 10, duration: 60_000 }`, limiting throughput to 10 jobs per 60 seconds. This prevents overwhelming the Claude API with too many concurrent requests.

---

**13. What is the name of the BullMQ queue used in this application?**

- A) batch-processor
- B) ai-summarize
- **C) content-process**
- D) item-queue

? The queue name is defined in both the API server's queue configuration and the worker's constructor.

> Both the API server (`new Queue('content-process', ...)`) and the worker (`new Worker('content-process', ...)`) use the queue name `content-process`.

---

**14. What tool name does the Claude API call to generate summaries?**

- A) analyze
- B) extract
- **C) summarize**
- D) process_content

? The tool is defined in `tool-definitions.ts` with a specific name and input schema.

> The single tool definition uses the name `summarize`. It accepts a `summary` string and a `key_points` string array, both required fields in the input schema.

---

**15. What two fields does the `summarize` tool return?**

- A) title and body
- B) abstract and keywords
- **C) summary and key_points**
- D) content and tags

? The tool's input_schema defines the required properties that Claude must populate.

> The `summarize` tool schema requires `summary` (a 2-4 sentence string) and `key_points` (an array of 3-5 string takeaways). These are extracted from the `tool_use` content block in Claude's response.

---

**16. What happens if Claude does not return a summary tool call?**

- A) The item is marked as complete with empty results
- B) The worker retries with a different prompt
- **C) An error is thrown: "LLM did not return a summary tool call"**
- D) The worker falls back to extracting text from the response

? After processing Claude's response, the worker checks whether a summary was extracted from the tool_use blocks.

> If `summary` is still null after iterating through all content blocks, the processor throws `new Error('LLM did not return a summary tool call')`, which causes the job to fail and potentially retry.

---

**17. What database is used for persistent storage?**

- A) MySQL on AWS RDS
- B) MongoDB Atlas
- **C) PostgreSQL on Neon**
- D) SQLite

? The database is a serverless PostgreSQL service commonly used in modern full-stack applications.

> The application uses PostgreSQL hosted on Neon, a serverless Postgres platform. Migrations are managed with `node-pg-migrate`.

---

**18. How many database tables does the schema define?**

- A) 2 (users, batches)
- B) 3 (users, batches, batch_items)
- **C) 4 (users, sessions, batches, batch_items)**
- D) 5 (users, sessions, batches, batch_items, webhooks)

? The migration files each create one table and are numbered sequentially.

> Four migration files create four tables: `users`, `sessions`, `batches`, and `batch_items`. Sessions store authentication state, while batches and batch_items store the processing pipeline data.

---

**19. What data type is used for the `tags` column in `batch_items`?**

- A) JSONB array
- B) VARCHAR(255)
- **C) TEXT[] (PostgreSQL array)**
- D) Comma-separated TEXT

? PostgreSQL supports native array types that can store multiple values in a single column.

> The `tags` column uses `TEXT[]`, a native PostgreSQL array type. The worker stores Claude's `key_points` array directly into this column.

---

**20. What data type is used for `classification` and `entities` in `batch_items`?**

- A) TEXT with JSON serialization
- **B) JSONB**
- C) VARCHAR(1000)
- D) TEXT[]

? These columns need to store flexible, evolving structures without requiring migration changes.

> Both `classification` and `entities` use JSONB, which allows flexible schema storage. This means the AI output structure can evolve without database migrations.

---

**21. How does the session table store the authentication token?**

- A) The raw token is stored directly as the primary key
- **B) A SHA256 hash of the raw token is stored as the primary key**
- C) The token is encrypted with AES-256 and stored in a `token` column
- D) A UUID primary key is used alongside a separate `token_hash` column

? Storing a hash instead of the raw token means a database breach does not expose usable session tokens.

> The session `id` column stores the SHA256 hash of the raw token. The raw token is sent to the client as a cookie. On each request, the middleware hashes the cookie value to look up the session, so the raw token never exists in the database.

---

**22. What is the session TTL (time-to-live)?**

- A) 1 hour
- B) 24 hours
- **C) 7 days**
- D) 30 days

? The session expiration is set when creating the session record and matches the cookie Max-Age.

> Sessions have a 7-day TTL stored in the `expires_at` column. The `sid` cookie Max-Age is also set to 7 days to match.

---

**23. What is the general rate limit for the API?**

- A) 50 requests per 5 minutes per IP
- **B) 100 requests per 15 minutes per IP**
- C) 200 requests per hour per IP
- D) 1000 requests per day per IP

? The rate limiter is configured with `windowMs` and `max` options from `express-rate-limit`.

> The global rate limiter uses `windowMs: 15 * 60 * 1000` (15 minutes) and `max: 100`, allowing 100 requests per 15-minute window per IP address.

---

**24. What is the stricter rate limit applied to authentication routes?**

- A) 5 requests per 15 minutes
- **B) 10 requests per 15 minutes**
- C) 20 requests per 15 minutes
- D) 50 requests per 15 minutes

? Auth routes have a dedicated rate limiter to resist credential stuffing attacks.

> The `authRateLimiter` allows only 10 requests per 15-minute window. This stricter limit is applied specifically to `/auth/register` and `/auth/login` to protect against brute force and credential stuffing.

---

**25. What CSRF protection strategy does the application use?**

- A) Synchronizer token pattern
- **B) Double-submit cookie pattern (csrf-csrf library)**
- C) Custom header check (X-Requested-With)
- D) No CSRF protection

? The application uses the `csrf-csrf` npm package, which implements a specific CSRF mitigation technique.

> The application uses the `doubleCsrf` function from the `csrf-csrf` library, implementing the double-submit cookie pattern. A `__csrf` httpOnly cookie is set, and the token must be included in requests for state-changing operations.

---

**26. In what order does the Express middleware stack execute?**

- A) CORS, helmet, JSON parser, cookie parser, auth, CSRF
- **B) helmet, CORS, request logger, rate limiter, JSON parser, URL parser, cookie parser, CSRF guard, load session**
- C) rate limiter, helmet, CORS, JSON parser, auth, CSRF
- D) JSON parser, cookie parser, CORS, helmet, auth, CSRF

? The middleware is registered with `app.use()` calls in `app.ts`, and the order of registration determines execution order.

> The middleware chain in `app.ts` follows this exact order: helmet (security headers), CORS, request logger (pino-http), rate limiter, express.json, express.urlencoded, cookie parser, CSRF guard, load session. Routes are mounted after all middleware.

---

**27. What happens when the API server cannot connect to Redis?**

- A) The server crashes on startup
- B) An error is thrown and the process exits
- **C) Batch creation succeeds but items are not enqueued for processing**
- D) The server falls back to in-process job handling

? The `getContentProcessQueue()` function returns `null` if `REDIS_URL` is not set, and the batch handler checks for this.

> If Redis is unavailable, `getContentProcessQueue()` returns `null`. The batch handler checks this and logs a warning but still creates the batch in PostgreSQL. Items simply won't be processed until the queue is available.

---

**28. What validation library is used for API request validation?**

- A) Joi
- B) Yup
- **C) Zod**
- D) class-validator

? The validation schemas are defined in `server/src/schemas/` and use a specific TypeScript-first validation library.

> Zod is used for all request validation. The `createBatchSchema` validates batch submissions, and the library also provides type inference through `z.infer<>` for end-to-end type safety.

---

**29. What frontend state management solution is used for server data?**

- A) Redux Toolkit
- B) Zustand
- **C) TanStack React Query**
- D) SWR

? The frontend needs to handle polling, caching, and automatic refetching of server state.

> TanStack React Query manages all server state including batches, items, and auth status. It provides the 3-second polling interval via `refetchInterval` while batches are processing.

---

**30. How often does the frontend poll for batch updates?**

- A) Every 1 second
- **B) Every 3 seconds**
- C) Every 5 seconds
- D) Every 10 seconds

? The polling interval is configured in the React Query options for batch-related queries.

> The frontend uses a 3-second refetch interval while batches are in a processing state. This provides near-real-time updates without excessive API load.

---

**31. What HTTP status code does the API return when a batch is created successfully?**

- A) 200 OK
- **B) 201 Created**
- C) 202 Accepted
- D) 204 No Content

? The batch creation handler sets a specific status code when responding with the new batch and items.

> The `createBatch` handler responds with `res.status(201).json({ data: { batch, items } })`, using 201 Created to indicate a new resource was successfully created.

---

**32. What logging library does the application use?**

- A) Winston
- B) Bunyan
- **C) pino (with pino-http for request logging)**
- D) console.log with custom wrapper

? The logging library is imported from `app/utils/logs/logger.js` and produces structured JSON output.

> The application uses pino for structured JSON logging and pino-http as Express middleware for automatic request/response logging. Both the API server and worker use the same logging setup.

---

**33. What is the request timeout configured on the Express server?**

- A) 10 seconds
- B) 15 seconds
- **C) 30 seconds**
- D) 60 seconds

? A custom middleware in `app.ts` sets both request and response timeouts to the same value.

> The server sets `REQUEST_TIMEOUT_MS = 30_000` (30 seconds) and applies it to both `req.setTimeout()` and `res.setTimeout()`. If a response takes longer, a 408 Request Timeout is returned.

---

**34. What HTTP status code is returned when a request times out?**

- A) 504 Gateway Timeout
- **B) 408 Request Timeout**
- C) 503 Service Unavailable
- D) 429 Too Many Requests

? The timeout middleware in `app.ts` sends a specific status code with an error response body.

> The response timeout handler returns `res.status(408).json({ error: 'REQUEST_TIMEOUT', message: 'Request timeout' })` when a request exceeds 30 seconds.

---

**35. What is the JSON body size limit on the Express server?**

- A) 1kb
- B) 5kb
- **C) 10kb**
- D) 100kb

? The limit is configured in the `express.json()` middleware options.

> Both `express.json()` and `express.urlencoded()` are configured with `limit: '10kb'`, preventing excessively large request bodies from consuming server memory.

---

**36. What are the possible statuses for a batch?**

- A) new, active, done, error
- **B) pending, processing, complete, failed**
- C) queued, running, finished, errored
- D) created, in_progress, succeeded, failed

? The batch status enum is defined in the Zod schema and stored as VARCHAR(50) in the database.

> The `batchStatusEnum` Zod schema defines four statuses: `pending`, `processing`, `complete`, and `failed`. Batches start as `pending` and transition to `processing` when the first item starts, then to `complete` or `failed` when all items finish.

---

**37. What are the possible statuses for a batch item?**

- A) pending, processing, complete, failed
- **B) queued, processing, complete, failed**
- C) new, active, done, error
- D) waiting, running, success, failure

? Item statuses differ slightly from batch statuses in their initial state name.

> The `itemStatusEnum` defines: `queued`, `processing`, `complete`, and `failed`. Items start as `queued` (not `pending` like batches), transition to `processing` when the worker picks them up, then to `complete` or `failed`.

---

**38. How does the worker determine when a batch is complete?**

- A) It checks a Redis counter
- B) It queries a batch_progress materialized view
- **C) It counts remaining queued/processing items via SQL subqueries**
- D) The API server polls and updates batch status

? After each item completes, the worker runs an UPDATE query on the batches table with subqueries.

> After processing each item, the worker runs a SQL UPDATE that uses subqueries to count items still in `queued` or `processing` status. If none remain and at least one item exists, the batch transitions to `complete` (or `failed` if all items failed).

---

**39. What migration tool manages the database schema?**

- A) Prisma Migrate
- B) Drizzle Kit
- **C) node-pg-migrate**
- D) Knex migrations

? The migration tool is listed as a dependency in the server's package.json and has scripts for `migrate:up` and `migrate:down`.

> The application uses `node-pg-migrate` for database migrations. Migration files are JavaScript files in `server/migrations/` and are run via `pnpm migrate:up` and `pnpm migrate:down`.

---

**40. What happens when content extracted from a URL is fewer than 10 characters?**

- A) The item is skipped and marked as complete with no summary
- B) The raw URL is sent to Claude instead
- **C) An error is thrown: "Content too short to process"**
- D) The worker pads the content to minimum length

? The content processor has a length check after fetching content and before calling Claude.

> After content extraction, the processor checks `if (content.length < 10)` and throws `new Error('Content too short to process')`. This prevents sending trivially small content to the Claude API.

---

**41. What User-Agent string does the fallback URL fetcher use?**

- A) Mozilla/5.0
- **B) ContentPipeline/1.0**
- C) BullMQ-Worker/1.0
- D) No User-Agent header is set

? The fallback fetch in the content fetcher service sets a custom User-Agent header.

> The raw HTTP fallback uses `headers: { 'User-Agent': 'ContentPipeline/1.0' }` to identify itself when fetching URLs that the article extractor could not handle.

---

**42. What is the timeout for the fallback URL fetch?**

- A) 5 seconds
- B) 10 seconds
- **C) 15 seconds**
- D) 30 seconds

? The fetch call uses `AbortSignal.timeout()` to enforce a maximum wait time.

> The fallback fetch uses `signal: AbortSignal.timeout(15_000)` to abort the request after 15 seconds, preventing the worker from hanging on slow or unresponsive URLs.

---

**43. Where is the frontend deployed?**

- A) Railway
- B) Netlify
- **C) Vercel**
- D) AWS Amplify

? The frontend is a Next.js application deployed on a platform that specializes in Next.js hosting.

> The Next.js frontend is deployed on Vercel, which provides optimized hosting for Next.js applications including automatic SSR, edge functions, and build optimization.

---

**44. Where are the API server and worker deployed?**

- A) AWS ECS
- B) Heroku
- **C) Railway**
- D) Google Cloud Run

? Both backend services run on the same platform alongside the Redis instance.

> Both the Express API server and BullMQ worker are deployed on Railway, which also hosts the Redis instance used for the job queue. This keeps all backend services on the same platform with shared networking.

---

**45. What is the `max_tokens` limit set for Claude API calls?**

- A) 256
- B) 512
- **C) 1024**
- D) 4096

? The token limit is configured in the `anthropic.messages.create()` call in the content processor.

> The worker sets `max_tokens: 1024` when calling Claude. Since the response only needs to contain a short summary and a few key points via tool calling, 1024 tokens is sufficient.

---

**46. How does the application handle graceful shutdown of the worker?**

- A) It immediately kills the process
- B) It waits 5 seconds then force-exits
- **C) It closes the BullMQ worker and database pool, then exits**
- D) It drains the queue before shutting down

? The worker listens for SIGTERM and SIGINT signals and runs an async shutdown function.

> On SIGTERM or SIGINT, the worker calls `worker.close()` (which finishes in-progress jobs) and then `pool.end()` (closes database connections) before calling `process.exit(0)`. This ensures clean resource cleanup.

---

**47. What Express version does the API server use?**

- A) Express 4.x
- **B) Express 5.x**
- C) Express 3.x
- D) Fastify (not Express)

? The server's package.json specifies the exact Express version range.

> The server uses `"express": "^5.2.1"`, which is Express 5. Express 5 includes native promise support for async route handlers, eliminating the need for manual try/catch wrappers in many cases.

---

**48. What is the purpose of the `trust proxy` setting on the Express app?**

- A) It enables HTTPS termination
- B) It disables rate limiting behind proxies
- **C) It trusts the first proxy hop, enabling correct client IP and protocol detection**
- D) It allows WebSocket connections through reverse proxies

? The setting `app.set('trust proxy', 1)` is needed when running behind a reverse proxy like Railway's load balancer.

> Setting `trust proxy` to 1 tells Express to trust the first proxy hop. This is necessary when running behind Railway's reverse proxy so that `req.ip` returns the client's real IP address (for rate limiting) and `req.protocol` correctly reports HTTPS.

---

**49. What password hashing algorithm and cost factor are used?**

- A) Argon2 with default settings
- **B) bcrypt with 12 rounds**
- C) scrypt with N=16384
- D) PBKDF2 with 100,000 iterations

? The application uses the `bcrypt` npm package, and the cost factor is noted in the database schema documentation.

> The application uses bcrypt with 12 salt rounds for password hashing. This provides a good balance between security (resistant to brute force) and performance (each hash takes roughly 250ms).

---

**50. What cookie name is used for the session token?**

- A) session
- B) token
- **C) sid**
- D) auth

? The cookie name is imported from a constants file and used in both the auth repository and the loadSession middleware.

> The session cookie is named `sid`, imported from `SESSION_COOKIE_NAME` in `app/constants/session.js`. It is set as an httpOnly cookie with appropriate SameSite and Secure settings based on the environment.
