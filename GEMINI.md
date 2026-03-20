# CallAgent (Project Zeppy)

AI-powered phone investigation assistant that calls contacts, investigates requirements, streams live progress/transcripts, and recommends the best option with action items.

## Project Overview

- **Purpose:** Automates the process of calling multiple service providers or contacts to gather information based on a user's requirement (e.g., finding a dog sitter, checking product availability).
- **Main Technologies:**
    - **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui.
    - **Backend:** Next.js API routes (Node.js runtime), SSE (Server-Sent Events) for live updates.
    - **Database:** PostgreSQL with Prisma ORM.
    - **Voice AI:** LiveKit Agents + Google Gemini Live API (Realtime Model).
    - **Telephony:** LiveKit SIP (integrates with Twilio SIP Trunk).
    - **Infrastructure:** Docker Compose for local PostgreSQL.

## Architecture

1.  **UI Layer:** Users provide a free-form requirement. The system parses this into structured contacts and specific questions using Gemini.
2.  **Orchestration Layer (`src/lib/calls/orchestrator.ts`):** Manages the investigation lifecycle. It initiates multiple concurrent calls (default max 3) and handles retries.
3.  **Voice Agent (`src/agent/telephony-agent.ts`):** A standalone LiveKit Agent worker that connects to SIP calls. It uses Gemini's Realtime model for natural voice conversation and logs transcripts in real-time.
4.  **Analysis Layer:** Once calls are completed, Gemini analyzes the transcripts to extract findings, rank recommendations, and generate follow-up action items.

## Building and Running

### Prerequisites
- Node.js (latest LTS)
- Docker (for local database)
- Environment variables configured in `.env` (see `.env.example`)

### Key Commands
- `npm install`: Install dependencies.
- `npm run db:up`: Start the local PostgreSQL container.
- `npm run db:migrate`: Run Prisma migrations.
- `npm run db:generate`: Generate the Prisma client.
- `npm run dev:all`: Start both the Next.js development server and the LiveKit agent worker concurrently.
- `npm run dev:app`: Start only the Next.js application.
- `npm run dev:agent`: Start only the LiveKit telephony agent worker.
- `npm run build`: Production build.
- `npm run lint`: Run ESLint.
- `npm run test`: Run tests using Vitest.

## Development Conventions

- **Language:** TypeScript for both frontend and backend logic.
- **Styling:** Tailwind CSS 4 with `shadcn/ui` components.
- **Database:** Prisma is used for all database interactions. Always run `npx prisma generate` after schema changes.
- **Logging:** A custom logger is available in `src/lib/logger.ts`. Use structured logging for better observability.
- **API Response:** API routes are located in `src/app/api/`. Live updates for investigations are delivered via SSE at `/api/investigations/:id/events`.
- **Testing:** Vitest is used for unit and integration tests. Tests are typically colocated or found in `*.test.ts` files.

## Project Structure

- `src/agent/`: Voice agent worker implementation.
- `src/app/`: Next.js App Router (pages and API routes).
- `src/components/`: React components (UI, specific features).
- `src/lib/`: Core logic, including:
    - `calls/`: Orchestrator, runner, and LiveKit/Gemini integrations.
    - `analysis/`: Recommendation and action item generation logic.
    - `events/`: Event logging and SSE publishing.
    - `db.ts`: Prisma client instance.
- `prisma/`: Database schema and migrations.
