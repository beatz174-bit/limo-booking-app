if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then(() => {
      navigator.serviceWorker.ready.then((sw) =>
        console.log('SW active:', sw.active?.state),
      );
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) =>
          console.log('SW registrations:', regs.map((r) => r.active?.scriptURL)),
        );
    });
}
