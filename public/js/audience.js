(() => {
  const panel = document.querySelector('[data-analytics-id]');
  if (!panel) return;
  let loaded = false;
  const id = panel.dataset.analyticsId;
  if (!/^G-[A-Z0-9]+$/.test(id)) return;
  const status = panel.querySelector('[data-analytics-status]');
  const read = () => { try { return localStorage.getItem('kei-analytics'); } catch { return null; } };
  function load() {
    if (loaded) return;
    loaded = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: window.location.origin + window.location.pathname
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.append(tag);
  }
  if (read() === 'yes') { load(); status.textContent = 'Analytics allowed.'; }
  panel.querySelectorAll('[data-analytics-choice]').forEach(button => button.addEventListener('click', () => {
    const choice = button.dataset.analyticsChoice;
    try { localStorage.setItem('kei-analytics', choice); } catch {}
    if (choice === 'yes') load();
    else {
      window['ga-disable-' + id] = true;
      if (loaded) window.location.reload();
    }
    status.textContent = choice === 'yes' ? 'Analytics allowed.' : 'Analytics declined.';
  }));
})();
