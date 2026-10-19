const API_BASE = 'https://flow-x007.onrender.com/api';

document.addEventListener('DOMContentLoaded', async () => {
  const loginView = document.getElementById('loginView');
  const controlView = document.getElementById('controlView');
  const authAlert = document.getElementById('authAlert');
  const syncStatus = document.getElementById('syncStatus');
  const syncText = document.getElementById('syncText');
  const serverSelectDropdown = document.getElementById('serverSelectDropdown');
  const userCreditAmount = document.getElementById('userCreditAmount');
  const userNameLabel = document.getElementById('userNameLabel');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const btnLaunchFlow = document.getElementById('btnLaunchFlow');
  const btnSyncCookies = document.getElementById('btnSyncCookies');
  const btnOpenDashboard = document.getElementById('btnOpenDashboard');
  const btnLogout = document.getElementById('btnLogout');
  const tabEmail = document.getElementById('tabEmail');
  const tabLicense = document.getElementById('tabLicense');
  const emailFields = document.getElementById('emailFields');
  const licenseFields = document.getElementById('licenseFields');
  const loginForm = document.getElementById('extensionLoginForm');

  let authMode = 'email';

  // Tab switching
  tabEmail.addEventListener('click', () => {
    authMode = 'email';
    tabEmail.classList.add('active');
    tabLicense.classList.remove('active');
    emailFields.style.display = 'block';
    licenseFields.style.display = 'none';
  });

  tabLicense.addEventListener('click', () => {
    authMode = 'license';
    tabLicense.classList.add('active');
    tabEmail.classList.remove('active');
    emailFields.style.display = 'none';
    licenseFields.style.display = 'block';
    document.getElementById('loginLicenseKey').value = 'FLOWDECK-ADMIN-MASTER';
  });

  // Check login state
  chrome.storage.local.get(['flowdeck_token', 'flowdeck_user', 'activeServerId', 'userCreditBalance', 'extensionConnected'], (data) => {
    if (data.flowdeck_token) {
      showControlView(data);
    } else {
      showLoginView();
    }

    if (data.extensionConnected) {
      syncText.textContent = 'Active & Sync\'ed';
      syncStatus.querySelector('.status-dot').style.backgroundColor = '#10b981';
    } else {
      syncText.textContent = 'Disconnected';
      syncStatus.querySelector('.status-dot').style.backgroundColor = '#ef4444';
    }
  });

  function showLoginView() {
    loginView.style.display = 'block';
    controlView.style.display = 'none';
  }

  function showControlView(data) {
    loginView.style.display = 'none';
    controlView.style.display = 'block';

    if (data.flowdeck_user) {
      userNameLabel.textContent = data.flowdeck_user.name || data.flowdeck_user.email;
      userRoleBadge.textContent = `${data.flowdeck_user.role?.toUpperCase() || 'PRO'} PLAN`;
    }
    if (data.activeServerId) {
      serverSelectDropdown.value = data.activeServerId;
    }
    if (data.userCreditBalance !== undefined) {
      userCreditAmount.textContent = Number(data.userCreditBalance).toLocaleString();
    }
  }

  // Handle Login submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authAlert.style.display = 'none';

    const payload = authMode === 'email'
      ? { email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value }
      : { licenseKey: document.getElementById('loginLicenseKey').value };

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (res.ok && result.success) {
        await chrome.storage.local.set({
          flowdeck_token: result.token,
          flowdeck_user: result.user,
          userCreditBalance: result.userCreditBalance,
          activeServerId: result.activeServerId
        });

        // Notify background service worker of new session
        chrome.runtime.sendMessage({
          type: 'USER_LOGGED_IN',
          token: result.token,
          user: result.user
        });

        showControlView({
          flowdeck_user: result.user,
          activeServerId: result.activeServerId,
          userCreditBalance: result.userCreditBalance
        });
      } else {
        authAlert.textContent = result.error || 'Authentication failed';
        authAlert.style.display = 'block';
      }
    } catch (err) {
      authAlert.textContent = 'Could not connect to FlowDeck backend';
      authAlert.style.display = 'block';
    }
  });

  // Handle Server Switch directly from Dropdown
  serverSelectDropdown.addEventListener('change', () => {
    const serverId = serverSelectDropdown.value;
    chrome.runtime.sendMessage({ type: 'SWITCH_SERVER', serverId }, (res) => {
      console.log('Server switched to:', serverId);
    });
  });

  // Handle Launch Flow Session
  btnLaunchFlow.addEventListener('click', () => {
    btnLaunchFlow.disabled = true;
    btnLaunchFlow.textContent = 'Injecting Session & Launching...';

    chrome.runtime.sendMessage({ type: 'OPEN_LABS_FLOW' }, () => {
      setTimeout(() => {
        btnLaunchFlow.disabled = false;
        btnLaunchFlow.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Open Authenticated Flow Session
        `;
        window.close();
      }, 700);
    });
  });

  // Handle Force Sync Cookies
  btnSyncCookies.addEventListener('click', () => {
    btnSyncCookies.disabled = true;
    btnSyncCookies.textContent = 'Syncing...';
    chrome.runtime.sendMessage({ type: 'FORCE_REFRESH_COOKIES' }, (res) => {
      setTimeout(() => {
        btnSyncCookies.disabled = false;
        btnSyncCookies.textContent = 'Sync Cookies';
        alert('Active Google session cookies successfully re-injected!');
      }, 500);
    });
  });

  // Open Web Dashboard
  btnOpenDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
    window.close();
  });

  // Handle Sign Out
  btnLogout.addEventListener('click', () => {
    chrome.storage.local.get(['flowdeck_token'], (data) => {
      if (data.flowdeck_token) {
        fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${data.flowdeck_token}` }
        }).catch(() => {});
      }
    });

    chrome.storage.local.remove(['flowdeck_token', 'flowdeck_user'], () => {
      chrome.runtime.sendMessage({ type: 'USER_LOGGED_OUT' });
      showLoginView();
    });
  });
});
