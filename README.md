# Limo Booking App

## Google Maps API Setup

1. Create a Google Cloud project and enable the **Maps JavaScript**, **Distance Matrix**, and **Directions** APIs.
2. Generate an API key and restrict it to your domains/IPs as appropriate.
3. Expose the key to the backend as `GOOGLE_MAPS_API_KEY` (e.g. in your `.env` file or docker-compose). The backend uses this key to proxy requests to the Distance Matrix API.
4. Restart the backend after changing environment variables.

With the key configured, the booking page displays a routed map and pricing uses accurate distance and duration metrics.
