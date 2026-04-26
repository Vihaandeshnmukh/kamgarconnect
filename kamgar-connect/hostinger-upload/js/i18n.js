const dictionary = {
  "Welcome to Kamgar Connect": {
    "en": "Welcome to Kamgar Connect",
    "hi": "कामगार कनेक्ट में आपका स्वागत है",
    "mr": "कामगार कनेक्टमध्ये आपले स्वागत आहे"
  },
  "Find Workers Instantly, No Chowk Waits!": {
    "en": "Find Workers Instantly, No Chowk Waits!",
    "hi": "मज़दूरों को तुरंत खोजें, कोई चौक इंतज़ार नहीं!",
    "mr": "कामगारांना त्वरित शोधा, चौकात वाट पाहू नका!"
  },
  "Employer Signup": {
    "en": "Employer Signup",
    "hi": "नियोक्ता साइनअप",
    "mr": "मालक नोंदणी"
  },
  "Worker Signup": {
    "en": "Worker Signup",
    "hi": "मज़दूर साइनअप",
    "mr": "कामगार नोंदणी"
  },
  "I Want Workers": {
    "en": "I Want Workers",
    "hi": "मुझे मज़दूर चाहिए",
    "mr": "मला कामगार हवे आहेत"
  },
  "I Want Work": {
    "en": "I Want Work",
    "hi": "मुझे काम चाहिए",
    "mr": "मला काम हवे आहे"
  }
};

let currentLang = localStorage.getItem('kamgar-lang');

function applyTranslations(lang) {
  currentLang = lang;
  localStorage.setItem('kamgar-lang', lang);

  // Automatically parse entire DOM for exact matches
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  const nodesToUpdate = [];

  while (node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) continue;
    
    let originalText = parent.getAttribute('data-original-text');
    if (!originalText) {
      originalText = node.nodeValue.trim();
      if (dictionary[originalText]) {
        parent.setAttribute('data-original-text', originalText);
      }
    }

    if (originalText && dictionary[originalText]) {
      nodesToUpdate.push({ node, text: dictionary[originalText][lang] || originalText });
    }
  }

  nodesToUpdate.forEach(item => {
    item.node.nodeValue = item.text;
  });
}

function initLanguageGate() {
  if (currentLang) {
    applyTranslations(currentLang);
    return;
  }

  // Create Gateway Overlay
  const gate = document.createElement('div');
  gate.id = 'lang-gate';
  gate.innerHTML = `
    <div class="lang-gate-content">
      <h1 style="color:white; margin-bottom: 40px; font-size: 2rem;">Select Language</h1>
      <button class="lang-btn" onclick="selectLang('en')">
        <span class="flag">🇬🇧</span> 
        <span class="num">1</span> English
        <small>Welcome to Kamgar Connect</small>
      </button>
      <button class="lang-btn" onclick="selectLang('mr')">
        <span class="flag">🟠</span> 
        <span class="num">2</span> मराठी
        <small>कामगार कनेक्टमध्ये आपले स्वागत आहे</small>
      </button>
      <button class="lang-btn" onclick="selectLang('hi')">
        <span class="flag">🇮🇳</span> 
        <span class="num">3</span> हिंदी
        <small>कामगार कनेक्ट में आपका स्वागत है</small>
      </button>
    </div>
  `;
  document.body.appendChild(gate);

  // Keyboard support (1, 2, 3 keys)
  window.addEventListener('keydown', handleLangKey);
}

function handleLangKey(e) {
  if (e.key === '1') selectLang('en');
  if (e.key === '2') selectLang('mr');
  if (e.key === '3') selectLang('hi');
}

window.selectLang = function(lang) {
  applyTranslations(lang);
  window.removeEventListener('keydown', handleLangKey);
  
  const gate = document.getElementById('lang-gate');
  if (gate && typeof window.gsap !== 'undefined') {
    // Animate out with GSAP Wipe 
    window.gsap.to(gate, {
      opacity: 0,
      y: -50,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: () => {
        gate.remove();
        // Initialize Speech Recog if voice panel exists
        if(typeof initVoicePanel === 'function') initVoicePanel(lang);
      }
    });
  } else if (gate) {
    gate.remove();
    if(typeof initVoicePanel === 'function') initVoicePanel(lang);
  }
};

document.addEventListener('DOMContentLoaded', initLanguageGate);
