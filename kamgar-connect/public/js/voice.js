/* ═══════════════════════════════════════════
   VOICE.JS — Mitra AI Voice Assistant
   Speech Recognition + Gemini Chat + ElevenLabs TTS
   ═══════════════════════════════════════════ */

let recognition;
let currentTranscript = "";
let isRecording = false;
let conversationHistory = [];

function initVoicePanel(languageOverride) {
  const lang = languageOverride || localStorage.getItem('kamgar-lang') || 'en';
  
  const badge = document.getElementById('mitra-lang-badge');
  if (badge) {
    badge.innerText = lang === 'mr' ? 'MR' : lang === 'hi' ? 'HI' : 'EN';
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech API not supported in this browser");
    const transcript = document.getElementById('voice-transcript');
    if (transcript) transcript.innerText = "Speech API Not Supported — use text input below.";
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        currentTranscript += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    const transcript = document.getElementById('voice-transcript');
    if (transcript) transcript.innerText = currentTranscript + interim;
    
    const wave = document.getElementById('mitra-wave');
    if (wave) wave.classList.add('talking');
    const avatar = document.querySelector('.mitra-avatar');
    if (avatar) avatar.classList.add('talking');
  };

  recognition.onend = () => {
    isRecording = false;
    const wave = document.getElementById('mitra-wave');
    if (wave) wave.classList.remove('talking');
    const avatar = document.querySelector('.mitra-avatar');
    if (avatar) avatar.classList.remove('talking');
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) micBtn.classList.remove('active');
    
    if (currentTranscript.trim().length > 0) {
      sendToGemini(currentTranscript.trim(), lang);
      currentTranscript = "";
    } else {
      const transcript = document.getElementById('voice-transcript');
      if (transcript) transcript.innerText = "Tap mic to speak...";
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    isRecording = false;
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) micBtn.classList.remove('active');
    const wave = document.getElementById('mitra-wave');
    if (wave) wave.classList.remove('talking');
  };
}

async function sendToGemini(text, lang) {
  const chatHistory = document.getElementById('voice-chat-history');
  if (!chatHistory) return;
  
  // Remove welcome message if present
  const welcome = chatHistory.querySelector('.chat-welcome');
  if (welcome) welcome.remove();
  
  // User bubble
  const chatBubble = document.createElement('div');
  chatBubble.className = 'chat-bubble user';
  chatBubble.innerText = text;
  chatHistory.appendChild(chatBubble);
  
  // Mitra loading bubble
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'chat-bubble mitra loading';
  loadingBubble.innerText = lang === 'mr' ? 'टाइप करत आहे...' : lang === 'hi' ? 'टाइप कर रहा है...' : 'Typing...';
  chatHistory.appendChild(loadingBubble);
  
  chatHistory.scrollTop = chatHistory.scrollHeight;

  // Build conversation for context
  conversationHistory.push({ role: 'user', parts: [{ text }] });

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: conversationHistory.slice(-10) })
    });
    
    const data = await response.json();
    const reply = data.reply || data.error || 'Sorry, I could not understand.';
    
    loadingBubble.innerText = reply;
    loadingBubble.classList.remove('loading');
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    conversationHistory.push({ role: 'model', parts: [{ text: reply }] });
    
    playTTS(reply, lang);
  } catch(err) {
    console.error('Gemini chat error:', err);
    const errorMsg = lang === 'mr' ? 'मित्राशी संपर्क होत नाही.' : lang === 'hi' ? 'मित्रा से संपर्क नहीं हो पा रहा.' : 'Error reaching Mitra.';
    loadingBubble.innerText = errorMsg;
    loadingBubble.classList.remove('loading');
  }
}

async function playTTS(text, lang) {
  // Animate avatar while speaking
  const avatar = document.querySelector('.mitra-avatar');
  const wave = document.getElementById('mitra-wave');
  if (avatar) avatar.classList.add('talking');
  if (wave) wave.classList.add('talking');

  try {
    // For Marathi: always use Web Speech API (ElevenLabs doesn't support Marathi well)
    if (lang === 'mr') {
      throw new Error('Use Web Speech for Marathi');
    }

    const response = await fetch(`${CONFIG.BACKEND_URL}/api/assistant/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: lang })
    });
    
    if (!response.ok) throw new Error('TTS proxy fallback');
    
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      if (avatar) avatar.classList.remove('talking');
      if (wave) wave.classList.remove('talking');
    };
    audio.onerror = () => {
      if (avatar) avatar.classList.remove('talking');
      if (wave) wave.classList.remove('talking');
    };
    
    audio.play().catch(() => {
      // Silent fallback if autoplay blocked
      if (avatar) avatar.classList.remove('talking');
      if (wave) wave.classList.remove('talking');
    });
  } catch(err) {
    // Fallback to Web Speech API
    try {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.onend = () => {
        if (avatar) avatar.classList.remove('talking');
        if (wave) wave.classList.remove('talking');
      };
      synth.speak(utterance);
    } catch(synthErr) {
      // Final silent fallback
      if (avatar) avatar.classList.remove('talking');
      if (wave) wave.classList.remove('talking');
    }
  }
}

// Handle text input submission
function handleTextSubmit() {
  const input = document.getElementById('voice-text-input');
  if (!input) return;
  const text = input.value.trim();
  if (text.length === 0) return;
  
  input.value = '';
  const lang = localStorage.getItem('kamgar-lang') || 'en';
  sendToGemini(text, lang);
}

// UI bindings
document.addEventListener('DOMContentLoaded', () => {
  const micFab = document.getElementById('voice-fab');
  const panel = document.getElementById('voice-panel');
  const closeBtn = document.getElementById('voice-close');
  const micBtn = document.getElementById('mic-btn');
  const textInput = document.getElementById('voice-text-input');
  const sendBtn = document.getElementById('voice-send-btn');
  
  if (micFab) {
    micFab.addEventListener('click', () => {
      if (panel) panel.classList.add('open');
      if (!recognition) initVoicePanel();
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (panel) panel.classList.remove('open');
    });
  }
  
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (!recognition) {
        initVoicePanel();
        if (!recognition) return; // Browser doesn't support
      }
      if (isRecording) {
        recognition.stop();
      } else {
        currentTranscript = "";
        const transcript = document.getElementById('voice-transcript');
        if (transcript) {
          const lang = localStorage.getItem('kamgar-lang') || 'en';
          transcript.innerText = lang === 'mr' ? 'ऐकत आहे...' : lang === 'hi' ? 'सुन रहा हूँ...' : 'Listening...';
        }
        try {
          recognition.start();
          isRecording = true;
          micBtn.classList.add('active');
          const wave = document.getElementById('mitra-wave');
          if (wave) wave.classList.add('talking');
        } catch(e) {
          console.warn('Recognition start error:', e);
        }
      }
    });
  }

  // Text input fallback
  if (sendBtn) {
    sendBtn.addEventListener('click', handleTextSubmit);
  }
  if (textInput) {
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTextSubmit();
      }
    });
  }
});
