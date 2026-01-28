// assets/js/home.js

(function () {
  // Background animation hook
  if (window.App && typeof window.App.initBackground === "function") {
    window.App.initBackground();
  }

  // Future extension point:
  // - analytics
  // - CTA tracking
  // - intro animation
})();
