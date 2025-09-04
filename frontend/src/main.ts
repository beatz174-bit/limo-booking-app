if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then(() =>
      navigator.serviceWorker.ready.then((sw) =>
        console.log('SW active:', sw.active?.state),
      ),
    );
}
