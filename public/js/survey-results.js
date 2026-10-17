let refreshingResults = false;
setInterval(async () => {
  if (document.visibilityState !== 'visible' || refreshingResults) return;
  refreshingResults = true;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('submitted');
    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) return;
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    const updated = page.querySelector('#live-survey-results')?.closest('section');
    const current = document.querySelector('#live-survey-results')?.closest('section');
    if (updated && current) current.replaceWith(updated);
  } catch {
    // Keep the last successful results when the network is unavailable.
  } finally {
    refreshingResults = false;
  }
}, 30000);
