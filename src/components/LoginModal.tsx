import React, { useState } from 'react';
import { Radio, Mail, ArrowRight, Shield } from 'lucide-react';
import { ThemeConfig } from '../utils/theme';

interface LoginModalProps {
  onLogin: (email: string) => void;
  theme: ThemeConfig;
  defaultEmail?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, theme, defaultEmail = '' }) => {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setError('Please enter a valid email address to connect.');
      return;
    }
    setError('');
    onLogin(clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg select-none">
      <div
        className="relative w-full max-w-md rounded-2xl border-2 p-6 sm:p-8 shadow-2xl space-y-6"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          boxShadow: `0 0 60px ${theme.primaryGlow}`,
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center border-2 mb-1"
            style={{
              borderColor: theme.primary,
              backgroundColor: 'rgba(0,0,0,0.5)',
              boxShadow: `0 0 20px ${theme.primaryGlow}`,
            }}
          >
            <Radio className="w-7 h-7 animate-pulse" style={{ color: theme.primary }} />
          </div>
          <h1 className="font-tactical font-black text-3xl tracking-widest text-white uppercase">
            STRO
          </h1>
          <p className="text-xs font-mono text-white/60">
            RADAR SIGNAL & CONNECTIVITY SYSTEM
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" style={{ color: theme.primary }} />
              <span>ENTER YOUR EMAIL TO CONNECT</span>
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@gmail.com"
              className="w-full bg-black/60 border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none transition-all"
              style={{ borderColor: theme.border }}
            />
          </div>

          {error && (
            <div className="text-xs font-mono text-red-400 bg-red-950/60 p-2.5 rounded-lg border border-red-800">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl font-tactical font-bold text-sm tracking-wider text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              backgroundColor: theme.buttonBg,
              boxShadow: `0 0 20px ${theme.primaryGlow}`,
            }}
          >
            <span>CONNECT TO STRO</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Slogan */}
        <div className="text-center pt-2 border-t" style={{ borderColor: theme.border }}>
          <p className="text-[11px] font-mono tracking-widest text-white/40 uppercase">
            "TRUST YOU DICK TO BE PURE"
          </p>
        </div>
      </div>
    </div>
  );
};
