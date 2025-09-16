# Frontend

React + TypeScript single-page application for the Limo Booking App.

## Prerequisites

- Node.js 18+

## Setup

Install dependencies:

```bash
npm install
```

Install the OneSignal Web SDK wrapper that powers push subscriptions:

```bash
npm install react-onesignal
```

Create a `.env` file or export the following variables:

- `VITE_API_BASE_URL` – URL of the backend API (e.g. `http://localhost:8000`).
- `VITE_GOOGLE_MAPS_API_KEY` – Google Maps key for rendering maps.
- `VITE_ONESIGNAL_APP_ID` – OneSignal application ID.
- `VITE_ONESIGNAL_API_KEY` – OneSignal REST API key.
- `VITE_ONESIGNAL_SERVICE_WORKER_PATH` – Optional relative path to the OneSignal service worker script. Defaults to `onesignal/OneSignalSDKWorker.js` served from `public/`.
- `VITE_ONESIGNAL_SERVICE_WORKER_UPDATER_PATH` – Optional relative path for the updater worker. Defaults to `onesignal/OneSignalSDKUpdaterWorker.js`.

Example `.env.local` snippet for local development:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=<maps-api-key>
VITE_ONESIGNAL_APP_ID=<onesignal-app-id>
VITE_ONESIGNAL_API_KEY=<onesignal-rest-key>
VITE_ONESIGNAL_SERVICE_WORKER_PATH=onesignal/OneSignalSDKWorker.js
VITE_ONESIGNAL_SERVICE_WORKER_UPDATER_PATH=onesignal/OneSignalSDKUpdaterWorker.js
```

### Hosting the OneSignal service worker

- The worker and updater bundles live in `public/onesignal/`. When you run `npm run dev` or `npm run build`, Vite copies that directory to `/onesignal/*` in the dev server or `dist/` output. Ensure your static host serves those files from the same origin so the SDK can register.
- The wrapper `public/OneSignalSDK.sw.js` must also be deployed at the root of your site (e.g. `/OneSignalSDK.sw.js`). Copy it alongside the `onesignal/` directory when publishing to production.
- If you move the worker files, update `VITE_ONESIGNAL_SERVICE_WORKER_PATH` and `VITE_ONESIGNAL_SERVICE_WORKER_UPDATER_PATH` to the new **absolute** path (include the leading slash). The frontend automatically normalizes these values when calling `subscribePush()` after authentication.
- Example Nginx configuration to expose the workers:

  ```nginx
  location /onesignal/ {
    alias /usr/share/nginx/html/onesignal/;
    add_header Service-Worker-Allowed '/';
  }

  location = /OneSignalSDK.sw.js {
    try_files $uri =404;
    add_header Service-Worker-Allowed '/';
  }
  ```

Once the environment variables are in place, logging in will trigger `subscribePush()` which initializes the OneSignal SDK and registers the user if push notifications are enabled for the browser.

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

