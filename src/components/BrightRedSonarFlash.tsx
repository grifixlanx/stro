import React, { useEffect, useRef, useState } from 'react';
import { SonarSignalMessage, CallKind } from '../types';
import { sonarAudio } from '../utils/audio';
import { ThemeConfig } from '../utils/theme';
import { Check, X, Phone, Video, Gamepad2 } from 'lucide-react';

interface BrightRedSonarFlashProps {
  signal: SonarSignalMessage;
  theme: ThemeConfig;
  durationSeconds?: number;
  onRespond: (signalId: string, response: string) => void;
  onCall?: (kind: CallKind, signal: SonarSignalMessage) => void;
  onDismiss: () => void;
}

export const BrightRedSonarFlash: React.FC<BrightRedSonarFlashProps> = ({
  signal,
  theme,
  durationSeconds = 12,
  onRespond,
  onCall,
  onDismiss,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [hasResponded, setHasResponded] = useState(false);
  const [stage, setStage] = useState<'ask' | 'choose'>('ask');

  // Keep the latest onDismiss without restarting timers on every render
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Play acoustic sound and vibrate
  useEffect(() => {
    sonarAudio.triggerSonarSignal();
    const echoTimer = setTimeout(() => {
      sonarAudio.triggerSonarSignal();
    }, 1200);

    return () => clearTimeout(echoTimer);
  }, [signal.id]);

  // Stage 1: auto-dismiss countdown while waiting for YES / NO
  useEffect(() => {
    if (hasResponded) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.2) {
          clearInterval(timer);
          dismissRef.current();
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [hasResponded]);

  // Stage 2: after YES, keep the options up for 30s, then close
  useEffect(() => {
    if (stage !== 'choose') return;
    const t = setTimeout(() => dismissRef.current(), 30000);
    return () => clearTimeout(t);
  }, [stage]);

  const handleYes = () => {
    setHasResponded(true);
    setStage('choose');
    sonarAudio.playChirp();
    onRespond(signal.id, 'accept');
  };

  const handleNo = () => {
    setHasResponded(true);
    sonarAudio.playChirp();
    onRespond(signal.id, 'decline');
    setTimeout(() => dismissRef.current(), 400);
  };

  const handleReady = () => {
    sonarAudio.playChirp();
    onRespond(signal.id, 'ready');
    setTimeout(() => dismissRef.current(), 300);
  };

  const handleCall = (kind: CallKind) => {
    onCall?.(kind, signal);
    dismissRef.current();
  };

  const senderName = signal.fromNickname || signal.fromEmail.split('@')[0];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md select-none overflow-hidden ${
        stage === 'ask' ? 'animate-pulse' : ''
      }`}
      style={{
        backgroundColor: `${theme.primary}33`,
        boxShadow: `inset 0 0 160px ${theme.primary}`,
      }}
    >
      {/* Background radiating glow waves */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[85vw] h-[85vw] max-w-[650px] max-h-[650px] rounded-full animate-ping opacity-30"
          style={{
            borderColor: theme.primary,
            borderWidth: '4px',
            boxShadow: `0 0 100px ${theme.primary}`,
          }}
        />
        <div
          className="w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] rounded-full animate-ping opacity-40 [animation-delay:0.5s]"
          style={{
            borderColor: theme.primary,
            borderWidth: '2px',
          }}
        />
      </div>

      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 crt-scanlines opacity-25 pointer-events-none" />

      {/* Response box */}
      <div
        className="relative z-10 w-full max-w-[320px] rounded-2xl p-5 text-center shadow-2xl border-2 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.primary,
          boxShadow: `0 0 60px ${theme.primaryGlow}`,
        }}
      >
        {/* Sender info */}
        <div>
          <div
            className="text-[10px] font-mono tracking-widest uppercase font-bold"
            style={{ color: stage === 'ask' ? theme.primary : '#34d399' }}
          >
            {stage === 'ask' ? '● INCOMING SIGNAL' : "✔ YOU'RE IN"}
          </div>
          <div className="font-tactical font-black text-xl text-white tracking-wide mt-1">
            {senderName}
          </div>
          <div className="text-[11px] font-mono text-white/50 truncate mt-0.5">
            {signal.fromEmail}
          </div>
        </div>

        {stage === 'ask' ? (
          <>
            {/* YES / NO */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleYes}
                disabled={hasResponded}
                className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-tactical font-bold text-sm tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all"
                title="Accept"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>YES</span>
              </button>

              <button
                onClick={handleNo}
                disabled={hasResponded}
                className="py-3 px-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-tactical font-bold text-sm tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
                title="Decline / Busy"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
                <span>NO</span>
              </button>
            </div>

            {/* Countdown line */}
            <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${(timeLeft / durationSeconds) * 100}%`,
                  backgroundColor: theme.primary,
                }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Voice / Video */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => handleCall('voice')}
                className="py-3 px-3 rounded-xl active:scale-95 text-white font-tactical font-bold text-sm tracking-wider flex items-center justify-center gap-1.5 border transition-all"
                style={{
                  backgroundColor: theme.buttonBg,
                  borderColor: theme.primary,
                  boxShadow: `0 0 15px ${theme.primaryGlow}`,
                }}
              >
                <Phone className="w-4 h-4" />
                <span>VOICE</span>
              </button>

              <button
                onClick={() => handleCall('video')}
                className="py-3 px-3 rounded-xl active:scale-95 text-white font-tactical font-bold text-sm tracking-wider flex items-center justify-center gap-1.5 border transition-all"
                style={{
                  backgroundColor: theme.buttonBg,
                  borderColor: theme.primary,
                  boxShadow: `0 0 15px ${theme.primaryGlow}`,
                }}
              >
                <Video className="w-4 h-4" />
                <span>VIDEO</span>
              </button>
            </div>

            {/* Ready to play (bottom of the same box) */}
            <button
              onClick={handleReady}
              className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-tactical font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all"
            >
              <Gamepad2 className="w-5 h-5" />
              <span>READY TO PLAY</span>
            </button>

            <button
              onClick={() => dismissRef.current()}
              className="text-[11px] font-mono text-white/40 hover:text-white underline"
            >
              close
            </button>
          </>
        )}
      </div>
    </div>
  );
};