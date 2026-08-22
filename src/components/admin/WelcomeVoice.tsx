import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sliders,
  Music,
  FileAudio,
  Headphones,
  Link,
  Flame,
  Zap,
  Disc,
} from 'lucide-react';
import { AdminSettings } from '../../types';
import { playWebAudioWelcomeChime } from '../../lib/welcomeVoiceEngine';

interface WelcomeVoiceProps {
  settings?: AdminSettings;
  onSettingsUpdated?: () => void;
}

// Curated royalty-free, high-quality audio tracks specifically chosen for high-energy SMM panel welcome music
const CURATED_TRACKS = [
  {
    id: 'anthem-cyber',
    name: '⚡ SMM Shivam Cyber Anthem (High Energy Bass)',
    url: 'https://assets.mixkit.co/music/preview/mixkit-cyber-city-108.mp3',
    genre: 'Cyber Electronic',
    desc: 'Deep futuristic synth bass with powerful energetic build-up',
  },
  {
    id: 'tech-drive',
    name: '🔥 Viral Tech House Energy Beat',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    genre: 'Tech House',
    desc: 'Punchy club bassline that keeps users pumped and engaged',
  },
  {
    id: 'royal-cinema',
    name: '👑 Royal Grandeur Cinematic Intro',
    url: 'https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3',
    genre: 'Cinematic / Indian Royal',
    desc: 'Majestic trumpets & deep percussion for India’s #1 SMM brand',
  },
  {
    id: 'viral-trap',
    name: '🌟 Viral Social Media Trap Drop',
    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    genre: 'Hip Hop / Trap',
    desc: 'Trending Instagram/Reels style modern bass bounce',
  },
  {
    id: 'chill-lofi',
    name: '☕ Aesthetic Lo-Fi Smooth Lounge',
    url: 'https://assets.mixkit.co/music/preview/mixkit-chill-bro-494.mp3',
    genre: 'Lo-Fi Chill',
    desc: 'Relaxed, luxurious background melody for effortless browsing',
  },
];

