// sync.js — Offline Error Handling & Auto Retry Strategy

// Create and inject the offline banner once
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.style.cssText = `
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: #EF4444;
    color: white;
    text-align: center;
    padding: 15px;
    z-index: 9999;
    font-weight: 600;
    font-size: 0.9rem;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  `;
  banner.innerHTML = `
    English: Our servers are being updated. Please try again in a few minutes.<br/>
    Hindi: सर्वर अपडेट हो रहा है। कृपया कुछ मिनट बाद प्रयास करें।<br/>
    Marathi: सर्व्हर अपडेट होत आहे। कृपया काही मिनिटांनी पुन्हा प्रयत्न करा।
  `;
  document.body.appendChild(banner);

  // Check for saved data to sync on load if online
  if (navigator.onLine) {
    retrySavedRegistrations();
  }
});

// Watch for network changes
window.addEventListener('online', retrySavedRegistrations);
window.addEventListener('offline', showOfflineBanner);

function showOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) {
    banner.style.display = 'block';
    // Remove auto-hide to keep it visible while backend is down
  }
}

function hideOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) {
    banner.style.display = 'none';
  }
}

async function isBackendOnline() {
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/health`, { timeout: 4000 });
    const data = await res.json();
    if (data.status === 'ok') {
      hideOfflineBanner();
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function checkHealthAndSubmit(submitFunction, fallbackData, type) {
  const isOnline = await isBackendOnline();
  
  if (isOnline) {
    await submitFunction();
  } else {
    showOfflineBanner();
    saveToLocal(fallbackData, type);
  }
}

function saveToLocal(data, type) {
  const pending = JSON.parse(localStorage.getItem('pending_registrations') || '[]');
  pending.push({ data, type, time: Date.now() });
  localStorage.setItem('pending_registrations', JSON.stringify(pending));
  
  // Show a clearer message to the user
  console.log('Backend offline. Saved to localStorage:', type);
}

async function retrySavedRegistrations() {
  const pending = JSON.parse(localStorage.getItem('pending_registrations') || '[]');
  if (pending.length === 0) return;

  const isOnline = await isBackendOnline();
  if (!isOnline) return;

  const remaining = [];
  
  for (const item of pending) {
    try {
      const endpoint = item.type === 'worker' ? '/api/register/worker' : '/api/register/employer';
      const res = await fetch(`${CONFIG.BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
      if (!res.ok) {
        remaining.push(item);
      }
    } catch(e) {
      remaining.push(item);
    }
  }

  if (remaining.length < pending.length) {
    console.log(`Successfully synced ${pending.length - remaining.length} saved registrations.`);
  }
  
  localStorage.setItem('pending_registrations', JSON.stringify(remaining));
}
