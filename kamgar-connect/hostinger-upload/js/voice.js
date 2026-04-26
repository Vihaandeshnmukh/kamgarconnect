let recognition;
let currentTranscript = "";
let isRecording = false;

function initVoicePanel(languageOverride) {
  const lang = languageOverride || localStorage.getItem('kamgar-lang') || 'en';
  
  document.getElementById('mitra-lang-badge').innerText = lang === 'mr' ? '🟠' : lang === 'hi' ? '🇮🇳' : '🇬🇧';
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech API not supported in this browser");
    document.getElementById('voice-transcript').innerText = "Speech API Not Supported";
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
    document.getElementById('voice-transcript').innerText = currentTranscript + interim;
    document.getElementById('mitra-wave').classList.add('talking');
  };

  recognition.onend = () => {
    isRecording = false;
    document.getElementById('mitra-wave').classList.remove('talking');
    document.getElementById('mic-btn').classList.remove('active');
    
    if (currentTranscript.trim().length > 0) {
      sendToGemini(currentTranscript.trim(), lang);
      currentTranscript = "";
    } else {
      document.getElementById('voice-transcript').innerText = "Tap mic to speak...";
    }
  };
}

async function sendToGemini(text, lang) {
  const chatHistory = document.getElementById('voice-chat-history');
  
  const chatBubble = document.createElement('div');
  chatBubble.className = 'chat-bubble user';
  chatBubble.innerText = text;
  chatHistory.appendChild(chatBubble);
  
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'chat-bubble mitra loading';
  loadingBubble.innerText = 'Typing...';
  chatHistory.appendChild(loadingBubble);
  
  chatHistory.scrollTop = chatHistory.scrollHeight;

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: [] })
    });
    
    const data = await response.json();
    loadingBubble.innerText = data.reply;
    loadingBubble.classList.remove('loading');
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    playTTS(data.reply, lang);
  } catch(err) {
    loadingBubble.innerText = "Error reaching Mitra.";
    loadingBubble.classList.remove('loading');
  }
}

async function playTTS(text, lang) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/assistant/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: lang })
    });
    
    if (!response.ok) throw new Error('Proxy fallback');
    
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    new Audio(audioUrl).play();
  } catch(err) {
    // Fallback to Web Speech API
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    synth.speak(utterance);
  }
}

// UI bindings
document.addEventListener('DOMContentLoaded', () => {
  const micFab = document.getElementById('voice-fab');
  const panel = document.getElementById('voice-panel');
  const closeBtn = document.getElementById('voice-close');
  const micBtn = document.getElementById('mic-btn');
  
  if(micFab) {
    micFab.addEventListener('click', () => {
      panel.classList.add('open');
      if(!recognition) initVoicePanel();
    });
  }
  
  if(closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
    });
  }
  
  if(micBtn) {
    micBtn.addEventListener('click', () => {
      if(!recognition) return;
      if(isRecording) {
        recognition.stop();
      } else {
        currentTranscript = "";
        document.getElementById('voice-transcript').innerText = "Listening...";
        recognition.start();
        isRecording = true;
        micBtn.classList.add('active');
        document.getElementById('mitra-wave').classList.add('talking');
      }
    });
  }
});
