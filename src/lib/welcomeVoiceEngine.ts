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
}

type StateListener = (state: VoicePlayerState) => void;

let globalAudio: HTMLAudioElement | null = null;
let currentConfig: WelcomeVoiceConfig = {};
let stateListeners: Set<StateListener> = new Set();
let isSpeechActive = false;

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

// Web Audio API Majestic Welcome Chime Synthesizer
// 100% resilient - works on all browsers, iframes, mobile devices without any external network or codec dependency.
export const playWebAudioWelcomeChime = (volume: number = 0.8, onEnded?: () => void): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return false;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.8 },  // C5
      { freq: 659.25, time: 0.22, dur: 0.8 }, // E5
      { freq: 783.99, time: 0.44, dur: 1.1 }, // G5
      { freq: 1046.50, time: 0.68, dur: 1.8 }, // C6
      { freq: 1318.51, time: 0.95, dur: 2.2 }, // E6
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.1, Math.min(1, volume)) * 0.35, ctx.currentTime);
    masterGain.connect(ctx.destination);

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + time + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur + 0.1);
    });

    if (onEnded) {
      setTimeout(onEnded, 3000);
    }
    return true;
  } catch (e) {
    return false;
  }
};

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
      globalAudio.currentTime = 0;
    } catch (e) {}
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      isSpeechActive = false;
    } catch (e) {}
  }

  if (isCustomAudio) {
    const effectiveUrl =
      audioUrl && audioUrl.length > 5
        ? audioUrl
        : `/api/welcome-audio?t=${Date.now()}`;

    try {
      if (!globalAudio) {
        globalAudio = new Audio();
      }
      globalAudio.preload = 'auto';
      globalAudio.src = effectiveUrl;
      globalAudio.volume = volume;
      globalAudio.loop = false; // Plays full song smoothly in background

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
        playerState = {
          ...playerState,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
        };
        notifyListeners();
      };

      globalAudio.onerror = (e) => {
        console.warn('Audio stream error, attempting fallback track / chime without TTS speech:', e);
        if (globalAudio && globalAudio.src !== 'https://assets.mixkit.co/music/preview/mixkit-cyber-city-108.mp3') {
          globalAudio.src = 'https://assets.mixkit.co/music/preview/mixkit-cyber-city-108.mp3';
          globalAudio.play().catch(() => {
            playWebAudioWelcomeChime(volume, () => {
              playerState = { ...playerState, isPlaying: false, isPaused: false };
              notifyListeners();
            });
          });
        } else {
          playWebAudioWelcomeChime(volume, () => {
            playerState = { ...playerState, isPlaying: false, isPaused: false };
            notifyListeners();
          });
        }
      };

      const playPromise = globalAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Playback play promise notice:', err);
          // If direct autoplay blocked, do not speak TTS - trigger chime
          playWebAudioWelcomeChime(volume, () => {
            playerState = { ...playerState, isPlaying: false, isPaused: false };
            notifyListeners();
          });
        });
      }
    } catch (e) {
      console.warn('Audio engine error:', e);
      playWebAudioWelcomeChime(volume, () => {
        playerState = { ...playerState, isPlaying: false, isPaused: false };
        notifyListeners();
      });
    }
  } else {
    // Mode is explicitly set to AI TTS Speech by admin
    startTTS(text, volume, title);
  }
};

const startTTS = (text: string, volume: number, title: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    playWebAudioWelcomeChime(volume, () => {
      playerState = { ...playerState, isPlaying: false, isPaused: false };
      notifyListeners();
    });
    playerState = {
      ...playerState,
      isPlaying: true,
      isPaused: false,
      hasStarted: true,
      volume,
      title: title || 'SMM SHIVAM Welcome Chime',
      mode: 'tts_speech',
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
      playWebAudioWelcomeChime(volume, () => {
        playerState = {
          ...playerState,
          isPlaying: false,
          isPaused: false,
        };
        notifyListeners();
      });
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    playWebAudioWelcomeChime(volume, () => {
      playerState = { ...playerState, isPlaying: false, isPaused: false };
      notifyListeners();
    });
    playerState = {
      ...playerState,
      isPlaying: true,
      isPaused: false,
      hasStarted: true,
      volume,
      title: title || 'SMM SHIVAM Welcome Chime',
      mode: 'tts_speech',
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
