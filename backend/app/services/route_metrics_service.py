import os
import httpx

GOOGLE_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

async def get_route_metrics(pickup: str, dropoff: str) -> dict:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_MAPS_API_KEY not configured")
    params = {
        "origins": pickup,
        "destinations": dropoff,
        "units": "metric",
        "key": api_key,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(GOOGLE_DISTANCE_MATRIX_URL, params=params)
        res.raise_for_status()
        data = res.json()
    try:
        element = data["rows"][0]["elements"][0]
        if element.get("status") != "OK":
            raise RuntimeError(element.get("status", "error"))
        distance_m = element["distance"]["value"]
        duration_s = element["duration"]["value"]
        return {"km": distance_m / 1000, "min": duration_s / 60}
    except Exception as exc:
        raise RuntimeError("Invalid response from Distance Matrix") from exc
