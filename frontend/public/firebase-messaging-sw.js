self.addEventListener('push', event => {
  const payload = event.data?.json() ?? {};
  const msg = payload.data || payload;
  const notificationMap = {
    NEW_BOOKING: {
      title: 'New booking',
      body: 'You have a new booking',
    },
    CONFIRMATION: {
      title: 'Booking confirmed',
      body: 'Your booking has been confirmed',
    },
    LEAVE_NOW: {
      title: 'Time to leave',
      body: 'Please leave now for your ride',
    },
    ON_THE_WAY: {
      title: 'Driver on the way',
      body: 'Your driver is on the way',
    },
    ARRIVED_PICKUP: {
      title: 'Driver arrived',
      body: 'Your driver has arrived at the pickup location',
    },
    STARTED: {
      title: 'Ride started',
      body: 'Your ride has started',
    },
    ARRIVED_DROPOFF: {
      title: 'Arrived at dropoff',
      body: 'You have arrived at your destination',
    },
    COMPLETED: {
      title: 'Ride completed',
      body: 'Your ride is complete',
    },
  };

  console.log(msg);

  const lookup = msg.type ? notificationMap[msg.type] : undefined;
  const title = msg.title || (lookup && lookup.title) || 'Notification';
  const body = msg.body || (lookup && lookup.body);
  const options = {};
  if (body) options.body = body;
  event.waitUntil(self.registration.showNotification(title, options));
});
