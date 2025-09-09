importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

function mask(value) {
  if (!value) return value;
  return value.length > 8
    ? value.slice(0, 4) + '...' + value.slice(-4)
    : value;
}

const config = {
  apiKey: '${VITE_FCM_API_KEY}',
  projectId: '${VITE_FCM_PROJECT_ID}',
  appId: '${VITE_FCM_APP_ID}',
  messagingSenderId: '${VITE_FCM_SENDER_ID}',
  vapidKey: '${VITE_FCM_VAPID_KEY}',
};

console.log('firebase-messaging-sw', 'FCM env variables', {
  apiKey: mask(config.apiKey),
  projectId: config.projectId,
  appId: mask(config.appId),
  senderId: mask(config.messagingSenderId),
  vapidKey: mask(config.vapidKey),
});

firebase.initializeApp(config);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      for (const client of clients) {
        client.postMessage(payload);
      }
    });
});
