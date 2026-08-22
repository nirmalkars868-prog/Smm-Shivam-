import React, { useEffect, useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  X,
  Sparkles,
  Music,
  Radio,
  ChevronDown,
  ChevronUp,
  Disc,
} from 'lucide-react';
import { AdminSettings } from '../../types';
import {
  startWelcomeSong,
  pauseWelcomeSong,
  resumeWelcomeSong,
  replayWelcomeSong,
  stopWelcomeSong,
  setWelcomeSongVolume,
  subscribeVoicePlayer,
  VoicePlayerState,
} from '../../lib/welcomeVoiceEngine';

interface WelcomeVoicePlayerProps {
  settings?: AdminSettings;
}

export const WelcomeVoicePlayer: React.FC<WelcomeVoicePlayerProps> = ({ settings }) => {
  const [playerState, setPlayerState] = useState<VoicePlayerState>({
    isPlaying: false,
    isPaused: false,
    hasStarted: false,
    volume: 0.95,
    title: 'SMM SHIVAM Official Voice',
    mode: 'custom_audio',
    audioUrl: '',
    currentTime: 0,
    duration: 0,
  });

  const [showModalPrompt, setShowModalPrompt] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isPlayerBarVisible, setIsPlayerBarVisible] = useState<boolean>(false);

  const isEnabled = settings?.welcomeVoiceEnabled !== false;
  const audioUrl = settings?.welcomeVoiceUrl || '';
  const voiceText = settings?.welcomeVoiceText || 'WELCOME TO SMM SHIVAM OFFICIAL';
  const volume = settings?.welcomeVoiceVolume !== undefined ? settings.welcomeVoiceVolume : 0.95;
  const playOnReload = settings?.welcomeVoicePlayOnReload !== false;
  const mode = settings?.welcomeVoiceMode || (audioUrl ? 'custom_audio' : 'tts_speech');
  const displayTitle =
    settings?.welcomeVoiceName ||
    (mode === 'custom_audio' ? 'SMM SHIVAM Official Welcome Song' : voiceText);

  // Subscribe to audio engine updates
  useEffect(() => {
    const unsubscribe = subscribeVoicePlayer((state) => {
      setPlayerState(state);
      if (state.isPlaying || state.isPaused) {
        setIsPlayerBarVisible(true);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Show welcome prompt on load / reload
  useEffect(() => {
    if (!isEnabled) {
      setShowModalPrompt(false);
      setIsPlayerBarVisible(false);
      stopWelcomeSong();
      return;
    }

    if (playOnReload) {
      // Prompt on page load/reload if audio has not started yet
      if (!playerState.isPlaying && !playerState.hasStarted) {
        const timer = setTimeout(() => {
          setShowModalPrompt(true);
        }, 400);
        return () => clearTimeout(timer);
      }
    } else {
      const hasPrompted = sessionStorage.getItem('smm_welcome_voice_prompted');
      if (!hasPrompted && !playerState.hasStarted) {
        const timer = setTimeout(() => {
          setShowModalPrompt(true);
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isEnabled, playOnReload, settings?.welcomeVoiceUrl, settings?.welcomeVoiceText]);

  // Handle Play Click on Modal
  const handleStartPlay = () => {
    sessionStorage.setItem('smm_welcome_voice_prompted', 'true');
    setShowModalPrompt(false);
    setIsPlayerBarVisible(true);

    startWelcomeSong({
      enabled: isEnabled,
      audioUrl,
      text: voiceText,
      volume,
      mode,
      name: displayTitle,
    });
  };

  // Handle Skip
  const handleSkipPrompt = () => {
    sessionStorage.setItem('smm_welcome_voice_prompted', 'true');
    setShowModalPrompt(false);
  };

  // Handle Play/Pause Toggle
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerState.isPlaying) {
      pauseWelcomeSong();
    } else if (playerState.isPaused) {
      resumeWelcomeSong();
    } else {
      startWelcomeSong({
        enabled: isEnabled,
        audioUrl,
        text: voiceText,
        volume,
        mode,
        name: displayTitle,
      });
    }
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    replayWelcomeSong();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setWelcomeSongVolume(val);
  };

  const handleClosePlayerBar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlayerBarVisible(false);
    stopWelcomeSong();
  };

  if (!isEnabled) return null;

  return (
    <>
      {/* 1. Interactive Welcome Play Popup Modal on Load / Login / Reload */}
      {showModalPrompt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
          <div className="relative w-full max-w-md bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-yellow-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-yellow-500/40 text-center overflow-hidden animate-scaleUp">
            {/* Background Ambient Glows */}
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Music Icon Badge */}
            <div className="relative mx-auto mb-5 w-20 h-20 rounded-3xl bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-300 p-0.5 shadow-xl shadow-yellow-500/40">
              <div className="w-full h-full bg-zinc-950 rounded-[22px] flex items-center justify-center text-yellow-400">
                <Music className="w-10 h-10 animate-bounce" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center text-black font-black text-xs shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            {/* Title & Brand Greeting */}
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              WELCOME TO <span className="text-yellow-400">{settings?.siteName || 'SMM SHIVAM'}</span>
            </h3>
            <p className="text-xs sm:text-sm text-yellow-400/90 font-bold uppercase tracking-wider mt-1 flex items-center justify-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
              <span>Official Welcome Song & Audio</span>
            </p>

            {/* Audio Info Card */}
            <div className="my-5 p-3.5 rounded-2xl bg-zinc-950/90 border border-yellow-500/30 text-left flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 flex-shrink-0">
                <Disc className="w-5 h-5 animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">Active Audio Track</div>
                <div className="text-xs font-bold text-white truncate">{displayTitle}</div>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
              Press the play button below to listen to the official welcome song and enter your dashboard. Background music will continue playing seamlessly while you place orders, add funds, and browse!
            </p>

            {/* Main Interactive Play Button */}
            <button
              onClick={handleStartPlay}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 hover:from-yellow-300 hover:to-amber-300 text-black font-black text-sm tracking-wide uppercase shadow-xl shadow-yellow-500/40 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-yellow-400 shadow-md">
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              </div>
              <span>PLAY WELCOME AUDIO & ENTER</span>
            </button>

            {/* Secondary Skip Option */}
            <button
              onClick={handleSkipPrompt}
              className="mt-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer font-medium"
            >
              Skip audio & continue quietly
            </button>
          </div>
        </div>
      )}

      {/* 2. Persistent Floating Mini Music Player Bar (Background Continuous Audio) */}
      {isPlayerBarVisible && (
        <div
          id="welcome-voice-persistent-bar"
          className="fixed bottom-5 right-5 z-40 animate-slideUp select-none max-w-[calc(100vw-2.5rem)]"
        >
          {isMinimized ? (
            /* Minimized Pill */
            <button
              onClick={() => setIsMinimized(false)}
              className="bg-zinc-950/95 backdrop-blur-md border border-yellow-500/50 rounded-full p-2.5 shadow-2xl shadow-yellow-500/30 flex items-center gap-2.5 text-white hover:border-yellow-400 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center text-black font-black shadow-md">
                {playerState.isPlaying ? (
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-0.5 bg-black rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2.5" />
                    <span className="w-0.5 bg-black rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-3.5" />
                    <span className="w-0.5 bg-black rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-2" />
                  </div>
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs font-bold text-yellow-400 pr-1 group-hover:underline truncate max-w-[120px]">
                {playerState.isPlaying ? 'Playing Audio' : 'Audio Paused'}
              </span>
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            </button>
          ) : (
            /* Expanded Full Floating Bar */
            <div className="bg-zinc-950/95 backdrop-blur-xl border border-yellow-500/50 rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-yellow-500/20 text-white w-80 sm:w-96 flex flex-col gap-2.5">
              {/* Top Row: Track info & Minimize/Close */}
              <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 flex-shrink-0">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase text-yellow-400 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Background Audio</span>
                    </div>
                    <div className="text-xs font-bold text-zinc-200 truncate">{playerState.title || displayTitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    title="Minimize player"
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClosePlayerBar}
                    title="Close audio"
                    className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bottom Controls: Play/Pause, Replay, Volume */}
              <div className="flex items-center justify-between gap-3">
                {/* Play / Pause / Replay Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePlay}
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black flex items-center justify-center shadow-md shadow-yellow-500/20 transition-all active:scale-90 cursor-pointer"
                    title={playerState.isPlaying ? 'Pause' : 'Play'}
                  >
                    {playerState.isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                    )}
                  </button>

                  <button
                    onClick={handleReplay}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-yellow-400 transition-colors cursor-pointer"
                    title="Replay from start"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Animated Equalizer or Paused Indicator */}
                <div className="flex-1 flex items-center justify-center px-2">
                  {playerState.isPlaying ? (
                    <div className="flex items-center gap-1 h-4">
                      <span className="w-1 bg-yellow-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
                      <span className="w-1 bg-amber-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4" />
                      <span className="w-1 bg-yellow-300 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2.5" />
                      <span className="w-1 bg-yellow-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-4" />
                      <span className="w-1 bg-amber-300 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-2" />
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-400 font-mono">Paused</span>
                  )}
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setWelcomeSongVolume(playerState.volume > 0 ? 0 : 0.95)}
                    className="text-zinc-400 hover:text-yellow-400 cursor-pointer"
                    title={playerState.volume === 0 ? 'Unmute' : 'Mute'}
                  >
                    {playerState.volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={playerState.volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                    title={`Volume: ${Math.round(playerState.volume * 100)}%`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
