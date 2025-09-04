import math

from app.services.geocode_service import _haversine_distance


def test_haversine_distance_sfo_lax():
    """Distance between SFO and LAX is about 543 km."""
    sfo = (37.6213, -122.3790)
    lax = (33.9416, -118.4085)
    dist = _haversine_distance(sfo[0], sfo[1], lax[0], lax[1])
    assert math.isclose(dist, 543, rel_tol=0.02)
