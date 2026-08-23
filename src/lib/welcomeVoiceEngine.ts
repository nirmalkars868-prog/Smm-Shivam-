// Global Singleton Audio & Song Engine for SMM SHIVAM
// Ensures uninterrupted background playback across all tab switches, orders, fund deposits, and navigation.

export interface WelcomeVoiceConfig {
  enabled?: boolean;
  audioUrl?: string;
  name?: string;
  text?: string;
  volume?: number;
  mode?: 'custom_audio' | 'tts_speech' | string;
}

export interface VoicePlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  hasStarted: boolean;
  volume: number;
  title: string;
  mode: 'custom_audio' | 'tts_speech';
  audioUrl: string;
  currentTime: number;
  duration: number;
  loadError?: string | null;
}

type StateListener = (state: VoicePlayerState) => void;

let globalAudio: HTMLAudioElement | null = null;
let currentConfig: WelcomeVoiceConfig = {};
let stateListeners: Set<StateListener> = new Set();
let isSpeechActive = false;
let retryCount = 0;

let playerState: VoicePlayerState = {
  isPlaying: false,
  isPaused: false,
  hasStarted: false,
  volume: 0.95,
  title: 'SMM SHIVAM Official Audio',
  mode: 'custom_audio',
  audioUrl: '',
  currentTime: 0,
  duration: 0,
  loadError: null,
};

const notifyListeners = () => {
  const stateCopy = { ...playerState };
  stateListeners.forEach((listener) => {
    try {
      listener(stateCopy);
    } catch (e) {
      console.error('Error in voice state listener:', e);
    }
  });
};

export const subscribeVoicePlayer = (listener: StateListener) => {
  stateListeners.add(listener);
  listener({ ...playerState });
  return () => {
    stateListeners.delete(listener);
  };
};

export const getVoicePlayerState = (): VoicePlayerState => {
  return { ...playerState };
};

// Initialize Speech synthesis voice cache
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {};
  } catch (e) {}
}

export const startWelcomeSong = (config?: WelcomeVoiceConfig) => {
  if (typeof window === 'undefined') return;

  if (config) {
    currentConfig = { ...currentConfig, ...config };
  }

  const isEnabled = currentConfig.enabled !== false;
  if (!isEnabled) {
    stopWelcomeSong();
    return;
  }

  const audioUrl = (currentConfig.audioUrl || '').trim();
  const text = (currentConfig.text || 'WELCOME TO SMM SHIVAM OFFICIAL').trim();
  const volume = currentConfig.volume !== undefined ? Math.max(0, Math.min(1, currentConfig.volume)) : 0.95;
  const isCustomAudio =
    currentConfig.mode === 'custom_audio' ||
    (currentConfig.mode !== 'tts_speech' && (audioUrl.length > 3 || Boolean(currentConfig.name)));
  const title = currentConfig.name || (isCustomAudio ? 'SMM SHIVAM Official Welcome Song' : text);

  // Stop any ongoing audio before starting
  if (globalAudio) {
    try {
      globalAudio.pause();
    } catch (e) {}
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      isSpeechActive = false;
    } catch (e) {}
  }

  if (isCustomAudio) {
    let effectiveUrl = audioUrl;
    if (!effectiveUrl || effectiveUrl.length < 5) {
      effectiveUrl = `/api/welcome-audio?t=${Date.now()}`;
    }

    try {
      if (!globalAudio) {
        globalAudio = new Audio();
      }
      retryCount = 0;
      globalAudio.preload = 'auto';
      globalAudio.src = effectiveUrl;
      globalAudio.volume = volume;
      globalAudio.loop = true; // Loops background music so it never stops abruptly

      globalAudio.onplay = () => {
        playerState = {
          ...playerState,
          isPlaying: true,
          isPaused: false,
          hasStarted: true,
          volume,
          title,
          mode: 'custom_audio',
          audioUrl: effectiveUrl,
          loadError: null,
        };
        notifyListeners();
      };

      globalAudio.onpause = () => {
        if (globalAudio && !globalAudio.ended) {
          playerState = { ...playerState, isPlaying: false, isPaused: true };
          notifyListeners();
        }
      };

      globalAudio.ontimeupdate = () => {
        if (globalAudio) {
          playerState = {
            ...playerState,
            currentTime: globalAudio.currentTime || 0,
            duration: globalAudio.duration || 0,
          };
          notifyListeners();
        }
      };

      globalAudio.onended = () => {
        // If not looping, mark as ended
        playerState = {
          ...playerState,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
        };
        notifyListeners();
      };

      globalAudio.onerror = (e) => {
        console.warn('Audio stream error on URL:', effectiveUrl, e);
        if (retryCount === 0 && effectiveUrl !== '/api/welcome-audio') {
          retryCount++;
          if (globalAudio) {
            globalAudio.src = `/api/welcome-audio?t=${Date.now()}`;
            globalAudio.play().catch(() => {});
          }
        } else {
          playerState = {
            ...playerState,
            isPlaying: false,
            isPaused: false,
            loadError: 'Failed to stream audio file',
          };
          notifyListeners();
        }
      };

      const playPromise = globalAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play notice (user interaction required):', err?.message || err);
          // Keep state ready so when user interacts or clicks it plays instantly
          playerState = {
            ...playerState,
            isPlaying: false,
            isPaused: false,
            hasStarted: false,
            title,
            mode: 'custom_audio',
            audioUrl: effectiveUrl,
          };
          notifyListeners();
        });
      }
    } catch (e) {
      console.warn('Audio engine start error:', e);
      playerState = {
        ...playerState,
        isPlaying: false,
        isPaused: false,
        loadError: 'Audio playback failed',
      };
      notifyListeners();
    }
  } else {
    // Mode is explicitly set to AI TTS Speech by admin
    startTTS(text, volume, title);
  }
};

