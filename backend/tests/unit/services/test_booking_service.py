import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.booking import Booking
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingUpdate
from app.services import booking_service

def test_create_booking_success(db_session: Session):
    # Prepare a user for foreign key association
    user = User(email="bservice@example.com", full_name="Book Service", hashed_password="hash")
    db_session.add(user)
    db_session.commit()
    data = BookingCreate(pickup_location="LocA", destination="LocB", ride_time="2025-12-31T23:59:00")
    result = booking_service.create_booking(db_session, data)
    assert result.pickup_location == "LocA"
    assert result.destination == "LocB"
    assert result.status == "pending"
    # The booking should be persisted in the DB
    booking = db_session.query(Booking).filter_by(pickup_location="LocA").first()
    assert booking is not None
    # (If the service should set user_id, we would check booking.user_id here)

def test_list_bookings_filters_by_user(db_session: Session):
    # Create two users and their bookings
    user1 = User(email="bservice1@example.com", full_name="Booker1", hashed_password="h1")
    user2 = User(email="bservice2@example.com", full_name="Booker2", hashed_password="h2")
    db_session.add_all([user1, user2])
    db_session.commit()
    booking1 = Booking(user_id=user1.id, pickup_location="X1", dropoff_location="Y1", time="2025-01-01T00:00:00", status="pending", price=10.0)
    booking2 = Booking(user_id=user2.id, pickup_location="X2", dropoff_location="Y2", time="2025-01-02T00:00:00", status="pending", price=20.0)
    db_session.add_all([booking1, booking2])
    db_session.commit()
    result = booking_service.list_bookings(db_session, user1.id)
    # Should only return bookings for user1
    assert len(result) == 1
    assert result[0].pickup_location == "X1" and result[0].dropoff_location == "Y1"

def test_update_booking_status_success(db_session: Session):
    booking = Booking(pickup_location="U1", dropoff_location="U2", time="2030-06-01T12:00:00", status="pending", price=5.0)
    db_session.add(booking)
    db_session.commit()
    data = BookingUpdate(status="completed")
    result = booking_service.update_booking_status(db_session, booking.id, data)
    assert result.status == "completed"
    # Database should reflect the updated status
    updated = db_session.get(Booking, booking.id)
    assert updated.status == "completed"

def test_update_booking_status_not_found(db_session: Session):
    data = BookingUpdate(status="cancelled")
    with pytest.raises(HTTPException) as excinfo:
        booking_service.update_booking_status(db_session, 9999, data)
    assert excinfo.value.status_code == 404

def test_delete_booking_success(db_session: Session):
    booking = Booking(pickup_location="D1", dropoff_location="D2", time="2030-07-07T07:00:00", status="pending", price=15.0)
    db_session.add(booking)
    db_session.commit()
    booking_service.delete_booking(db_session, booking.id)
    # Booking should be removed
    gone = db_session.get(Booking, booking.id)
    assert gone is None

def test_delete_booking_not_found(db_session: Session):
    with pytest.raises(HTTPException) as excinfo:
        booking_service.delete_booking(db_session, 123456)
    assert excinfo.value.status_code == 404
