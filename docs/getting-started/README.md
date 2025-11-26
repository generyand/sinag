# Getting Started with SINAG

Welcome to SINAG! This guide will help you set up your development environment and get the application running locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and **pnpm** 8+
- **Python** 3.13+
- **uv** (Python package manager)
- **PostgreSQL** (via Supabase account recommended)
- **Redis** (for Celery background tasks)
- **Docker** (optional, for containerized development)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vantage
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install backend dependencies
cd apps/api
uv sync
```

### 3. Environment Setup

See [Installation Guide](./installation.md) for detailed environment configuration.

### 4. Start Development Servers

```bash
# From project root
pnpm dev
```

This starts both frontend (`:3000`) and backend (`:8000`) servers.

## Next Steps

- [Installation Guide](./installation.md) - Detailed setup instructions
- [Local Development](./local-development.md) - Development workflow
- [Docker Setup](./docker-setup.md) - Using Docker for development

## Common First-Time Setup Issues

See [Troubleshooting](../troubleshooting/README.md) for solutions to common problems.
