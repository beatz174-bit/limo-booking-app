importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '${VITE_FCM_API_KEY}',
  projectId: '${VITE_FCM_PROJECT_ID}',
  appId: '${VITE_FCM_APP_ID}',
  messagingSenderId: '${VITE_FCM_SENDER_ID}',
});

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
