# AI Lead Assistant

Qualify inbound leads over a WhatsApp-style webhook, score them, and book meetings — with OpenAI tool calling or a deterministic mock that runs without an API key.

Portfolio project by [Izhak Isacov](https://github.com/izhak655). It is a small CRM assistant for lead qualification, messaging, and scheduling. It is not a client deliverable.

![Pipeline overview](docs/screenshots/overview.png)

## Screenshots

| Pipeline | Leads |
| --- | --- |
| ![Overview](docs/screenshots/overview.png) | ![Leads](docs/screenshots/leads.png) |

| Conversation and score | Meetings |
| --- | --- |
| ![Conversation](docs/screenshots/conversation.png) | ![Meetings](docs/screenshots/meetings.png) |

## Architecture

```mermaid
flowchart LR
  Dashboard["Next.js dashboard"] --> API["Express API"]
  Webhook["WhatsApp webhook"] --> API
  API --> MySQL[(MySQL)]
  API --> Redis[(Redis)]
  Redis --> Worker["BullMQ worker"]
  Worker --> AI{AI mode}
  AI --> Mock["Deterministic mock"]
  AI --> OpenAI["OpenAI tool calling"]
  Worker --> MySQL
```

An inbound message is stored, then a job qualifies the lead. The model may call tools; the server computes the score and the meeting slots. A qualifying lead with no reply gets one delayed follow-up.

## Features

- Inbound WhatsApp-style webhook. The same phone updates one lead. Duplicate provider message ids are ignored.
- Lead qualification on need, budget, timeline, authority, and profile. The score is computed in the server, not by the model.
- Tool calls: `update_lead_profile`, `set_lead_qualification`, `propose_meeting_times`, `book_meeting`.
- Meeting slots on the Israeli business week, Sunday–Thursday at 10:00, 13:00, and 16:00, Asia/Jerusalem.
- BullMQ follow-up: one delayed message if a qualifying lead goes quiet.
- Admin dashboard: pipeline, lead list, conversation, score breakdown, and meetings.
- Deterministic mock mode so the demo and the test suite run with no API key. Set `AI_MODE=openai` to use the live model. If that call fails before any write, the turn falls back to the mock.
- Seeded demo leads the first time the database is empty.

The dashboard is open on purpose. It is a local demo, not an authenticated product.

## Tech stack

- TypeScript, Node.js, Express
- Next.js and React
- MySQL 8 and Prisma migrations
- Redis and BullMQ
- OpenAI Chat Completions with tool calling
- Jest and Supertest
- Docker Compose
- GitHub Actions

## Quick start

Docker Compose builds the images on first run and starts MySQL, Redis, the API, the worker, and the dashboard.

```bash
docker compose up --build
```

- Dashboard: http://localhost:3000
- API: http://localhost:4000/api/health

Demo data is inserted once. `docker compose down -v` drops the database so the next start seeds again.

Send a lead through the webhook:

```bash
curl -s -X POST http://localhost:4000/api/webhooks/whatsapp \
  -H 'content-type: application/json' \
  -d '{
    "from": "+972521110099",
    "name": "Yael Mizrahi",
    "text": "I am Yael Mizrahi, founder at Mizrahi Clinic. I want WhatsApp qualification for new patient leads. Budget is 6000 ILS/month and we need this ASAP. Email yael@mizrahi.example"
  }'
```

Open the new lead in the dashboard, or reply with `Option 1` to book the first offered slot. The lead page can also simulate an inbound message and book a slot directly.

### Local development

```bash
cp .env.example .env
docker compose up -d mysql redis
npm ci
npm run prisma:generate
export DATABASE_URL=mysql://lead:lead@127.0.0.1:3306/lead_assistant
npm run prisma:deploy
npm run seed -w server
npm run dev:api
npm run dev:worker
npm run dev:web
```

## Environment variables

Copy `.env.example` to `.env`. Compose reads `AI_MODE` and `OPENAI_API_KEY` from that file. Do not commit secrets.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | MySQL connection string | Compose sets it |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` in Compose |
| `AI_MODE` | `mock` or `openai` | `mock` |
| `OPENAI_API_KEY` | Required for live tool calling | empty |
| `OPENAI_MODEL` | Chat model | `gpt-4o-mini` |
| `PORT` | API port | `4000` |
| `WEB_ORIGIN` | Comma-separated browser origins allowed by CORS | localhost:3000 |
| `QUEUE_DRIVER` | `bullmq` or `inline` | `bullmq` (`inline` in tests) |
| `FOLLOW_UP_DELAY_MS` | Delay before the single follow-up | `86400000` |
| `APP_TIMEZONE` | Slot calendar | `Asia/Jerusalem` |
| `NEXT_PUBLIC_API_URL` | API base URL baked into the dashboard | `http://localhost:4000` |

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Database, Redis, AI mode, queue driver |
| `GET` | `/api/stats` | Pipeline counts and average score |
| `GET` | `/api/leads?status=&q=` | List leads. `status` is `NEW`, `QUALIFYING`, `QUALIFIED`, `UNQUALIFIED`, or `MEETING_BOOKED` |
| `POST` | `/api/leads` | Create a lead. Body: `name`, `phone`, optional `email`, `company`, `need` |
| `GET` | `/api/leads/:id` | Lead, score breakdown, messages, meetings |
| `POST` | `/api/leads/:id/meetings` | Book a proposed slot. Body: `{ "slotId": "slot_1" }` |
| `GET` | `/api/meetings` | All meetings, with the lead |
| `PATCH` | `/api/meetings/:id` | Cancel. Body: `{ "status": "CANCELLED" }` |
| `POST` | `/api/webhooks/whatsapp` | Inbound message. Body: `from`, `text`, optional `name`, `messageId` |

Webhook responses are `202` with `{ leadId, messageId, duplicate, queued }`. Validation errors are `400` with `{ error }`.

## Testing

Unit tests cover scoring, slot generation, field extraction, the mock planner, and the demo seed. API tests cover health, lead CRUD, the webhook, booking, cancellation, idempotency, and a delayed BullMQ follow-up. They refuse to run unless `DATABASE_URL` points at a database whose name contains `lead_assistant_test`.

```bash
docker compose up -d mysql redis
npm test
```

`npm run test:unit` does not need MySQL or Redis.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, and the full test suite against MySQL and Redis service containers.

## Project structure

```
.
├── docker-compose.yml
├── docker/mysql/init.sql          # also creates the test database
├── .github/workflows/ci.yml
├── server/
│   ├── prisma/                    # schema and MySQL migrations
│   ├── src/domain/                # phone, score, slots, extraction, mock planner
│   ├── src/ai/                    # tool definitions, OpenAI client, tool loop
│   ├── src/services/              # persistence and inbound handling
│   ├── src/queue/                 # BullMQ jobs and worker
│   ├── src/routes/
│   └── tests/
├── web/                           # Next.js admin dashboard
└── docs/screenshots/
```

## License

MIT. See [LICENSE](LICENSE).
