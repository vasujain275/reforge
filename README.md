<div align="center">

# 🔥 Reforge

**Local-first, self-hostable DSA revision tool for coding interviews**

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

[Features](#-features) • [Why Reforge?](#-why-reforge) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Philosophy](#-philosophy)

</div>

---

## 🎯 What is Reforge?

Reforge is a **deterministic, explainable DSA (Data Structures & Algorithms) revision scheduler** designed for coding interview preparation. Unlike cloud-centric tools with opaque algorithms, Reforge runs entirely on your machine, gives you complete control over your practice data, and explains every decision it makes.

### The Problem We Solve

- **❌ You forget problems** that need revision until it's too late
- **❌ No reliable way to decide** *which* problems to revisit and *when*
- **❌ Cloud tools are opaque**, require subscriptions, and don't explain their logic
- **❌ Existing solutions** are complex to setup and don't respect your privacy

### The Reforge Solution

- **✅ Deterministic scoring** — not AI magic, just explainable math
- **✅ Local-first** — your data never leaves your machine
- **✅ Self-hostable** — single Go binary, no dependencies
- **✅ Transparent** — see exactly why each problem was recommended

---

## ⚡ Features

### 🧠 **Intelligent Scoring System**
Reforge uses a **deterministic, weighted scoring formula** that combines:
- 📊 **Confidence levels** — track how well you know each problem
- ⏰ **Time-based urgency** — adaptive spacing with mastery multipliers
- 🎯 **Pattern weakness** — identify weak areas across problem categories
- 🔴 **Failure tracking** — prioritize problems you've struggled with
- 📈 **Difficulty awareness** — balance easy wins with challenging practice

Every score is **fully explainable** — see exactly which factors contributed to each recommendation.

### 📋 **Revision Templates**
Pre-configured session types tailored for different goals:
- ⚡ **Daily Revision** (35 min) — consistent, bite-sized practice
- 📚 **Daily Mixed** (55 min) — balanced variety with harder problems
- 🏖️ **Weekend Comprehensive** (150 min) — deep pattern consolidation
- 🚨 **Weak Pattern Focus** (120 min) — attack your weakest areas
- 🎯 **Pattern Deep Dive** (90 min) — master one pattern at a time
- 💪 **Confidence Booster** (45 min) — pre-interview warmup
- 🔥 **Challenge Mode** (100 min) — simulate interview stress

### 🔐 **Privacy & Security**
- 🔒 **JWT-based authentication** with stateful refresh tokens
- 🛡️ **Password hashing** using bcrypt
- 🏠 **Self-hostable** — deploy on your own infrastructure
- 💾 **PostgreSQL database** — production-ready, scalable storage

### ⚙️ **Customizable & Transparent**
- 🎚️ **Adjustable scoring weights** — tune the algorithm to your preferences
- 📊 **Explainability breakdowns** — understand every recommendation
- 🗂️ **Pattern tracking** — organize problems by coding patterns
- 📝 **Session history** — track your progress over time
- 📤 **Export tools** — markdown/JSON exports for portability

### 🎨 **Beautiful, Technical UI**
- 🌙 **Dark-mode first** — "Nerdy Linux" aesthetic
- ⚡ **Fast & responsive** — built with React 19 + Vite
- 🎯 **Terminal-adjacent** — professional HUD-style interface
- 🔧 **Shadcn UI components** — modern, accessible design system

---

## 🚀 Why Reforge?

### **🔬 Deterministic, Not Opaque**
Most spaced repetition tools use algorithms you can't inspect or control. Reforge shows you exactly why each problem was selected:
```
Problem: Two Sum
Score: 0.82 (High Priority)
├─ Confidence (40/100): 0.60 × 0.30 = 0.18
├─ Days Since Last (17): 0.18 × 0.20 = 0.04
├─ Failed Last Attempt: 1.00 × 0.10 = 0.10
├─ Pattern Weakness (Arrays): 0.65 × 0.10 = 0.07
└─ Total: 0.82
```

### **🏠 Local-First, Self-Hostable**
- **Single Go binary** — no Docker, no Kubernetes, no complexity
- **SQLite database** — one file, easy backups, no server needed
- **Offline-capable** — works without internet after setup
- **Your data, your machine** — no cloud dependencies

### **🔧 Built for Engineers, by Engineers**
- **No AI hype** — deterministic rules that you can understand and tune
- **Open architecture** — inspect the scoring formula, modify weights
- **Export-friendly** — JSON/Markdown exports for Obsidian, Notion, etc.
- **Minimal ops** — runs on any platform (Linux, macOS, Windows)

### **📈 Actually Helps You Improve**
- **Adaptive spacing** — mastered problems appear less frequently
- **Pattern-aware** — identifies systemic weaknesses across categories
- **Time-budgeted sessions** — realistic practice based on your schedule
- **Quick wins** — builds confidence before tackling hard problems

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|:-----:|:-----------|
| **Backend** | Go 1.23+, Chi Router, PostgreSQL 18, pgx/v5, SQLC, Goose Migrations |
| **Frontend** | React 19, TypeScript 5.7+, Vite, Zustand |
| **UI** | Shadcn UI, Tailwind CSS, Lucide Icons, OKLCH Colors |
| **Auth** | JWT (stateful refresh tokens), bcrypt |
| **Database** | PostgreSQL 18 (production-ready, UUID PKs) |
| **Deployment** | Docker (multi-service), Caddy reverse proxy |

</div>

---

## 🏁 Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/vasujain275/reforge.git
cd reforge

# Copy environment template
cp infra/.env.sample infra/.env

# Edit .env and set JWT_SECRET and DB_PASSWORD
# Generate with: openssl rand -base64 32
nano infra/.env

# Start the stack
docker compose -f infra/docker-compose.yaml up -d

# Access the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:9173
```

For full installation and development instructions, see the [**📚 Documentation**](#-documentation) section below.

---

## 📚 Documentation

Comprehensive guides to get you started:

- **[📦 Installation Guide](docs/INSTALLATION.md)** — Setup instructions for all platforms
- **[💻 Development Guide](docs/DEVELOPMENT.md)** — Contributing and local development
- **[🔄 PostgreSQL Migration Guide](docs/POSTGRES_MIGRATION.md)** — Migrating from SQLite to PostgreSQL
- **[🔒 Caddy Setup Guide](docs/CADDY_SETUP.md)** — Production reverse proxy with automatic HTTPS
- **[🤖 Agent Guide](AGENTS.md)** — Guide for AI coding agents working on this project
- **[🎨 Style Guide](STYLE-GUIDE.md)** — Frontend design system and patterns

---

## 💡 Philosophy

### **Why No AI?**
AI-based scheduling introduces non-determinism, maintenance burden, and opacity without meaningful benefit for this problem. Interview prep needs are **rule-based and explainable** — deterministic heuristics build trust and are fully testable.

### **Why Self-Hostable?**
Your practice data is personal. Reforge gives you full control — deploy on your own infrastructure, keep data private, and never worry about subscriptions or service shutdowns. PostgreSQL ensures production-grade reliability and scalability.

### **Why Explainable?**
When a tool tells you to practice a problem, you should know *why*. Reforge shows feature-by-feature breakdowns for every recommendation, so you understand (and can tune) the logic.

---

## 🗺️ Roadmap

### ✅ **Completed**
- [x] Core scoring formula with 7 weighted features
- [x] JWT authentication with refresh tokens
- [x] React dashboard with "Nerdy Linux" theme
- [x] Customizable scoring weights with UI
- [x] Pattern and problem management
- [x] Session generation and tracking
- [x] CSV bulk problem import
- [x] Session history and analytics
- [x] Docker multi-service deployment
- [x] PostgreSQL 18 production database

### 🚀 **Planned**
- [ ] Progress charts and session replay
- [ ] Custom Session Genrations

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or code contributions, we'd love your help.

**Before contributing:**
1. Read the [Development Guide](docs/DEVELOPMENT.md)
2. Check the [Agent Guide](AGENTS.md) for project conventions
3. Follow the [Style Guide](STYLE-GUIDE.md) for UI work

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🌟 Show Your Support

If Reforge helps you ace your coding interviews, consider giving it a star! ⭐

<div align="center">

### Star History

[![Star History Chart](https://api.star-history.com/svg?repos=vasujain275/reforge&type=Date)](https://star-history.com/#vasujain275/reforge&Date)

---

**Built with ❤️ for engineers who value transparency, privacy, and determinism.**

[⬆ Back to Top](#-reforge)

</div>
