import React, { useEffect, useRef, useState } from 'react';
import { FriendContact } from '../types';
import { sonarAudio } from '../utils/audio';
import { ThemeConfig } from '../utils/theme';
import { Radio, Crosshair, Send, Monitor, Smartphone, AlertCircle } from 'lucide-react';

interface FishFinderSonarProps {
  friends: FriendContact[];
  onSendSignal: (targetEmail: string) => void;
  onSelectFriend?: (friend: FriendContact) => void;
  selectedFriendEmail?: string | null;
  sonarWaveActive?: boolean;
  theme: ThemeConfig;
}

export const FishFinderSonar: React.FC<FishFinderSonarProps> = ({
  friends,
  onSendSignal,
  onSelectFriend,
  selectedFriendEmail,
  sonarWaveActive = false,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredEmail, setHoveredEmail] = useState<string | null>(null);
  const [activeSelectedEmail, setActiveSelectedEmail] = useState<string | null>(
    selectedFriendEmail || null
  );

  // ONLY online friends pop up in the circle
  const onlineFriends = friends.filter((f) => f.isOnline);

  const onlineFriendsRef = useRef(onlineFriends);
  onlineFriendsRef.current = onlineFriends;

  const sonarWaveRef = useRef(sonarWaveActive);
  sonarWaveRef.current = sonarWaveActive;

  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Sync prop changes
  useEffect(() => {
    if (selectedFriendEmail) {
      setActiveSelectedEmail(selectedFriendEmail);
    } else if (activeSelectedEmail && !onlineFriends.some((f) => f.email === activeSelectedEmail)) {
      setActiveSelectedEmail(null);
    }
  }, [selectedFriendEmail, onlineFriends, activeSelectedEmail]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let sweepAngle = 0;
    const ripples: { r: number; maxR: number; alpha: number }[] = [];

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(centerX, centerY) - 15;
      const currentTheme = themeRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Deep Radar Scope Gradient Background
      const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, maxRadius);
      grad.addColorStop(0, currentTheme.bgDark);
      grad.addColorStop(0.7, currentTheme.bgDark);
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer Bezel Ring
      ctx.strokeStyle = currentTheme.primary;
      ctx.lineWidth = 2;
      ctx.shadowColor = currentTheme.primary;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Clean normal concentric circles inside (no depth marks)
      [0.33, 0.66, 1.0].forEach((ratio) => {
        const r = maxRadius * ratio;
        ctx.strokeStyle = currentTheme.primary;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // Crosshairs
      ctx.strokeStyle = currentTheme.primary;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Sonar Transducer expanding waves on active signal
      if (sonarWaveRef.current && Math.random() < 0.15) {
        ripples.push({ r: 5, maxR: maxRadius, alpha: 0.9 });
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        rip.r += 3;
        rip.alpha -= 0.02;
        if (rip.alpha <= 0 || rip.r >= rip.maxR) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = currentTheme.primary;
        ctx.globalAlpha = rip.alpha;
        ctx.lineWidth = 2;
        ctx.shadowColor = currentTheme.primary;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, rip.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      }

      // FULL CIRCLE SWEEPING SONAR LINE (moves a full 360 circle continuously)
      sweepAngle = (sweepAngle + 0.025) % (Math.PI * 2);

      // Sweeping phosphor fade trail (360 degree sweep)
      const sweepSegments = 24;
      const sweepArc = Math.PI * 0.45; // trail arc
      for (let s = 0; s < sweepSegments; s++) {
        const frac = s / sweepSegments;
        const a1 = sweepAngle - (sweepArc * (1 - frac));
        const a2 = sweepAngle - (sweepArc * (1 - (s + 1) / sweepSegments));
        ctx.fillStyle = currentTheme.primary;
        ctx.globalAlpha = Math.pow(frac, 2.2) * 0.28;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxRadius - 2, a1, a2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Full circle sweeping lead beam ray
      ctx.strokeStyle = currentTheme.primary;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = currentTheme.primary;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(sweepAngle) * (maxRadius - 2),
        centerY + Math.sin(sweepAngle) * (maxRadius - 2)
      );
      ctx.stroke();
      ctx.shadowBlur = 0;

      // DRAW ONLY ONLINE FRIENDS (Only when online will friend pop up in circle)
      const currOnlineFriends = onlineFriendsRef.current;
      currOnlineFriends.forEach((friend, idx) => {
        const baseAngle = ((friend.fishBearing || (idx * 137.5 + 40)) * Math.PI) / 180;
        const dist = (friend.fishDepth || (0.35 + ((idx * 0.2) % 0.45))) * maxRadius;
        const fx = centerX + Math.cos(baseAngle) * dist;
        const fy = centerY + Math.sin(baseAngle) * dist;

        const isHovered = hoveredEmail === friend.email;
        const isSelected = activeSelectedEmail === friend.email;

        // Selection / Hover Target Reticle
        if (isSelected || isHovered) {
          ctx.strokeStyle = currentTheme.primary;
          ctx.lineWidth = 1.8;
          ctx.shadowColor = currentTheme.primary;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(fx, fy, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Radar Blip
        ctx.fillStyle = currentTheme.primary;
        ctx.shadowColor = currentTheme.primary;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(fx, fy, isSelected ? 6.5 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Clean text label for online friend
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Chakra Petch", sans-serif';
        const labelText = friend.nickname || friend.email.split('@')[0];
        ctx.fillText(labelText, fx, fy - 12);

        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = currentTheme.textPrimary;
        const devText = friend.deviceType === 'phone' ? 'PHONE' : 'PC';
        ctx.fillText(`ONLINE [${devText}]`, fx, fy + 16);
      });

      // Center Sonar Transducer Hub
      ctx.fillStyle = currentTheme.primary;
      ctx.shadowColor = currentTheme.primary;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [onlineFriends, hoveredEmail, activeSelectedEmail, theme]);

  // Click handler on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 15;

    const clicked = onlineFriends.find((f, idx) => {
      const baseAngle = ((f.fishBearing || (idx * 137.5 + 40)) * Math.PI) / 180;
      const dist = (f.fishDepth || (0.35 + ((idx * 0.2) % 0.45))) * maxRadius;
      const fx = centerX + Math.cos(baseAngle) * dist;
      const fy = centerY + Math.sin(baseAngle) * dist;
      return Math.hypot(x - fx, y - fy) < 24;
    });

    if (clicked) {
      setActiveSelectedEmail(clicked.email);
      if (onSelectFriend) onSelectFriend(clicked);
      sonarAudio.playChirp();
    } else {
      setActiveSelectedEmail(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 15;

    const hovered = onlineFriends.find((f, idx) => {
      const baseAngle = ((f.fishBearing || (idx * 137.5 + 40)) * Math.PI) / 180;
      const dist = (f.fishDepth || (0.35 + ((idx * 0.2) % 0.45))) * maxRadius;
      const fx = centerX + Math.cos(baseAngle) * dist;
      const fy = centerY + Math.sin(baseAngle) * dist;
      return Math.hypot(x - fx, y - fy) < 24;
    });

    setHoveredEmail(hovered ? hovered.email : null);
  };

  const activeFriend = onlineFriends.find((f) => f.email === activeSelectedEmail);

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Telemetry Header Line: "Sonar Scope" with other things on that line as it is */}
      <div
        className="w-full max-w-[460px] flex items-center justify-between px-3.5 py-2 mb-3 rounded-lg border text-xs font-mono"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          color: theme.textPrimary,
        }}
      >
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4" style={{ color: theme.primary }} />
          <span className="font-tactical font-bold uppercase tracking-wider text-white">
            SONAR SCOPE
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="font-bold" style={{ color: theme.primary }}>
            ● {onlineFriends.length} ONLINE
          </span>
          <span className="text-white/40">
            ○ {friends.length - onlineFriends.length} OFFLINE
          </span>
        </div>
      </div>

      {/* Main Sonar Scope Canvas (Clean normal circles, 360 sweeping line) */}
      <div
        className="relative w-full max-w-[440px] aspect-square rounded-full p-1 bg-black/70 shadow-2xl"
        style={{ boxShadow: `0 0 40px ${theme.primaryGlow}` }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair rounded-full"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredEmail(null)}
        />
        <div className="absolute inset-0 rounded-full crt-scanlines opacity-30 pointer-events-none" />

        {/* When no online friends in radar */}
        {onlineFriends.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <Radio className="w-8 h-8 animate-pulse mb-2" style={{ color: theme.primary, opacity: 0.5 }} />
            <div className="font-tactical text-xs text-white/80 font-bold uppercase tracking-widest">
              SCANNING FREQUENCIES
            </div>
            <div className="text-[10px] text-white/40 font-mono mt-1 max-w-[200px]">
              Friends pop up here automatically when they come online.
            </div>
          </div>
        )}
      </div>

      {/* ONLY when a friend in the sonar is online and someone clicks them will they appear at bottom */}
      {activeFriend && (
        <div
          className="w-full max-w-[460px] mt-4 p-4 rounded-xl border-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.primary,
            boxShadow: `0 0 30px ${theme.primaryGlow}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center border"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderColor: theme.primary,
                }}
              >
                <Radio className="w-5 h-5" style={{ color: theme.primary }} />
              </div>
              <div>
                <div className="font-tactical font-bold text-base text-white flex items-center gap-2">
                  <span>{activeFriend.nickname || activeFriend.email.split('@')[0]}</span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded font-bold"
                    style={{
                      backgroundColor: theme.primaryGlow,
                      color: '#ffffff',
                    }}
                  >
                    ONLINE
                  </span>
                </div>
                <div className="text-xs font-mono text-white/70 flex items-center gap-2 mt-0.5">
                  <span>{activeFriend.email}</span>
                  <span>• {activeFriend.deviceType === 'phone' ? '📱 Mobile' : '💻 PC'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Flash friend's screen bright red */}
          <button
            onClick={() => onSendSignal(activeFriend.email)}
            className="w-full mt-3.5 py-3 px-4 rounded-xl font-tactical font-bold text-sm tracking-wider text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            style={{
              backgroundColor: theme.buttonBg,
              boxShadow: `0 0 25px ${theme.primaryGlow}`,
            }}
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>FLASH {activeFriend.nickname || 'FRIEND'} BRIGHT RED</span>
          </button>
        </div>
      )}
    </div>
  );
};