const startTTS = (text: string, volume: number, title: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    playerState = {
      ...playerState,
      isPlaying: false,
      isPaused: false,
      loadError: 'Text to speech not supported',
    };
    notifyListeners();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const selectedVoice =
        voices.find((v) => v.lang.includes('hi') || v.lang.includes('en-IN') || v.name.toLowerCase().includes('india')) ||
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.default)) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onstart = () => {
      isSpeechActive = true;
      playerState = {
        ...playerState,
        isPlaying: true,
        isPaused: false,
        hasStarted: true,
        volume,
        title,
        mode: 'tts_speech',
        loadError: null,
      };
      notifyListeners();
    };

    utterance.onend = () => {
      isSpeechActive = false;
      playerState = {
        ...playerState,
        isPlaying: false,
        isPaused: false,
      };
      notifyListeners();
    };

    utterance.onerror = () => {
      isSpeechActive = false;
      playerState = {
        ...playerState,
        isPlaying: false,
        isPaused: false,
        loadError: 'TTS playback error',
      };
      notifyListeners();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('TTS Speech error:', err);
    playerState = {
      ...playerState,
      isPlaying: false,
      isPaused: false,
      loadError: 'TTS Speech failed',
    };
    notifyListeners();
  }
};

export const pauseWelcomeSong = () => {
  if (globalAudio && !globalAudio.paused) {
    try {
      globalAudio.pause();
    } catch (e) {}
  }
  if (isSpeechActive && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.pause();
    } catch (e) {}
  }
  playerState = { ...playerState, isPlaying: false, isPaused: true };
  notifyListeners();
};

export const resumeWelcomeSong = () => {
  if (globalAudio && globalAudio.paused && globalAudio.src) {
    try {
      globalAudio.play().catch(() => {});
    } catch (e) {}
    playerState = { ...playerState, isPlaying: true, isPaused: false };
    notifyListeners();
  } else if (isSpeechActive && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch (e) {}
    playerState = { ...playerState, isPlaying: true, isPaused: false };
    notifyListeners();
  } else {
    startWelcomeSong();
  }
};

export const replayWelcomeSong = () => {
  if (globalAudio) {
    try {
      globalAudio.currentTime = 0;
    } catch (e) {}
  }
  startWelcomeSong();
};

export const stopWelcomeSong = () => {
  if (globalAudio) {
    try {
      globalAudio.pause();
      globalAudio.currentTime = 0;
    } catch (e) {}
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      isSpeechActive = false;
    } catch (e) {}
  }
  playerState = {
    ...playerState,
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
  };
  notifyListeners();
};

export const setWelcomeSongVolume = (vol: number) => {
  const cleanVol = Math.max(0, Math.min(1, vol));
  if (globalAudio) {
    globalAudio.volume = cleanVol;
  }
  playerState = { ...playerState, volume: cleanVol };
  notifyListeners();
};
