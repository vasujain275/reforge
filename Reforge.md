# Reforge

> **Tagline:** Master DSA for your next coding interview with intelligent spaced repetition.

> **Vision:** A professional-grade interview preparation platform that helps engineers systematically build and retain algorithmic problem-solving skills through science-backed revision scheduling.

---

# Table of Contents

1. [Overview](#1-overview)
2. [Core Features](#2-core-features)
3. [Architecture](#3-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Authentication & Security](#5-authentication--security)
6. [The Scoring System](#6-the-scoring-system)
7. [Database Schema](#7-database-schema)
8. [Session Generation Algorithm](#8-session-generation-algorithm)
9. [Revision Templates](#9-revision-templates)
10. [API Reference](#10-api-reference)
11. [Deployment](#11-deployment)
12. [Development Setup](#12-development-setup)
13. [Roadmap](#13-roadmap)

---

# 1. Overview

## What is Reforge?

Reforge is a DSA (Data Structures & Algorithms) revision platform designed for software engineers preparing for technical interviews. It uses a deterministic, explainable scoring algorithm to intelligently schedule which problems you should practice and when.

## Key Principles

1. **Explainable Decisions** — Every recommendation shows exactly why a problem was selected, building trust and understanding.

2. **Spaced Repetition** — Uses proven memory science to schedule reviews at optimal intervals for long-term retention.

3. **Progress Tracking** — Comprehensive analytics on your confidence, patterns, and improvement over time.

4. **Open Source** — 100% open source under MIT license. Self-host for free, or use our managed service.

5. **Privacy First** — Your practice data is yours. Self-hosted instances keep all data on your infrastructure.

## Who is it for?

- **Individual Engineers** — Preparing for FAANG/MAANG interviews systematically
- **Bootcamp Students** — Tracking progress through DSA curriculum
- **Study Groups** — Teams preparing together with shared problem sets
- **Educators** — Managing student cohorts and tracking class progress

---

# 2. Core Features

## Smart Problem Scheduling

The heart of Reforge is its scoring algorithm. For each problem, it calculates a priority score based on:

- Your confidence level (self-reported)
- Time since last practice
- Historical performance (pass/fail rate)
- Pattern weaknesses (if you're weak at "Dynamic Programming", those problems get prioritized)
- Problem difficulty

The algorithm is fully transparent — you can see exactly how each factor contributes to a problem's priority.

## Session Generation

Tell Reforge how much time you have, and it generates an optimized practice session:

- **Quick Session (15-30 min)** — Focus on weak areas with quick wins
- **Standard Session (45-60 min)** — Balanced mix of review and challenge
- **Deep Dive (90+ min)** — Comprehensive pattern practice

Each session explains why each problem was selected.

## Progress Analytics

- Confidence trends over time
- Pattern mastery breakdown
- Streak tracking
- Session history with detailed attempt logs

## Flexible Problem Management

- Add problems from any source (LeetCode, HackerRank, custom)
- Tag with multiple patterns (Two Pointers, BFS, etc.)
- Track solutions and notes
- Import/export capabilities

---

# 3. Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Web App    │  │   Mobile     │  │    CLI       │       │
│  │   (React)    │  │   (Future)   │  │   (Future)   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                    (Go + Chi Router)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Authentication │ Rate Limiting │ Request Logging   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Users   │  │ Problems │  │ Sessions │  │ Scoring  │    │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   PostgreSQL                         │    │
│  │   (UUID primary keys, TIMESTAMPTZ, full-text search) │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Design Principles

### Hexagonal Architecture

The backend follows hexagonal (ports & adapters) architecture:

- **Domain Layer** — Pure business logic, no external dependencies
- **Ports** — Interfaces defining how the domain interacts with the outside world
- **Adapters** — Implementations of ports (PostgreSQL adapter, HTTP handlers, etc.)

This allows easy testing and the ability to swap implementations.

### API-First Design

- RESTful JSON API
- JWT-based authentication with refresh tokens
- Consistent error responses
- OpenAPI specification (coming soon)

### Type Safety

- **Backend:** SQLC generates type-safe Go code from SQL queries
- **Frontend:** TypeScript strict mode, no `any` types
- **API Contract:** Shared types ensure frontend/backend alignment

---

# 4. Tech Stack

## Backend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | Go 1.23+ | Fast, type-safe, excellent concurrency |
| Router | Chi | Lightweight, idiomatic Go HTTP router |
| Database | PostgreSQL 16+ | Production-grade relational database |
| DB Driver | pgx/v5 | High-performance PostgreSQL driver |
| Migrations | Goose | Database schema versioning |
| Query Gen | SQLC | Type-safe SQL query generation |
| Auth | JWT + bcrypt | Stateful refresh tokens |

## Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 19 | Component-based UI |
| Language | TypeScript 5.7+ | Type safety |
| Build Tool | Vite | Fast development and builds |
| Styling | Tailwind CSS | Utility-first CSS |
| Components | Shadcn UI | Accessible, customizable components |
| State | Zustand | Lightweight state management |
| HTTP Client | Axios | API communication with interceptors |

## Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Containerization | Docker | Consistent deployment |
| Orchestration | Docker Compose | Multi-container management |
| Reverse Proxy | Nginx/Caddy | SSL termination, static serving |
| CI/CD | GitHub Actions | Automated testing and deployment |

---

# 5. Authentication & Security

## Authentication Flow

1. **Registration:** User provides email, password, name. Password hashed with bcrypt.
2. **Login:** Validates credentials → Returns short-lived access token (15 min) + long-lived refresh token (7 days)
3. **Token Refresh:** Access token expired → Use refresh token to get new access token
4. **Logout:** Invalidates refresh token server-side

## Token Strategy

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 15 minutes | HTTP-only cookie | API authentication |
| Refresh Token | 7 days | HTTP-only cookie + DB hash | Session persistence |

## Security Measures

- **Password Hashing:** bcrypt with cost factor 10+
- **Token Storage:** HTTP-only cookies prevent XSS access
- **CSRF Protection:** SameSite cookie attribute
- **Refresh Token Rotation:** Tokens hashed before database storage
- **Rate Limiting:** Prevents brute force attacks (coming soon)

---

# 6. The Scoring System

This is the core algorithm that makes Reforge intelligent. It produces a score between 0 and 1, where **higher = more urgent to practice**.

## Input Features

For each problem, we compute these normalized features (all scaled to 0-1):

| Feature | Formula | Description |
|---------|---------|-------------|
| `f_conf` | `(100 - confidence) / 100` | Lower confidence = higher urgency |
| `f_days` | `min(days, cap) / cap` | Longer since practice = higher urgency |
| `f_attempts` | `min(attempts, 10) / 10` | More attempts = persistent difficulty |
| `f_time` | `min(avg_time, 3600) / 3600` | Longer solve time = complexity |
| `f_difficulty` | Easy=0.2, Medium=0.5, Hard=1.0 | Harder problems get slight boost |
| `f_failed` | 1 if last attempt failed, else 0 | Recent failure = urgent |
| `f_pattern` | `1 - (pattern_avg_confidence/100)` | Weak patterns get boosted |

## Weights (Configurable)

Default weights (must sum to 1.0):

```
w_conf      = 0.30  (Confidence is strongest signal)
w_days      = 0.20  (Time-based spacing)
w_attempts  = 0.10  (Persistent difficulty)
w_time      = 0.05  (Complexity indicator)
w_difficulty = 0.15 (Difficulty boost)
w_failed    = 0.10  (Recent failure priority)
w_pattern   = 0.10  (Pattern weakness)
```

Users can customize these weights in Settings.

## Final Score Calculation

```
score = w_conf * f_conf
      + w_days * f_days
      + w_attempts * f_attempts
      + w_time * f_time
      + w_difficulty * f_difficulty
      + w_failed * f_failed
      + w_pattern * f_pattern
```

## Score Interpretation

| Score Range | Priority | Action |
|-------------|----------|--------|
| 0.7 - 1.0 | High | Practice immediately |
| 0.4 - 0.7 | Medium | Include in regular sessions |
| 0.0 - 0.4 | Low | Recently practiced or mastered |

## Explainability

The UI shows each factor's contribution:

```
Problem: "LRU Cache" — Score: 0.78

Breakdown:
• Confidence (45%) ........... +0.165  (Low confidence, needs practice)
• Days since practice (18) ... +0.120  (Getting stale)
• Failed last attempt ........ +0.100  (Need to retry)
• Pattern weakness (Design) .. +0.085  (Weak in this pattern)
• Difficulty (Hard) .......... +0.150  (Hard problem boost)
• Attempts (3) ............... +0.030  
• Average time ............... +0.025
```

---

# 7. Database Schema

## Overview

PostgreSQL with UUID primary keys and TIMESTAMPTZ for all timestamps.

## Core Tables

### Users & Authentication

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT
);
```

### Problems & Patterns

```sql
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    source TEXT,                    -- e.g., "LeetCode", "NeetCode 150"
    url TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,            -- e.g., "Sliding Window"
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE problem_patterns (
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, pattern_id)
);
```

### User Progress

```sql
CREATE TABLE user_problem_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('unsolved','solved','abandoned')) DEFAULT 'unsolved',
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100) DEFAULT 50,
    avg_confidence INTEGER CHECK (avg_confidence BETWEEN 0 AND 100) DEFAULT 50,
    last_attempt_at TIMESTAMPTZ,
    total_attempts INTEGER DEFAULT 0,
    avg_time_seconds INTEGER,
    last_outcome TEXT,              -- 'passed' or 'failed'
    -- Spaced repetition fields
    ease_factor REAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    next_review_at TIMESTAMPTZ,
    UNIQUE(user_id, problem_id)
);

CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    session_id UUID REFERENCES revision_sessions(id) ON DELETE SET NULL,
    confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
    duration_seconds INTEGER,
    outcome TEXT CHECK (outcome IN ('passed', 'failed')),
    notes TEXT,
    performed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Sessions

```sql
CREATE TABLE revision_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_key TEXT,              -- e.g., 'daily_revision'
    planned_duration_min INTEGER,
    items_ordered JSONB,            -- Array of planned problems
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# 8. Session Generation Algorithm

## Overview

Given a time budget and optional constraints, generate an optimal practice session.

## Algorithm Steps

1. **Load User Stats** — Fetch all `user_problem_stats` with pattern aggregations
2. **Compute Scores** — Apply scoring formula to each problem
3. **Filter** — Apply template constraints (difficulty, patterns, etc.)
4. **Sort** — Order by score descending
5. **Greedy Selection** — Fill time budget while respecting constraints
6. **Validate** — Ensure quick wins and pattern diversity
7. **Return** — Session with problems and explanations

## Greedy Builder Pseudocode

```go
func BuildSession(candidates []Candidate, budgetMin int, constraints Constraints) []SessionItem {
    sort.Slice(candidates, func(i, j int) bool {
        return candidates[i].Score > candidates[j].Score
    })
    
    var session []SessionItem
    remaining := budgetMin
    patternCounts := map[uuid.UUID]int{}
    
    for _, c := range candidates {
        if c.EstimatedMinutes > remaining {
            continue
        }
        if exceedsPatternLimit(c.Patterns, patternCounts, constraints.MaxSamePattern) {
            continue
        }
        if !allowedDifficulty(c.Difficulty, constraints.MaxDifficulty) {
            continue
        }
        
        session = append(session, SessionItem{
            ProblemID:   c.ProblemID,
            PlannedMin:  c.EstimatedMinutes,
            Score:       c.Score,
            Reason:      generateReason(c),
        })
        remaining -= c.EstimatedMinutes
        
        for _, p := range c.PatternIDs {
            patternCounts[p]++
        }
        
        if remaining <= 0 {
            break
        }
    }
    
    return ensureQuickWins(session, candidates, constraints)
}
```

---

# 9. Revision Templates

Pre-configured session types for different needs:

| Template | Duration | Focus | Best For |
|----------|----------|-------|----------|
| **Quick Review** | 15-30 min | Low confidence, quick wins | Short breaks, warm-up |
| **Daily Practice** | 35-45 min | Balanced weak areas | Daily routine |
| **Standard Session** | 55-60 min | Mix of review + challenge | Regular practice |
| **Pattern Focus** | 60-90 min | Single pattern deep dive | Weak pattern mastery |
| **Weekend Comprehensive** | 120-150 min | Full spectrum | Weekend study blocks |
| **Interview Prep** | 45 min | Timed, medium-hard only | Interview simulation |

Users can also create custom templates.

---

# 10. API Reference

Base URL: `/api/v1`

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create new account |
| POST | `/auth/login` | Login, receive tokens |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/users/me` | Get current user |

## Problems

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/problems` | List all problems with user stats |
| GET | `/problems/:id` | Get single problem |
| POST | `/problems` | Create new problem |
| PUT | `/problems/:id` | Update problem |
| DELETE | `/problems/:id` | Delete problem |
| GET | `/problems/urgent` | Get problems needing review |

## Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions` | List user's sessions |
| GET | `/sessions/:id` | Get session details |
| POST | `/sessions/generate` | Generate session preview |
| POST | `/sessions` | Create and start session |
| PUT | `/sessions/:id/complete` | Mark session complete |

## Attempts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attempts` | Record a problem attempt |
| GET | `/attempts` | List recent attempts |
| GET | `/problems/:id/attempts` | Get attempts for problem |

## Patterns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patterns` | List all patterns with stats |
| POST | `/patterns` | Create new pattern |
| PUT | `/patterns/:id` | Update pattern |
| DELETE | `/patterns/:id` | Delete pattern |

## Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings/weights` | Get scoring weights |
| PUT | `/settings/weights` | Update scoring weights |
| GET | `/settings/weights/defaults` | Get default weights |

---

# 11. Deployment

## Docker Compose (Recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/reforge.git
cd reforge

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# - Set strong JWT_SECRET
# - Set database password
# - Configure allowed origins

# Start the stack
docker compose up -d

# Run database migrations
docker compose exec api task migrate

# Access at http://localhost:3000
```

### Production docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/your-org/reforge-api:latest
    environment:
      - DATABASE_URL=postgres://reforge:${DB_PASSWORD}@db:5432/reforge?sslmode=disable
      - JWT_SECRET=${JWT_SECRET}
      - JWT_ACCESS_EXPIRY=15m
      - JWT_REFRESH_EXPIRY=168h
      - CORS_ORIGINS=${CORS_ORIGINS}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  web:
    image: ghcr.io/your-org/reforge-web:latest
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
    volumes:
      - ./certs:/etc/nginx/certs:ro  # For HTTPS
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=reforge
      - POSTGRES_USER=reforge
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U reforge"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/reforge?sslmode=disable

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h

# Server
PORT=8080
CORS_ORIGINS=https://your-domain.com

# Scoring Weights (optional, defaults shown)
DEFAULT_W_CONF=0.30
DEFAULT_W_DAYS=0.20
DEFAULT_W_ATTEMPTS=0.10
DEFAULT_W_TIME=0.05
DEFAULT_W_DIFFICULTY=0.15
DEFAULT_W_FAILED=0.10
DEFAULT_W_PATTERN=0.10
```

## Backups

```bash
# Backup PostgreSQL
docker compose exec db pg_dump -U reforge reforge > backup_$(date +%F).sql

# Restore
docker compose exec -T db psql -U reforge reforge < backup_2024-01-15.sql
```

---

# 12. Development Setup

## Prerequisites

- Go 1.23+
- Node.js 20+ and pnpm
- PostgreSQL 16+ (or Docker)
- Task (go-task)

## Backend Setup

```bash
cd api

# Install Go dependencies
go mod download

# Start PostgreSQL (if using Docker)
docker run -d --name reforge-db \
  -e POSTGRES_DB=reforge \
  -e POSTGRES_USER=reforge \
  -e POSTGRES_PASSWORD=devpass \
  -p 5432:5432 \
  postgres:16-alpine

# Copy environment file
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations
task migrate

# Generate SQLC code (after changing queries)
task sqlc:generate

# Start development server with hot reload
task dev
```

## Frontend Setup

```bash
cd web

# Install dependencies (ALWAYS use pnpm)
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Lint
pnpm lint

# Add Shadcn component
pnpm shadcn add <component-name>
```

## Task Commands (Backend)

| Command | Description |
|---------|-------------|
| `task dev` | Start with hot reload |
| `task build` | Build binary |
| `task test` | Run all tests |
| `task lint` | Run linter |
| `task migrate` | Run pending migrations |
| `task migrate:down` | Rollback last migration |
| `task sqlc:generate` | Generate SQLC code |

---

# 13. Roadmap

## Completed

- [x] Core authentication (JWT + refresh tokens)
- [x] Problem and pattern management
- [x] Scoring algorithm with explainability
- [x] Session generation
- [x] Attempt tracking
- [x] Spaced repetition (SM-2)
- [x] Dashboard with progress stats
- [x] Settings with weight customization
- [x] Admin panel (user management, invites)

## In Progress

- [ ] PostgreSQL migration (from SQLite)
- [ ] UUID primary keys
- [ ] Docker Compose deployment
- [ ] UI/UX modernization

## Planned

- [ ] Export to Markdown/JSON
- [ ] Import from CSV/JSON
- [ ] Problem notes and solutions
- [ ] Progress charts and analytics
- [ ] Mobile-responsive design
- [ ] Email notifications (session reminders)
- [ ] Team/organization features
- [ ] Public API with API keys

## Future Considerations

- Mobile apps (React Native)
- Browser extension for LeetCode/HackerRank integration
- AI-powered hint system (optional, privacy-preserving)
- Community problem sets

---

# License

MIT License — See [LICENSE](LICENSE) for details.

---

# Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

*Last updated: January 2026*
