# Crowdfunding Platform

Nền tảng gọi vốn cộng đồng (Crowdfunding) — Đồ án cuối kỳ

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + Prisma ORM
- **Database**: PostgreSQL 16 + Redis
- **Monorepo**: Turborepo + pnpm

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start database & Redis
docker compose -f infra/docker/docker-compose.yml up -d

# 3. Generate Prisma Client
pnpm db:generate

# 4. Push schema to database
pnpm db:push

# 5. Start development
pnpm dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Lint all apps |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm format` | Format all files with Prettier |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed the database |

## Project Structure

```
crowdfunding_platform/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # NestJS backend  (port 3001)
├── packages/
│   ├── shared-types/ # Shared TypeScript types
│   ├── ts-config/    # Shared TS configs
│   └── eslint-config/# Shared ESLint configs
└── infra/
    └── docker/       # Docker Compose for dev
```

## Team

- **Dev 1**: Backend (API, Database, Business Logic)
- **Dev 2**: Frontend (UI, UX, State Management)
