# Feedback Frontend

A React-based feedback management system for educational institutions.

## Features

- **Student Portal**: Submit feedback for multiple staff members
- **Admin Dashboard**: View analytics and manage feedback schedules
- **Dynamic API Configuration**: Supports both development and production environments

## Tech Stack

- React 18 + TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Tanstack Query for data fetching
- Wouter for routing

## Environment Variables

```bash
# Development
VITE_API_BASE_URL=http://localhost:8080

# Production
VITE_API_BASE_URL=https://zedswevenbackend-production.up.railway.app
```

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Deployment

This project is configured for Railway deployment with automatic environment detection.