document.addEventListener('DOMContentLoaded', async () => {
  const syncStatus = document.getElementById('syncStatus');
  const syncText = document.getElementById('syncText');
  const activeServerName = document.getElementById('activeServerName');
  const userCreditAmount = document.getElementById('userCreditAmount');
  const btnLaunchFlow = document.getElementById('btnLaunchFlow');
  const btnOpenDashboard = document.getElementById('btnOpenDashboard');

  // Load status from local storage
  chrome.storage.local.get(['systemState', 'activeServerName', 'userCreditBalance', 'extensionConnected'], (data) => {
    if (data.activeServerName) {
      activeServerName.textContent = data.activeServerName;
    }
    if (data.userCreditBalance !== undefined) {
      userCreditAmount.textContent = Number(data.userCreditBalance).toLocaleString();
    }
    if (data.extensionConnected) {
      syncText.textContent = 'Active & Sync\'ed';
      syncStatus.querySelector('.status-dot').style.backgroundColor = '#10b981';
    } else {
      syncText.textContent = 'Disconnected';
      syncStatus.querySelector('.status-dot').style.backgroundColor = '#ef4444';
    }
  });

  // Query background service worker for live status
  chrome.runtime.sendMessage({ type: 'GET_EXTENSION_STATUS' }, (res) => {
    if (res && res.connected) {
      syncText.textContent = 'Active & Sync\'ed';
      syncStatus.querySelector('.status-dot').style.backgroundColor = '#10b981';
    }
  });

  // Button: Launch Google Labs Flow session
  btnLaunchFlow.addEventListener('click', () => {
    btnLaunchFlow.disabled = true;
    btnLaunchFlow.textContent = 'Injecting Session & Launching...';

    chrome.runtime.sendMessage({ type: 'OPEN_LABS_FLOW' }, (res) => {
      setTimeout(() => {
        btnLaunchFlow.disabled = false;
        btnLaunchFlow.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Launch Authenticated Flow Session
        `;
        window.close();
      }, 800);
    });
  });

  // Button: Open FlowVeo Dashboard
  btnOpenDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
    window.close();
  });
});
