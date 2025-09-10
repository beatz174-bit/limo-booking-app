# Frontend

React + TypeScript single-page application for the Limo Booking App.

## Prerequisites

- Node.js 18+

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file or export the following variables:

- `VITE_API_BASE_URL` – URL of the backend API (e.g. `http://localhost:8000`).
- `VITE_GOOGLE_MAPS_API_KEY` – Google Maps key for rendering maps.
 - `VITE_FCM_VAPID_KEY` – Firebase Cloud Messaging VAPID key.
 - `VITE_FCM_API_KEY` – Firebase API key.
 - `VITE_FCM_PROJECT_ID` – Firebase project ID.
 - `VITE_FCM_APP_ID` – Firebase app ID.
 - `VITE_FCM_SENDER_ID` – Firebase sender ID.

## Development

Start the development server:

```bash
npm run dev
```

> **Note:** Run the dev server with `npm run dev` so the `predev` hook can
> inject the Firebase service worker. Starting `vite` directly skips this step
> and leaves placeholders in the service worker.

## Testing

Run unit tests with:

```bash
npm test
```

Run TypeScript type checks:

```bash
npm run test:typecheck
```

Connectivity tests for external services are included in the unit test suite.

Additional scripts for coverage or end-to-end tests are available in `package.json`.

