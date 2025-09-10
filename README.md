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
| `VITE_GOOGLE_PAY_MERCHANT_ID` | (frontend) Google Pay merchant ID used by Stripe's Payment Request API. Required for production Google Pay. |
| `LOG_LEVEL` | (backend) Logging verbosity (`DEBUG`, `INFO`, etc.). Defaults to `INFO`. |
| `GRAYLOG_HOST` / `GRAYLOG_PORT` | (backend) Optional Graylog host and port for log forwarding. Port defaults to `12201`. |
| `FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` | (backend) Optional Firebase credentials for push notifications. |
| `ONESIGNAL_APP_ID` / `ONESIGNAL_API_KEY` | (backend) OneSignal credentials for push notifications. |
| `VITE_FCM_API_KEY` / `VITE_FCM_PROJECT_ID` / `VITE_FCM_APP_ID` / `VITE_FCM_SENDER_ID` / `VITE_FCM_VAPID_KEY` | (frontend) Optional Firebase config for web push. |

## Logging


The backend emits JSON-formatted logs to stdout. Set the `LOG_LEVEL` environment
variable to control verbosity. Each log line includes a `request_id` so related
events can be correlated in Docker or a centralized aggregator. HTTP requests,
domain actions, and handled errors are recorded with structured context. When
`GRAYLOG_HOST` is set, logs are additionally sent to the specified Graylog
server while still appearing in `docker logs`.

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

## Database migrations

The backend relies on Alembic migrations for database schema creation and
updates. When the application starts, migrations are applied up to the latest
revision, so ensure your migration files are up to date.

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

> **Note:** Always start the frontend with `npm run dev` rather than invoking
> `vite` directly. The `predev` script injects the Firebase Cloud Messaging
> service worker before the dev server boots and is skipped when running `vite`
> manually.

## Realtime tracking

Drivers send location updates over `/ws/bookings/{id}` using a JWT token.
Customers can retrieve a tracking link via `GET /api/v1/track/{public_code}`
and connect to `/ws/bookings/{id}/watch` (also authenticated) for live
updates.

## Availability

The driver can manage personal blocks and avoid double-booking through the
`/api/v1/availability` API. Confirmed bookings automatically reserve their time
window, and additional blocks can be added via the `/driver/availability`
frontend page.

## Push notifications

When Firebase credentials are supplied the backend dispatches push notifications
to role-based topics using Firebase Cloud Messaging. The frontend registers a
service worker and requests a browser token at startup; messages display using
the standard Web Push APIs. When the credentials are omitted the feature is
silently disabled.

## Testing

- Backend: `cd backend && pytest`
- Backend type-checking: `cd backend && mypy --strict app`
- External service connectivity: exercised via `pytest` tests
- Frontend: `cd frontend && npm test`
- Frontend type-checking: `cd frontend && npm run test:typecheck`
- End-to-end: `cd frontend && npm run e2e`

## Driver API

Authenticated driver clients can manage bookings via the `/api/v1/driver/bookings` routes. Confirming a booking charges the
customer's deposit via Stripe, while declining leaves the booking in a declined state. Once on the way, additional actions
progress the trip lifecycle:

- `POST /api/v1/driver/bookings/{id}/arrive-pickup`
- `POST /api/v1/driver/bookings/{id}/start-trip`
- `POST /api/v1/driver/bookings/{id}/arrive-dropoff`
- `POST /api/v1/driver/bookings/{id}/complete` (computes final fare and charges the remainder)

## Customer API

Authenticated customers can view their booking history via:

- `GET /api/v1/customers/me/bookings`

## Google Pay via Stripe

Stripe's Payment Request button surfaces Google Pay when the browser supports it.

1. In the Stripe Dashboard, go to **Settings → Payment methods → Wallets** and enable **Google Pay**.
2. Create a merchant in the [Google Pay Business Console](https://pay.google.com/business/console). Use the **Test** environment to generate a sandbox merchant ID.
3. Verify your domain in the Google Pay console by hosting the provided file under `/.well-known/` or by using Google Search Console.
4. Set `VITE_GOOGLE_PAY_MERCHANT_ID` in the frontend environment with your merchant ID.
5. Rebuild or restart the frontend to pick up new environment variables.

### Testing Google Pay

1. Sign in to Chrome or an Android device with a Google account that has a test card added to Google Pay.
2. Run the frontend with `VITE_GOOGLE_PAY_MERCHANT_ID` set to the sandbox ID.
3. The booking payment step should display a Google Pay button. Completing a booking runs entirely in Stripe's test mode.

## Google Maps API Setup

1. Create a Google Cloud project and enable the **Maps JavaScript**, **Distance Matrix**, and **Directions** APIs.
2. Generate an API key and restrict it to your domains/IPs as appropriate.
3. Expose the key to the backend as `GOOGLE_MAPS_API_KEY` (e.g. in your `.env` file or docker-compose). The backend uses this key to proxy requests to the Distance Matrix API.
4. Restart the backend after changing environment variables.

With the key configured, the booking page displays a routed map and pricing uses accurate distance and duration metrics.
