# Limo Booking App

A full-stack application for scheduling limousine rides. The backend is built with FastAPI and the frontend uses React, TypeScript and Vite.

## Project structure

- `backend/` – FastAPI service and REST API (see `backend/README.md` for auto-generated API docs).
- `frontend/` – React application for customers and administrators.

## Documentation

- The backend's OpenAPI specification is exported to `backend/README.md`. This file is generated from the FastAPI app using Widdershins and should not be edited manually.
- Additional usage notes for the React client live in `frontend/README.md`.

## Prerequisites

- Python 3.11+
- Node.js 18+

## Environment variables

The application relies on several external services. Set these variables in a `.env` file or your environment:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_MAPS_API_KEY` | Distance and duration metrics via Google Distance Matrix. |
| `ORS_API_KEY` | Geocoding via the OpenRouteService API. |
| `JWT_SECRET_KEY` | Secret used to sign access tokens. |
| `STRIPE_SECRET_KEY` | Server-side Stripe key for payment intents and SetupIntents. |
| `VITE_API_BASE_URL` | (frontend) Base URL of the backend API. |
| `VITE_GOOGLE_MAPS_API_KEY` | (frontend) Google Maps key for map rendering. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | (frontend) Stripe publishable key for card collection. |
| `LOG_LEVEL` | (backend) Logging verbosity (`DEBUG`, `INFO`, etc.). Defaults to `INFO`. |

## Logging


The backend emits JSON-formatted logs to stdout. Set the `LOG_LEVEL` environment
variable to control verbosity. Each log line includes a `request_id` so related
events can be correlated in Docker or a centralized aggregator. HTTP requests,
domain actions, and handled errors are recorded with structured context.

## Setup

1. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

## Running

### Using Docker

From the repository root run:

```bash
docker-compose up --build
```

This starts both backend and frontend services.

### Local development

Run the backend:

```bash
cd backend
uvicorn app.main:app --reload
```

Run the frontend:

```bash
cd frontend
npm run dev
```

## Testing

- Backend: `cd backend && pytest`
- Frontend: `cd frontend && npm test`

## Google Maps API Setup

1. Create a Google Cloud project and enable the **Maps JavaScript**, **Distance Matrix**, and **Directions** APIs.
2. Generate an API key and restrict it to your domains/IPs as appropriate.
3. Expose the key to the backend as `GOOGLE_MAPS_API_KEY` (e.g. in your `.env` file or docker-compose). The backend uses this key to proxy requests to the Distance Matrix API.
4. Restart the backend after changing environment variables.

With the key configured, the booking page displays a routed map and pricing uses accurate distance and duration metrics.