export const WelcomeVoice: React.FC<WelcomeVoiceProps> = ({ settings, onSettingsUpdated }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(settings?.welcomeVoiceEnabled ?? true);
  const [voiceUrl, setVoiceUrl] = useState<string>(settings?.welcomeVoiceUrl || '');
  const [voiceName, setVoiceName] = useState<string>(settings?.welcomeVoiceName || '');
  const [voiceText, setVoiceText] = useState<string>(
    settings?.welcomeVoiceText || 'WELCOME TO SMM SHIVAM OFFICIAL'
  );
  const [volume, setVolume] = useState<number>(
    settings?.welcomeVoiceVolume !== undefined ? settings.welcomeVoiceVolume : 0.9
  );
  const [playOnReload, setPlayOnReload] = useState<boolean>(
    settings?.welcomeVoicePlayOnReload ?? true
  );
  const [voiceMode, setVoiceMode] = useState<'custom_audio' | 'tts_speech'>(
    (settings?.welcomeVoiceMode as 'custom_audio' | 'tts_speech') ||
      (settings?.welcomeVoiceUrl ? 'custom_audio' : 'tts_speech')
  );

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [audioSourceLoaded, setAudioSourceLoaded] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Upload & Save State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Update local state when incoming settings change
  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.welcomeVoiceEnabled ?? true);
      setVoiceUrl(settings.welcomeVoiceUrl || '');
      setVoiceName(settings.welcomeVoiceName || '');
      setVoiceText(settings.welcomeVoiceText || 'WELCOME TO SMM SHIVAM OFFICIAL');
      if (settings.welcomeVoiceVolume !== undefined) setVolume(settings.welcomeVoiceVolume);
      if (settings.welcomeVoicePlayOnReload !== undefined)
        setPlayOnReload(settings.welcomeVoicePlayOnReload);
      if (settings.welcomeVoiceMode) setVoiceMode(settings.welcomeVoiceMode as any);
    }
  }, [settings]);

  // Handle Audio Object setup
  useEffect(() => {
    if (voiceUrl && voiceMode === 'custom_audio') {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio();
      audio.src = voiceUrl;
      audio.volume = volume;
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration || 0);
        setAudioSourceLoaded(true);
      };
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime || 0);
      };
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.onerror = (e) => {
        console.warn('Audio element error for URL:', voiceUrl, e);
        setAudioSourceLoaded(false);
      };
      audioRef.current = audio;
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setDuration(0);
      setCurrentTime(0);
      setAudioSourceLoaded(false);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [voiceUrl, voiceMode]);

  // Adjust volume dynamically
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Play / Pause Audio or TTS
  const togglePlay = () => {
    if (isPlaying) {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      setIsPlaying(false);
      return;
    }

    if (voiceMode === 'custom_audio') {
      const trimmedUrl = (voiceUrl || '').trim();
      if (!trimmedUrl) {
        setStatusMsg({
          type: 'info',
          text: 'No audio track set. Please pick a curated song, upload an MP3, or switch to Studio AI Voice.',
        });
        return;
      }

      if (audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
          audioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              // Graceful fallback to Web Audio chime
              playWebAudioWelcomeChime(volume, () => setIsPlaying(false));
              setIsPlaying(true);
              setStatusMsg({
                type: 'info',
                text: 'Audio track could not be decoded. Playing synthesized chime preview.',
              });
            });
        } catch (e) {
          playWebAudioWelcomeChime(volume, () => setIsPlaying(false));
          setIsPlaying(true);
        }
      } else {
        try {
          const audio = new Audio();
          audio.src = trimmedUrl;
          audio.volume = volume;
          audio.onended = () => setIsPlaying(false);
          audio
            .play()
            .then(() => {
              audioRef.current = audio;
              setIsPlaying(true);
            })
            .catch(() => {
              playWebAudioWelcomeChime(volume, () => setIsPlaying(false));
              setIsPlaying(true);
              setStatusMsg({
                type: 'info',
                text: 'Audio track format not directly supported. Playing synthesized chime preview.',
              });
            });
        } catch (e) {
          playWebAudioWelcomeChime(volume, () => setIsPlaying(false));
          setIsPlaying(true);
        }
      }
    } else {
      // TTS Playback
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            voiceText || 'WELCOME TO SMM SHIVAM OFFICIAL'
          );
          utterance.volume = volume;
          utterance.rate = 0.95;
          utterance.pitch = 1.05;

          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const preferredVoice =
              voices.find((v) => v.lang.includes('hi') || v.lang.includes('en-IN')) ||
              voices.find((v) => v.lang.includes('en')) ||
              voices[0];

            if (preferredVoice) {
              utterance.voice = preferredVoice;
            }
          }

          utterance.onstart = () => setIsPlaying(true);
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = () => {
            setIsPlaying(false);
            playWebAudioWelcomeChime(volume, () => setIsPlaying(false));
          };

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          playWebAudioWelcomeChime(volume, () => setIsPlaying(false));
          setIsPlaying(true);
        }
      } else {
        playWebAudioWelcomeChime(volume, () => setIsPlaying(false));
        setIsPlaying(true);
      }
    }
  };

  // Handle Direct MP3/Audio File Upload with Server Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i)) {
      setStatusMsg({
        type: 'error',
        text: 'Please select a valid audio file (MP3, WAV, M4A, OGG, AAC, WebM).',
      });
      return;
    }

    if (file.size > 35 * 1024 * 1024) {
      setStatusMsg({
        type: 'error',
        text: 'File size exceeds 35MB. Please choose a smaller audio file.',
      });
      return;
    }

    setIsUploading(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        
        // Upload to server endpoint which streams as /api/welcome-audio
        const res = await fetch('/api/admin/welcome-voice/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Data,
            fileName: file.name,
            name: file.name,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to upload audio file to server');
        }

        setVoiceUrl(data.audioUrl);
        setVoiceName(file.name);
        setVoiceMode('custom_audio');
        setIsEnabled(true);

        setStatusMsg({
          type: 'success',
          text: `🎉 Song "${file.name}" uploaded & saved successfully! Click Play to test.`,
        });

        if (onSettingsUpdated) {
          onSettingsUpdated();
        }
      } catch (err: any) {
        console.error('File upload error:', err);
        setStatusMsg({
          type: 'error',
          text: err.message || 'Error processing audio file. Please retry.',
        });
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      setStatusMsg({ type: 'error', text: 'Failed to read audio file from disk.' });
    };

    reader.readAsDataURL(file);
  };

  // Select Curated Trending Track
  const handleSelectCuratedTrack = async (track: typeof CURATED_TRACKS[0]) => {
    setVoiceUrl(track.url);
    setVoiceName(track.name);
    setVoiceMode('custom_audio');
    setIsEnabled(true);

    setStatusMsg({
      type: 'success',
      text: `🎵 Selected "${track.name}". Click "Save Voice Settings" to set as official welcome song!`,
    });
  };

  // Microphone Recording
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatusMsg({
          type: 'error',
          text: 'Microphone access is not supported in this browser.',
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Audio = reader.result as string;
            const recName = `Voice_Greeting_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`;
            
            // Upload to server
            const res = await fetch('/api/admin/welcome-voice/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioData: base64Audio,
                fileName: recName,
                name: recName,
              }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              setVoiceUrl(data.audioUrl);
              setVoiceName(recName);
              setVoiceMode('custom_audio');
              setIsEnabled(true);
              setStatusMsg({
                type: 'success',
                text: '🎙️ Voice recording uploaded & saved! Click Play to preview.',
              });
              if (onSettingsUpdated) onSettingsUpdated();
            } else {
              setVoiceUrl(base64Audio);
              setVoiceName(recName);
              setVoiceMode('custom_audio');
            }
          } catch (e) {
            console.error('Error saving recording:', e);
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setStatusMsg({
        type: 'error',
        text: 'Microphone permission denied or microphone not found.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Preset TTS Greetings
  const applyPreset = (text: string) => {
    setVoiceText(text);
    setVoiceMode('tts_speech');
    setStatusMsg({
      type: 'success',
      text: `Preset applied: "${text}". Click Play to test.`,
    });
  };

  // Save Settings to Database
  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const payload = {
        welcomeVoiceEnabled: isEnabled,
        welcomeVoiceUrl: voiceMode === 'custom_audio' ? voiceUrl : '',
        welcomeVoiceName: voiceMode === 'custom_audio' ? voiceName : 'Studio TTS Speech',
        welcomeVoiceText: voiceText,
        welcomeVoiceVolume: volume,
        welcomeVoicePlayOnReload: playOnReload,
        welcomeVoiceMode: voiceMode,
      };

      const res = await fetch('/api/admin/welcome-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save Welcome Voice settings.');
      }

      setStatusMsg({
        type: 'success',
        text: '⚡ Welcome Voice & Song saved successfully! All users will now receive the popup and hear this song on opening/reloading.',
      });

      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Remove / Reset Voice
  const handleRemoveVoice = async () => {
    if (!window.confirm('Are you sure you want to remove and disable the Welcome Voice?')) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/welcome-voice', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete voice.');
      }

      setIsEnabled(false);
      setVoiceUrl('');
      setVoiceName('');
      setVoiceText('');
      setVoiceMode('tts_speech');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);

      setStatusMsg({
        type: 'success',
        text: 'Welcome Voice has been removed and disabled.',
      });

      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to remove voice.' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-yellow-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-black uppercase tracking-wider">
              <Volume2 className="w-3.5 h-3.5" />
              <span>SMM SHIVAM DYNAMIC AUDIO & MUSIC ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight flex items-center gap-3">
              <span>Welcome Voice & Song Setup</span>
              {isEnabled ? (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE FOR ALL USERS
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-bold">
                  DISABLED
                </span>
              )}
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Upload any MP3 song, select from curated viral SMM beats, or set an AI speech greeting.
              Whenever any user opens or reloads your website/panel, an interactive welcome popup will prompt them to play your song, and it will play smoothly in the background while they explore all panels, orders, and fund deposits!
            </p>
          </div>

          {/* Quick Master Toggle */}
          <div className="flex items-center gap-4 bg-black/60 p-4 rounded-2xl border border-yellow-500/20 flex-shrink-0">
            <div>
              <div className="text-xs font-bold text-slate-200">Welcome Audio</div>
              <div className="text-[11px] text-zinc-400">{isEnabled ? 'Auto-Prompt Enabled' : 'Muted / Off'}</div>
            </div>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`w-14 h-8 rounded-full transition-colors relative p-1 cursor-pointer focus:outline-none ${
                isEnabled ? 'bg-yellow-400' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-black shadow-md transition-transform flex items-center justify-center text-[10px] font-black ${
                  isEnabled ? 'translate-x-6 text-yellow-400' : 'translate-x-0 text-zinc-500'
                }`}
              >
                {isEnabled ? 'ON' : 'OFF'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium border animate-fadeIn ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/60 border-red-500/40 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-70 hover:opacity-100 uppercase font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* LIVE PREVIEW PLAYER & ACTIVE AUDIO CARD */}
      <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black flex items-center justify-center font-black shadow-lg shadow-yellow-500/20">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <span>Active Track:</span>
                <span className="text-yellow-400 font-mono text-sm">
                  {voiceMode === 'custom_audio'
                    ? voiceName || (voiceUrl ? 'Official MP3 Song' : 'None Selected')
                    : `Studio AI Voice ("${voiceText}")`}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                {voiceMode === 'custom_audio'
                  ? `Format: Audio Track • Status: ${audioSourceLoaded || voiceUrl ? 'Ready to Stream' : 'No File'}`
                  : 'Synthesized Text-To-Speech'}
              </p>
            </div>
          </div>

          {/* Player controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              type="button"
              className="px-5 py-2.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-yellow-400/20 transition-transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Audio</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black" />
                  <span>Test Play</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Waveform Visualizer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-1.5 h-10 w-full sm:w-auto overflow-hidden">
            {[40, 70, 95, 30, 85, 60, 100, 45, 80, 65, 90, 50, 75, 95, 35, 80, 60, 100, 55, 70, 85, 40].map(
              (height, idx) => (
                <div
                  key={idx}
                  style={{
                    height: isPlaying ? `${Math.max(15, (height * (idx % 3 === 0 ? 0.9 : 1.2)) % 100)}%` : '15%',
                    transition: 'height 0.15s ease-in-out',
                  }}
                  className={`w-1.5 rounded-full ${
                    isPlaying
                      ? 'bg-gradient-to-t from-yellow-500 to-amber-300 animate-pulse'
                      : 'bg-zinc-800'
                  }`}
                />
              )
            )}
            {duration > 0 && (
              <span className="text-xs font-mono text-zinc-400 ml-3">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 w-full sm:w-64 bg-zinc-900/80 px-4 py-2 rounded-xl border border-zinc-800">
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            ) : (
              <Volume2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            )}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
            <span className="text-xs font-mono font-bold text-yellow-400 w-10 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* CURATED POPULAR SMM SONGS LIBRARY */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <span>Curated SMM Viral Anthems & Background Songs</span>
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] font-bold uppercase">
                  1-Click Select
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Pick from royalty-free, high-energy tracks handpicked for social media panel websites
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {CURATED_TRACKS.map((track) => {
            const isCurrent = voiceUrl === track.url;
            return (
              <div
                key={track.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? 'bg-yellow-500/10 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Disc className={`w-4 h-4 ${isCurrent ? 'text-yellow-400 animate-spin' : 'text-zinc-500'}`} />
                      <span>{track.name}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{track.desc}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono text-yellow-400 border border-yellow-500/20 whitespace-nowrap">
                    {track.genre}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
                  <span className="text-[11px] text-zinc-500">
                    {isCurrent ? '✅ Active on Live Website' : 'Royalty Free Audio'}
                  </span>
                  <button
                    onClick={() => handleSelectCuratedTrack(track)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                        : 'bg-zinc-800 hover:bg-yellow-500/20 text-slate-200 hover:text-yellow-300 border border-zinc-700'
                    }`}
                  >
                    {isCurrent ? 'Current Song' : 'Apply Song'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* METHOD SELECTION TABS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Method 1: Upload Custom Audio File */}
        <div className="bg-zinc-950 border border-zinc-800/80 hover:border-yellow-500/40 rounded-3xl p-6 space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">1. Upload Your Own MP3 Song</h3>
              <p className="text-xs text-zinc-400">Upload your local MP3, WAV, M4A, or AAC file</p>
            </div>
          </div>

          <label className="block border-2 border-dashed border-zinc-800 hover:border-yellow-400/60 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-yellow-500/[0.02] group relative">
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            {isUploading ? (
              <div className="py-3 flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <div className="text-sm font-bold text-yellow-400">Saving & Optimizing Audio File...</div>
              </div>
            ) : (
              <>
                <FileAudio className="w-10 h-10 text-zinc-600 group-hover:text-yellow-400 mx-auto mb-3 transition-colors" />
                <div className="text-sm font-bold text-slate-200 group-hover:text-yellow-300">
                  Click or Drag & Drop MP3 File Here
                </div>
                <div className="text-xs text-zinc-500 mt-1">Supports MP3, WAV, M4A, OGG, AAC up to 35MB</div>
              </>
            )}
          </label>

          {voiceMode === 'custom_audio' && voiceUrl && (
            <div className="p-3 bg-zinc-900 rounded-xl border border-yellow-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate text-slate-200">
                <Music className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="truncate font-mono">{voiceName || 'Uploaded_Audio_Song.mp3'}</span>
              </div>
              <span className="text-emerald-400 font-bold ml-2">LOADED</span>
            </div>
          )}
        </div>

        {/* Method 2: Direct MP3 URL Input */}
        <div className="bg-zinc-950 border border-zinc-800/80 hover:border-yellow-500/40 rounded-3xl p-6 space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">2. Direct Online MP3 Link</h3>
              <p className="text-xs text-zinc-400">Paste any public MP3 link or cloud storage URL</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="url"
                value={voiceMode === 'custom_audio' && voiceUrl.startsWith('http') ? voiceUrl : ''}
                onChange={(e) => {
                  const url = e.target.value.trim();
                  setVoiceUrl(url);
                  setVoiceName('Online Audio Track');
                  setVoiceMode('custom_audio');
                  setIsEnabled(true);
                }}
                placeholder="https://example.com/my-song.mp3"
                className="w-full bg-black border border-zinc-800 focus:border-yellow-400 rounded-2xl px-4 py-3.5 text-xs font-mono text-slate-100 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              💡 Tip: You can paste direct links from Google Drive, Dropbox, Discord CDN, FreeMusicArchive, or any web audio host.
            </p>
          </div>
        </div>
      </div>

      {/* Method 3 & 4: Voice Recording & Studio AI Speech */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Method 3: Record Voice with Microphone */}
        <div className="bg-zinc-950 border border-zinc-800/80 hover:border-yellow-500/40 rounded-3xl p-6 space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">3. Record Your Own Voice</h3>
              <p className="text-xs text-zinc-400">Speak into mic and record official voice greeting</p>
            </div>
          </div>

          <div className="bg-black rounded-2xl p-5 text-center border border-zinc-900 space-y-4">
            {isRecording ? (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>RECORDING ({recordingSeconds}s)</span>
                </div>
                <div className="text-xs text-zinc-400">
                  "Welcome to SMM Shivam Official! Enjoy India's cheapest and fastest SMM services."
                </div>
                <button
                  onClick={stopRecording}
                  className="px-6 py-2.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 mx-auto shadow-lg shadow-red-500/20 cursor-pointer"
                >
                  <MicOff className="w-4 h-4" />
                  <span>Stop & Save Recording</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-zinc-400">
                  Press the button below to start recording using your device mic.
                </div>
                <button
                  onClick={startRecording}
                  className="px-6 py-2.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 mx-auto shadow-lg shadow-yellow-400/20 cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Microphone</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Method 4: AI Text-To-Speech (TTS) Customizer */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">4. Studio AI Text-To-Speech</h3>
              <p className="text-xs text-zinc-400">Type custom greeting text to synthesize voice</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={voiceText}
              onChange={(e) => {
                setVoiceText(e.target.value);
                setVoiceMode('tts_speech');
              }}
              placeholder="e.g. WELCOME TO SMM SHIVAM OFFICIAL"
              className="w-full bg-black border border-zinc-800 focus:border-yellow-400 rounded-2xl px-4 py-3 text-xs font-medium text-slate-100 focus:outline-none transition-colors"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { title: 'Official', text: 'WELCOME TO SMM SHIVAM OFFICIAL' },
                { title: 'No. 1 SMM', text: 'Welcome to India No. 1 SMM Panel, SMM Shivam!' },
                { title: 'Hindi', text: 'Namaste, SMM Shivam Official me aapka swagat hai!' },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(preset.text)}
                  className="p-2 text-left rounded-xl bg-zinc-900 hover:bg-yellow-500/10 border border-zinc-800 hover:border-yellow-500/30 text-[11px] font-medium text-slate-300 hover:text-yellow-300 transition-all cursor-pointer truncate"
                >
                  <div className="font-bold text-slate-100">{preset.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PLAYBACK RULES & SAVE ACTIONS */}
      <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-100">Playback Rule & Persistence</h4>
            <p className="text-xs text-zinc-400">
              Prompt every user on app load or reload to play this song in background uninterrupted
            </p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={playOnReload}
              onChange={(e) => setPlayOnReload(e.target.checked)}
              className="w-5 h-5 rounded-lg accent-yellow-400 cursor-pointer"
            />
            <span className="text-sm font-bold text-slate-200">Play on every page reload & login</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800">
          <button
            onClick={handleRemoveVoice}
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove Voice & Disable</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={togglePlay}
              type="button"
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-slate-200 border border-zinc-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Listen'}</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-8 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Voice Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
