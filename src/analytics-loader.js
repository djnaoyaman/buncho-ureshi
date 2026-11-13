// The published GTM container connects to GA4 G-VVFMFGKXNL.
// Keep initialization external so the site's CSP needs no unsafe-inline scripts.
(function () {
  if (window.__bunchoTagLoaded) return;
  window.__bunchoTagLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('set', { allow_google_signals: false, allow_ad_personalization_signals: false });
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-W9SQSCBT';
  document.head.appendChild(script);
}());
