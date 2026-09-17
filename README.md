# Backend

REST API for the **Praxes** EdTech platform (**Under Development**). Built with Node.js, Express, TypeScript, PostgreSQL, and Prisma ORM.

> [!NOTE]
> **Current Status:** Active development prototype. The API is functional for local development and testing. External services (Redis caching, AWS S3 image storage) run with local fallbacks when credentials are not configured, and the Paytm API is processed with test credentials provided by Paytm using [Ngrok SDK](https://ngrok.com/) because Paytm servers cannot access local `localhost` instances directly for webhook callbacks.

---

## 🧱 Tech Stack

| Layer      | Technology                    |
| ---------- | ----------------------------- |
| Runtime    | Node.js                       |
| Framework  | Express.js                    |
| Language   | TypeScript                    |
| ORM        | Prisma                        |
| Database   | PostgreSQL (JSONB)            |
| Cache      | Redis (ioredis)               |
| Auth       | JWT (HttpOnly Cookies)        |
| Storage    | AWS S3                        |
| Payments   | Paytm (paytmchecksum SDK)     |
| Security   | bcrypt, helmet, rate-limiting |
| Logging    | Winston + Morgan              |
| Tunneling  | ngrok (for local payment testing) |
| Package Manager| npm (default), Bun, pnpm, Yarn |

---

## 📁 Project Structure

```
Backend/
├── prisma/
│   ├── migrations/
│   │   ├── 20260320113153_init/                  ← Initial schema migration
│   │   ├── 20260320182117_add_test_type_difficulty/
│   │   ├── 20260628101409_sync_schema/
│   │   ├── 20260804114314_add_plan_id_to_payment/
│   │   └── migration_lock.toml
│   ├── schema.prisma          ← All DB models (User, Question, Test, Subscription, Payment)
│   └── seed.ts                ← Seeds admin/employee/student accounts + sample data
│
├── src/
│   ├── config/
│   │   ├── prisma.ts          ← Prisma client singleton
│   │   ├── redis.ts           ← Redis client singleton (ioredis)
│   │   ├── logger.ts          ← Winston logger setup
│   │   ├── s3.ts              ← AWS S3 client + upload helpers
│   │   └── paytm.ts           ← Paytm initiation, verification, and test-mode logic
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts              ← Login, register, logout, profile
│   │   ├── admin.controller.ts             ← Metrics, user management, employee CRUD
│   │   ├── question.controller.ts          ← Question CRUD + search + review workflow
│   │   ├── test.controller.ts              ← Start test, submit, results
│   │   ├── testGroup.controller.ts         ← Group tests by topic/subject
│   │   ├── curriculum.controller.ts        ← Classes, subjects, chapters, topics
│   │   └── subscriptionPlan.controller.ts  ← Plan CRUD + student subscription
│   │
│   ├── middleware/
│   │   ├── auth.ts            ← protect() guard + restrictTo(role) enforcer
│   │   ├── errorHandler.ts    ← Global error handler (catches all async errors)
│   │   └── validators.ts      ← express-validator chains for all inputs
│   │
│   ├── routes/
│   │   ├── auth.routes.ts            ← /api/auth/*
│   │   ├── admin.routes.ts           ← /api/admin/* (admin-only)
│   │   ├── question.routes.ts        ← /api/questions/*
│   │   ├── test.routes.ts            ← /api/tests/*
│   │   ├── testGroup.routes.ts       ← /api/test-groups/*
│   │   ├── curriculum.routes.ts      ← /api/curriculum/*
│   │   ├── subscription.routes.ts    ← /api/subscriptions/*
│   │   ├── payment.routes.ts         ← /api/payments/* (Paytm initiation + callback)
│   │   └── upload.routes.ts          ← /api/upload/* (S3 image uploads)
│   │
│   ├── services/
│   │   ├── auth.service.ts               ← Password hashing, JWT, user lookups
│   │   ├── admin.service.ts              ← Platform metrics, employee management
│   │   ├── question.service.ts           ← Question CRUD, search, review pipeline
│   │   ├── test.service.ts               ← Exam engine (shuffle, snapshot, evaluate)
│   │   ├── testGroup.service.ts          ← Grouping questions into test sets
│   │   ├── curriculum.service.ts         ← Curriculum tree (class → subject → chapter → topic)
│   │   ├── subscription.service.ts       ← Student subscription management
│   │   └── subscriptionPlan.service.ts   ← Plan CRUD + activation logic
│   │
│   ├── types/
│   │   └── index.ts           ← All shared TypeScript interfaces (AuthPayload, QuestionContent, etc.)
│   │
│   ├── utils/
│   │   ├── AppError.ts        ← Custom error class with status codes
│   │   ├── jwt.ts             ← sign / verify / cookie attachment helpers
│   │   ├── cache.ts           ← Redis cache get/set/invalidate wrappers
│   │   └── shuffleOptions.ts  ← Fisher-Yates shuffle + correct_option recalculation
│   │
│   ├── app.ts                 ← Express app setup (middleware, routes, error handler)
│   └── server.ts              ← Entry point + graceful shutdown (SIGINT/SIGTERM)
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚡ Quick Start

### 1. Configure Environment

```bash
git clone <repo>
cd Backend
cp .env.example .env
# Edit .env with your database URL, Redis port, and service credentials
```

---

### 2. Quick Command Reference

| Action | npm (Default) | Bun | pnpm | Yarn |
| :--- | :--- | :--- | :--- | :--- |
| **Install Dependencies** | `npm install` | `bun install` | `pnpm install` | `yarn install` |
| **Start Dev Server** | `npm run dev` | `bun run dev` | `pnpm dev` | `yarn dev` |
| **Run Migrations** | `npx prisma migrate dev` | `bunx prisma migrate dev` | `pnpm dlx prisma migrate dev` | `yarn prisma migrate dev` |
| **Generate Prisma** | `npx prisma generate` | `bunx prisma generate` | `pnpm dlx prisma generate` | `yarn prisma generate` |
| **Seed Database** | `npx ts-node prisma/seed.ts` | `bun prisma/seed.ts` | `pnpm dlx ts-node prisma/seed.ts` | `yarn ts-node prisma/seed.ts` |
| **Prisma Studio GUI** | `npx prisma studio` | `bunx prisma studio` | `pnpm dlx prisma studio` | `yarn prisma studio` |
| **Build for Production** | `npm run build` | `bun run build` | `pnpm build` | `yarn build` |
| **Run Production Server**| `npm start` | `bun run start` | `pnpm start` | `yarn start` |
| **Run Linter** | `npm run lint` | `bun run lint` | `pnpm run lint` | `yarn lint` |

---

### 3. Setup by Package Manager

Make sure PostgreSQL is running locally (or via Docker), then choose your preferred package manager:

#### Option A — npm (Default)

```bash
# 1. Install dependencies
npm install

# 2. Run database migrations
npx prisma migrate dev

# 3. Generate Prisma client
npx prisma generate

# 4. Seed initial accounts + sample data
npx ts-node prisma/seed.ts

# 5. Start development server
npm run dev
```

#### Option B — Bun

```bash
# 1. Install dependencies
bun install

# 2. Run database migrations
bunx prisma migrate dev

# 3. Generate Prisma client
bunx prisma generate

# 4. Seed initial accounts + sample data
bun prisma/seed.ts

# 5. Start development server
bun run dev
```

#### Option C — pnpm

```bash
# 1. Install dependencies
pnpm install

# 2. Run database migrations
pnpm dlx prisma migrate dev

# 3. Generate Prisma client
pnpm dlx prisma generate

# 4. Seed initial accounts + sample data
pnpm dlx ts-node prisma/seed.ts

# 5. Start development server
pnpm dev
```

#### Option D — Yarn

```bash
# 1. Install dependencies
yarn install

# 2. Run database migrations
yarn prisma migrate dev

# 3. Generate Prisma client
yarn prisma generate

# 4. Seed initial accounts + sample data
yarn ts-node prisma/seed.ts

# 5. Start development server
yarn dev
```

The server starts on `http://localhost:5000` with hot-reload enabled.

---

### 4. Set Up Redis

The backend uses Redis for caching. You need a running Redis instance on `localhost:6379`.

**Option A — WSL (Windows users)**

```bash
# Inside your WSL terminal:
sudo apt update && sudo apt install redis-server -y
sudo service redis-server start

# Verify it's running:
redis-cli ping
# Should print: PONG
```

**Option B — Docker**

```bash
docker run -d --name edtech-redis -p 6379:6379 redis:alpine
```

**Option C — Native macOS (Homebrew)**

```bash
brew install redis
brew services start redis
```

**Option D — Windows (Memurai)**

Download [Memurai](https://www.memurai.com/) — a Redis-compatible server for Windows. Install it and it runs as a Windows service automatically on port `6379`.

> **Note:** The backend will still start without Redis, but caching features (curriculum tree, question counts) won't work and you'll see a connection warning in the logs.

---

### 5. Prisma Studio (Database GUI)

```bash
# npm
npx prisma studio

# Bun
bunx prisma studio

# pnpm
pnpm dlx prisma studio

# Yarn
yarn prisma studio
```

Opens a web-based GUI at `http://localhost:5555` to browse and edit your database tables. If not started then use `npx prisma studio --url "<database_url>"` to start it.

---

### 6. Build for Production

```bash
# npm
npm run build
npm start

# Bun
bun run build
bun run start

# pnpm
pnpm build
pnpm start

# Yarn
yarn build
yarn start
```

---

## 🔐 Authentication

All protected routes require a valid JWT. The token is issued as an **HttpOnly cookie** on login and is automatically sent with subsequent requests.

| Method | Endpoint             | Access | Description               |
| ------ | -------------------- | ------ | ------------------------- |
| POST   | `/api/auth/register` | Public | Register a new user       |
| POST   | `/api/auth/login`    | Public | Login with email or phone |
| POST   | `/api/auth/logout`   | Auth   | Clear JWT cookie          |
| GET    | `/api/auth/me`       | Auth   | Get current user profile  |

---

## 📚 Question APIs

| Method | Endpoint             | Access         | Description                 |
| ------ | -------------------- | -------------- | --------------------------- |
| GET    | `/api/questions`     | Auth           | List questions (filterable) |
| POST   | `/api/questions`     | Employee/Admin | Create a new question       |
| GET    | `/api/questions/:id` | Auth           | Get single question         |
| PATCH  | `/api/questions/:id` | Employee/Admin | Update question             |
| DELETE | `/api/questions/:id` | Admin          | Soft-delete question        |

### Query Parameters for GET /api/questions

```
?class_level=10&subject=Mathematics&chapter=Algebra&difficulty=MEDIUM&page=1&limit=20
```

### Question Content Structure (LaTeX supported)

```json
{
  "class_level": 10,
  "subject": "Mathematics",
  "chapter": "Algebra",
  "topic": "Quadratic Equations",
  "difficulty": "MEDIUM",
  "correct_option": 2,
  "content": {
    "question": { "text": "Solve: $x^2 = 4$", "image": null },
    "options": [
      { "text": "$2$", "image": null },
      { "text": "$-2$", "image": null },
      { "text": "$\\pm 2$", "image": null },
      { "text": "$0$", "image": null }
    ],
    "explanation": { "text": "Solution: $x = \\pm 2$", "image": null }
  }
}
```

> **LaTeX Note:** Store LaTeX as plain text strings. The backend does NOT process LaTeX — rendering is handled by MathJax on the frontend.

---

## 📝 Test (Exam Engine) APIs

| Method | Endpoint            | Access  | Description                 |
| ------ | ------------------- | ------- | --------------------------- |
| POST   | `/api/tests/start`  | Student | Start a new test            |
| POST   | `/api/tests/submit` | Student | Submit answers              |
| GET    | `/api/tests/my`     | Student | Get test history            |
| GET    | `/api/tests/:id`    | Student | Get test result + breakdown |

### Start Test

```json
POST /api/tests/start
{
  "class_level": 10,
  "subject": "Mathematics",
  "chapter": "Algebra",
  "question_count": 20
}
```

**Response** (correct_option is NEVER included):

```json
{
  "status": "success",
  "data": {
    "test_id": 1,
    "total_questions": 20,
    "questions": [
      {
        "question_id": 12,
        "question": { "text": "Solve: $x^2 = 4$", "image": null },
        "options": [
          { "text": "$0$", "image": null },
          { "text": "$2$", "image": null },
          { "text": "$\\pm 2$", "image": null },
          { "text": "$-2$", "image": null }
        ]
      }
    ]
  }
}
```

### Submit Test

```json
POST /api/tests/submit
{
  "test_id": 1,
  "answers": [
    { "question_id": 12, "selected_option": 2 },
    { "question_id": 15, "selected_option": 0 }
  ]
}
```

### Get Result

After submission, `GET /api/tests/:id` returns full breakdown with correct answers and explanations.

---

## 🧠 Exam Engine — How It Works

```
1. START TEST
   ├── Fetch N random questions via ORDER BY RANDOM()
   ├── For each question:
   │   ├── Tag each option with originalIndex
   │   ├── Fisher-Yates shuffle the options
   │   └── Recalculate correct_option after shuffle
   ├── Store snapshot in DB (with shuffled state + correct_option)
   └── Return questions to frontend WITHOUT correct_option

2. SUBMIT TEST
   ├── Load snapshot from DB
   ├── Map student answers by question_id
   ├── Compare selected_option vs stored correct_option
   └── Calculate: score, correct, incorrect, unattempted, accuracy

3. GET RESULT
   └── Return full breakdown:
       ├── Question text + shuffled options
       ├── Student's selected_option
       ├── Correct answer index
       └── Explanation (with LaTeX + optional image URL)
```

**Key guarantees:**

- ✅ No repeated questions within a test
- ✅ Options shuffled exactly once per test (consistent on refresh)
- ✅ Correct answer never exposed before submission
- ✅ Evaluation is deterministic — always uses the stored snapshot

---

## 🛡️ Admin APIs

| Method | Endpoint                                 | Access | Description                     |
| ------ | ---------------------------------------- | ------ | ------------------------------- |
| GET    | `/api/admin/metrics`                     | Admin  | Platform-wide stats             |
| GET    | `/api/admin/employee-metrics`            | Admin  | Employee performance metrics    |
| GET    | `/api/admin/users`                       | Admin  | List all users                  |
| POST   | `/api/admin/employees`                   | Admin  | Create an employee account      |
| PATCH  | `/api/admin/employees/:id`               | Admin  | Update employee details         |
| DELETE | `/api/admin/employees/:id`               | Admin  | Delete an employee              |
| PATCH  | `/api/admin/users/:id/toggle`            | Admin  | Activate / deactivate a user    |
| POST   | `/api/admin/subscription-plans`          | Admin  | Create a subscription plan      |
| PATCH  | `/api/admin/subscription-plans/:id`      | Admin  | Update a plan (price, name)     |
| DELETE | `/api/admin/subscription-plans/:id`      | Admin  | Delete a plan                   |
| GET    | `/api/admin/subscription-plans`          | Admin  | List all plans                  |

---

## 💳 Payment APIs

| Method | Endpoint                    | Access  | Description                                |
| ------ | --------------------------- | ------- | ------------------------------------------ |
| POST   | `/api/payments/initiate`    | Student | Create a Paytm transaction + redirect URL  |
| POST   | `/api/payments/callback`    | Public  | Paytm webhook (verifies checksum, activates subscription) |
| GET    | `/api/payments/status/:id`  | Student | Check payment status by order ID           |

> **Local Testing:** To test payments locally, you'll need to expose your `localhost:5000` via [ngrok](https://ngrok.com/) so Paytm's servers can reach the callback URL.

---

## 👥 User Roles

| Role       | Capabilities                                                    |
| ---------- | --------------------------------------------------------------- |
| `STUDENT`  | Start tests, submit tests, view own results and history         |
| `EMPLOYEE` | Create and update questions                                     |
| `ADMIN`    | All of the above + manage users, view metrics, delete questions |

---

## 🖼️ Image Handling

Images are **not stored** in the database. They're uploaded to AWS S3 and only the URL is saved in the JSONB `content` field.

```json
{ "text": "See diagram", "image": "https://bucket.s3.amazonaws.com/q12-diagram.png" }
```

| Method | Endpoint                   | Description                       |
| ------ | -------------------------- | --------------------------------- |
| POST   | `/api/upload/image`        | Upload a question/option image    |
| POST   | `/api/upload/profile-image`| Upload a user profile picture     |

---

## ⚙️ Environment Variables

| Variable                | Required | Description                         | Example                                |
| ----------------------- | -------- | ----------------------------------- | -------------------------------------- |
| `PORT`                  | Yes      | Server port                         | `5000`                                 |
| `NODE_ENV`              | Yes      | Environment                         | `development`                          |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string        | `postgresql://user:pass@localhost:5432/my_db` |
| `JWT_SECRET`            | Yes      | Secret key for signing JWTs         | `super_secret_key`                     |
| `JWT_EXPIRES_IN`        | Yes      | Token expiry                        | `7d`                                   |
| `JWT_COOKIE_EXPIRES_IN` | Yes      | Cookie expiry (days)                | `7`                                    |
| `ALLOWED_ORIGIN`        | Yes      | CORS origin                         | `http://localhost:3000`                |
| `REDIS_URL`             | Yes      | Redis connection URL                | `redis://localhost:6379`               |
| `AWS_REGION`            | No       | AWS region for S3                   | `ap-south-1`                           |
| `AWS_ACCESS_KEY_ID`     | No       | AWS access key                      | `AKIA...`                              |
| `AWS_SECRET_ACCESS_KEY` | No       | AWS secret key                      | `wJalr...`                             |
| `AWS_S3_BUCKET`         | No       | S3 bucket name                      | `my-bucket`                       |
| `PAYTM_MERCHANT_ID`     | No       | Paytm merchant ID                   | `your_mid`                             |
| `PAYTM_MERCHANT_KEY`    | No       | Paytm merchant key                  | `your_key`                             |
| `PAYTM_WEBSITE`         | No       | Paytm website identifier            | `WEBSTAGING`                           |
| `PAYTM_CALLBACK_URL`    | No       | Paytm callback endpoint             | `http://localhost:5000/api/payments/callback` |
| `NGROK_AUTHTOKEN`       | No       | ngrok auth token (for payment testing) | `your_token`                        |

---

## 🔒 Security Features

- `helmet` — sets secure HTTP headers
- `bcrypt` (cost factor 12) — password hashing
- JWT in **HttpOnly** cookies — XSS-safe auth
- `cors` — restricted to known origins
- Rate limiting — 200 req/15min globally; 20 req/15min on auth routes
- Input validation — `express-validator` on all inputs
- Role-based access control on every route
- Correct answers **never** sent to the frontend during an active test
- Soft-deletes for questions (preserves historical test data)

---

## 🌱 Seed Credentials

After running `npx ts-node prisma/seed.ts`:

| Role     | Email              | Password    |
| -------- | ------------------ | ----------- |
| Admin    | admin@praxes.in    | Admin@123   |
| Employee | employee@praxes.in | Emp@123     |
| Student  | student@praxes.in  | Student@123 |
