import React, { useEffect, useState } from 'react';
import { SonarSignalMessage } from '../types';
import { sonarAudio } from '../utils/audio';
import { ThemeConfig } from '../utils/theme';
import { Check, X } from 'lucide-react';

interface BrightRedSonarFlashProps {
  signal: SonarSignalMessage;
  theme: ThemeConfig;
  durationSeconds?: number;
  onRespond: (signalId: string, response: string) => void;
  onDismiss: () => void;
}

export const BrightRedSonarFlash: React.FC<BrightRedSonarFlashProps> = ({
  signal,
  theme,
  durationSeconds = 12,
  onRespond,
  onDismiss,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [hasResponded, setHasResponded] = useState(false);

  // Play acoustic sound and vibrate
  useEffect(() => {
    sonarAudio.triggerSonarSignal();
    const echoTimer = setTimeout(() => {
      sonarAudio.triggerSonarSignal();
    }, 1200);

    return () => clearTimeout(echoTimer);
  }, [signal.id]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (hasResponded) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.2) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [hasResponded, onDismiss]);

  const handleAction = (resp: 'accept' | 'decline') => {
    setHasResponded(true);
    sonarAudio.playChirp();
    onRespond(signal.id, resp);
    setTimeout(() => {
      onDismiss();
    }, 400);
  };

  const senderName = signal.fromNickname || signal.fromEmail.split('@')[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md select-none overflow-hidden animate-pulse"
      style={{
        // Screen glows color according to user UI theme
        backgroundColor: `${theme.primary}33`,
        boxShadow: `inset 0 0 160px ${theme.primary}`,
      }}
    >
      {/* Background full-screen radiating glow waves in UI theme color */}
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

      {/* Small Box with ONLY green or red click buttons */}
      <div
        className="relative z-10 w-full max-w-[320px] rounded-2xl p-5 text-center shadow-2xl border-2 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.primary,
          boxShadow: `0 0 60px ${theme.primaryGlow}`,
        }}
      >
        {/* Minimal info */}
        <div>
          <div
            className="text-[10px] font-mono tracking-widest uppercase font-bold"
            style={{ color: theme.primary }}
          >
            ● INCOMING SIGNAL
          </div>
          <div className="font-tactical font-black text-xl text-white tracking-wide mt-1">
            {senderName}
          </div>
          <div className="text-[11px] font-mono text-white/50 truncate mt-0.5">
            {signal.fromEmail}
          </div>
        </div>

        {/* Small Box: ONLY Green or Red buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* GREEN BUTTON */}
          <button
            onClick={() => handleAction('accept')}
            disabled={hasResponded}
            className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-tactical font-bold text-sm tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all"
            title="Accept / Ready"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>YES</span>
          </button>

          {/* RED BUTTON */}
          <button
            onClick={() => handleAction('decline')}
            disabled={hasResponded}
            className="py-3 px-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-tactical font-bold text-sm tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
            title="Decline / Busy"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
            <span>NO</span>
          </button>
        </div>

        {/* Subtle countdown progress line */}
        <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${(timeLeft / durationSeconds) * 100}%`,
              backgroundColor: theme.primary,
            }}
          />
        </div>
      </div>
    </div>
  );
};
