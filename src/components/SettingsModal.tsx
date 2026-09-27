import React, { useState } from 'react';
import { X, Volume2, VolumeX, Palette, Sun, ShieldCheck, Mail, LogOut, Check } from 'lucide-react';
import { ThemeColor, UserProfile } from '../types';
import { THEMES } from '../utils/theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSignOut: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  onSignOut,
}) => {
  const [emailInput, setEmailInput] = useState(profile.email);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  if (!isOpen) return null;

  const currentTheme = THEMES[profile.themeColor || 'red'];

  const handleSaveEmail = () => {
    if (emailInput.trim().includes('@')) {
      onUpdateProfile({ email: emailInput.trim().toLowerCase(), nickname: emailInput.trim().split('@')[0] });
      setIsEditingEmail(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border-2 shadow-2xl overflow-hidden"
        style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.border,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: currentTheme.border }}
        >
          <div className="flex items-center space-x-2">
            <h3 className="font-tactical font-bold text-base text-white tracking-wider uppercase">
              STRO SETTINGS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs font-mono">
          {/* Theme Color Selector */}
          <div className="space-y-2">
            <label className="text-white/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4" style={{ color: currentTheme.primary }} />
              <span>RADAR UI THEME COLOR</span>
            </label>
            <div className="grid grid-cols-5 gap-2 pt-1">
              {(Object.keys(THEMES) as ThemeColor[]).map((themeKey) => {
                const t = THEMES[themeKey];
                const isSelected = profile.themeColor === themeKey;
                return (
                  <button
                    key={themeKey}
                    onClick={() => onUpdateProfile({ themeColor: themeKey })}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border transition-all"
                    style={{
                      backgroundColor: isSelected ? t.primaryGlow : 'rgba(0,0,0,0.4)',
                      borderColor: isSelected ? t.primary : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 12px ${t.primary}` : 'none',
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: t.primary }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-[10px] mt-1.5 capitalize text-white/90 truncate w-full text-center">
                      {t.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound & Wake Lock */}
          <div className="space-y-2">
            <label className="text-white/80 font-bold uppercase tracking-wider">
              AUDIO & SCREEN PREFERENCES
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateProfile({ soundEnabled: !profile.soundEnabled })}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl border bg-black/40 hover:bg-black/60 transition-all text-white/90"
                style={{ borderColor: currentTheme.border }}
              >
                {profile.soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4" style={{ color: currentTheme.primary }} />
                    <span>AUDIO: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-white/40" />
                    <span>AUDIO: OFF</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onUpdateProfile({ wakeLockActive: !profile.wakeLockActive })}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl border bg-black/40 hover:bg-black/60 transition-all text-white/90"
                style={{ borderColor: currentTheme.border }}
              >
                <Sun
                  className="w-4 h-4"
                  style={{ color: profile.wakeLockActive ? currentTheme.primary : 'rgba(255,255,255,0.4)' }}
                />
                <span>{profile.wakeLockActive ? 'WAKE: ON' : 'WAKE: OFF'}</span>
              </button>
            </div>
          </div>

          {/* User Account / Email */}
          <div className="space-y-2">
            <label className="text-white/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-4 h-4" style={{ color: currentTheme.primary }} />
              <span>CURRENT IDENTIFIER EMAIL</span>
            </label>
            {isEditingEmail ? (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 bg-black/60 border rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  style={{ borderColor: currentTheme.primary }}
                />
                <button
                  onClick={handleSaveEmail}
                  className="px-3 py-1.5 rounded-lg text-white font-tactical font-bold"
                  style={{ backgroundColor: currentTheme.buttonBg }}
                >
                  SAVE
                </button>
              </div>
            ) : (
              <div
                className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border"
                style={{ borderColor: currentTheme.border }}
              >
                <span className="text-white/90 truncate">{profile.email}</span>
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className="text-[10px] text-white/60 hover:text-white underline ml-2"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Sign Out / Switch User */}
          <div className="pt-2">
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-red-900/60 bg-red-950/40 hover:bg-red-900/40 text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>SWITCH ACCOUNT / LOGOUT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
