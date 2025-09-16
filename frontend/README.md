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
- `VITE_ONESIGNAL_APP_ID` – OneSignal application ID.
- `VITE_ONESIGNAL_API_KEY` – OneSignal REST API key.
- `VITE_ONESIGNAL_SERVICE_WORKER_PATH` – Optional relative path to the OneSignal service worker script. Defaults to `OneSignalSDK.sw.js` in `public/`.

The OneSignal web SDK expects a service worker bundle to be served from `public/OneSignalSDK.sw.js`. Update that file with the latest worker from OneSignal and adjust `VITE_ONESIGNAL_SERVICE_WORKER_PATH` if you host it at a different path.

## Development

Start the development server:

```bash
npm run dev
```



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

