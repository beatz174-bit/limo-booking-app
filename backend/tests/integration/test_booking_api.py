from app.models.user import User
from app.models.booking import Booking
from app.core.security import create_jwt_token, hash_password

def test_create_booking_unauthorized(client):
    payload = {
        "pickup_location": "Point A",
        "destination": "Point B",
        "ride_time": "2030-01-01T10:00:00"
    }
    response = client.post("/bookings", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_create_booking_success(client, db_session):
    # Create a user and authenticate
    user = User(email="booker@example.com", full_name="Booking User", hashed_password=hash_password("bookpass"))
    db_session.add(user)
    db_session.commit()
    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Create a new booking
    payload = {
        "pickup_location": "Location X",
        "destination": "Location Y",
        "ride_time": "2030-01-01T12:00:00"
    }
    response = client.post("/bookings", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    # Booking should be created with status "pending" and associated with the user
    assert data["pickup_location"] == "Location X"
    assert data["destination"] == "Location Y"
    assert data["status"] == "pending"
    assert "id" in data
    # The booking's user_id should match the authenticated user
    assert data["user_id"] == user.id

def test_list_bookings_unauthorized(client):
    response = client.get("/bookings")
    assert response.status_code == 401

def test_list_bookings_only_user_records(client, db_session):
    # Create two users and some bookings for each
    user1 = User(email="booklist1@example.com", full_name="Book List1", hashed_password=hash_password("pass1"))
    user2 = User(email="booklist2@example.com", full_name="Book List2", hashed_password=hash_password("pass2"))
    db_session.add_all([user1, user2])
    db_session.commit()
    # Create bookings for user1 and user2
    booking1 = Booking(user_id=user1.id, pickup_location="Loc1", dropoff_location="Loc2", time="2025-12-01T09:00:00", status="pending", price=100.0)
    booking2 = Booking(user_id=user2.id, pickup_location="Loc3", dropoff_location="Loc4", time="2025-12-02T10:00:00", status="pending", price=50.0)
    db_session.add_all([booking1, booking2])
    db_session.commit()
    # Authenticate as user1
    token = create_jwt_token(user1.id)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/bookings", headers=headers)
    assert response.status_code == 200
    data = response.json()
    # Should list only bookings belonging to user1
    assert isinstance(data, list)
    assert all(b["user_id"] == user1.id for b in data)
    # booking1 should be present, booking2 should not
    ids = [b["id"] for b in data]
    assert booking1.id in ids
    assert booking2.id not in ids

def test_update_booking_status_success(client, db_session):
    # Create a user and a booking
    user = User(email="updbook@example.com", full_name="Update Booker", hashed_password=hash_password("bookupd"))
    db_session.add(user)
    db_session.commit()
    booking = Booking(user_id=user.id, pickup_location="A", dropoff_location="B", time="2030-01-02T15:00:00", status="pending", price=20.0)
    db_session.add(booking)
    db_session.commit()
    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Update the booking's status
    url = f"/bookings/{booking.id}/status"
    response = client.patch(url, json={"status": "completed"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == booking.id
    assert data["status"] == "completed"
    # Verify in database
    updated = db_session.get(Booking, booking.id)
    assert updated.status == "completed"

def test_update_booking_status_not_found(client, db_session):
    # Create a user and authenticate
    user = User(email="updbook2@example.com", full_name="Update Booker2", hashed_password=hash_password("bookupd2"))
    db_session.add(user)
    db_session.commit()
    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Attempt to update a non-existent booking
    response = client.patch("/bookings/999/status", json={"status": "cancelled"}, headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Booking not found"

def test_delete_booking_not_found(client, db_session):
    # Create a user and authenticate
    user = User(email="delbook@example.com", full_name="Delete Booker", hashed_password=hash_password("bookdel"))
    db_session.add(user)
    db_session.commit()
    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Attempt to delete a non-existent booking
    response = client.delete("/bookings/999", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Booking not found"

def test_delete_booking_success(client, db_session):
    # Create a user and a booking, then authenticate
    user = User(email="delbook2@example.com", full_name="Delete Booker2", hashed_password=hash_password("bookdel2"))
    db_session.add(user)
    db_session.commit()
    booking = Booking(user_id=user.id, pickup_location="X", dropoff_location="Y", time="2030-05-05T05:00:00", status="pending", price=75.0)
    db_session.add(booking)
    db_session.commit()
    token = create_jwt_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    # Delete the booking
    url = f"/bookings/{booking.id}"
    response = client.delete(url, headers=headers)
    assert response.status_code == 204
    # Verify deletion
    gone = db_session.get(Booking, booking.id)
    assert gone is None
