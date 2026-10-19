// FlowVeo Identity Masker
// Dynamically strips and obscures Google user identities on labs.google

(function() {
  let activeState = {
    serverName: 'Server 1',
    userCredits: 25000,
    connected: true
  };

  function updateBadge() {
    let badge = document.getElementById('flowveo-header-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'flowveo-header-badge';
      badge.className = 'flowveo-header-badge';
      
      // Position fixed at top right if header container not found
      badge.style.position = 'fixed';
      badge.style.top = '12px';
      badge.style.right = '20px';
      document.body.appendChild(badge);
    }

    badge.innerHTML = `
      <span class="flowveo-status-dot"></span>
      <span>FlowDeck • ${activeState.serverName}</span>
      <span class="flowveo-credits-pill">${activeState.userCredits.toLocaleString()} cr</span>
    `;

    badge.title = 'FlowDeck Protected Session Active. Underlying Google Account identity protected.';
  }

  function scrubAccountElements() {
    // Look for Google account avatars or text elements containing @gmail.com
    const elements = document.querySelectorAll('button, div, span, img, a');
    elements.forEach(el => {
      // If element contains an email address, hide it
      if (el.textContent && /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(el.textContent)) {
        if (!el.id.includes('flowveo')) {
          el.style.display = 'none';
        }
      }
      
      // If element has Google account tooltips or titles
      const label = el.getAttribute('aria-label') || el.getAttribute('title') || '';
      if (label.toLowerCase().includes('google account') || label.toLowerCase().includes('switch account')) {
        el.style.display = 'none';
      }
    });
  }

  // Fetch initial state from extension storage
  if (chrome?.storage?.local) {
    chrome.storage.local.get(['systemState', 'activeServerName', 'userCreditBalance'], (data) => {
      if (data.activeServerName) activeState.serverName = data.activeServerName;
      if (data.userCreditBalance !== undefined) activeState.userCredits = data.userCreditBalance;
      updateBadge();
    });
  }

  // Listen for real-time updates from background service worker
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'FLOWVEO_STATE_UPDATE') {
        if (message.data.activeServerName) activeState.serverName = message.data.activeServerName;
        if (message.data.userCreditBalance !== undefined) activeState.userCredits = message.data.userCreditBalance;
        updateBadge();
      } else if (message.type === 'SESSION_SWITCHED') {
        activeState.serverName = message.serverName;
        updateBadge();
      }
    });
  }

  // Continuously observe DOM changes to scrub newly rendered Google profile elements
  const observer = new MutationObserver(() => {
    scrubAccountElements();
    if (!document.getElementById('flowveo-header-badge')) {
      updateBadge();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Run on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scrubAccountElements();
      updateBadge();
    });
  } else {
    scrubAccountElements();
    updateBadge();
  }
})();
