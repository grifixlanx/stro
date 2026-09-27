import React, { useState } from 'react';
import { FriendContact } from '../types';
import { sonarAudio } from '../utils/audio';
import { ThemeConfig } from '../utils/theme';
import {
  Users,
  UserPlus,
  Mail,
  Radio,
  Monitor,
  Smartphone,
  Trash2,
  Copy,
  Check,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface FriendsTabProps {
  friends: FriendContact[];
  userEmail: string;
  onAddFriend: (email: string, nickname?: string) => void;
  onRemoveFriend: (email: string) => void;
  onSendSignal: (targetEmail: string) => void;
  theme: ThemeConfig;
}

export const FriendsTab: React.FC<FriendsTabProps> = ({
  friends,
  userEmail,
  onAddFriend,
  onRemoveFriend,
  onSendSignal,
  theme,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const emailTrimmed = newEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setAddError('Please enter a valid email address (e.g. friend@gmail.com)');
      return;
    }

    if (emailTrimmed === userEmail.toLowerCase()) {
      setAddError("You can't add your own email as a friend!");
      return;
    }

    if (friends.some((f) => f.email.toLowerCase() === emailTrimmed)) {
      setAddError('This friend is already in your friends list.');
      return;
    }

    sonarAudio.playChirp();
    onAddFriend(emailTrimmed, newNickname.trim() || undefined);
    setNewEmail('');
    setNewNickname('');
  };

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?friendEmail=${encodeURIComponent(userEmail)}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    });
  };

  const onlineFriends = friends.filter((f) => f.isOnline);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 select-none">
      {/* Add Friend Form */}
      <div
        className="p-4 sm:p-5 rounded-xl border shadow-lg"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
        }}
      >
        <div className="flex items-center space-x-2 mb-3">
          <UserPlus className="w-4 h-4" style={{ color: theme.primary }} />
          <h3 className="font-tactical font-bold text-sm tracking-wider uppercase text-white">
            ADD FRIEND BY EMAIL
          </h3>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-7">
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Friend's email (e.g. alex@gmail.com)..."
                className="w-full bg-black/60 border rounded-lg px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none placeholder:text-white/30"
                style={{ borderColor: theme.border }}
              />
            </div>
            <div className="sm:col-span-5">
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="Nickname (optional)"
                className="w-full bg-black/60 border rounded-lg px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none placeholder:text-white/30"
                style={{ borderColor: theme.border }}
              />
            </div>
          </div>

          {addError && (
            <div className="text-xs text-red-400 font-mono bg-red-950/70 p-2 rounded border border-red-800">
              ⚠️ {addError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleCopyInvite}
              className="text-xs font-mono text-white/60 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'INVITE COPIED!' : 'Copy Invite Link'}</span>
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-white font-tactical font-bold text-xs tracking-wider transition-all shadow-md active:scale-95"
              style={{
                backgroundColor: theme.buttonBg,
                boxShadow: `0 0 15px ${theme.primaryGlow}`,
              }}
            >
              + ADD FRIEND
            </button>
          </div>
        </form>
      </div>

      {/* Friends List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2 text-xs font-tactical font-bold text-white uppercase">
            <Users className="w-4 h-4" style={{ color: theme.primary }} />
            <span>MY FRIENDS ({friends.length})</span>
          </div>
          <div className="text-[11px] font-mono font-bold" style={{ color: theme.primary }}>
            ● {onlineFriends.length} ONLINE
          </div>
        </div>

        {friends.length === 0 ? (
          <div
            className="p-8 rounded-xl border border-dashed text-center space-y-2"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.border,
            }}
          >
            <Mail className="w-8 h-8 mx-auto" style={{ color: theme.primary, opacity: 0.5 }} />
            <div className="font-tactical font-bold text-sm text-white uppercase tracking-wider">
              NO FRIENDS ADDED YET
            </div>
            <p className="text-xs font-mono text-white/50 max-w-sm mx-auto">
              Add your friend's email above. When they open STRO, they will pop up on your Sonar!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => {
              const isOnline = friend.isOnline;
              const displayName = friend.nickname || friend.email.split('@')[0];

              return (
                <div
                  key={friend.email}
                  className="p-3.5 rounded-xl border transition-all"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: isOnline ? theme.primary : theme.border,
                    boxShadow: isOnline ? `0 0 15px ${theme.primaryGlow}` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border"
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          borderColor: isOnline ? theme.primary : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        {isOnline ? (
                          <Wifi className="w-4 h-4" style={{ color: theme.primary }} />
                        ) : (
                          <WifiOff className="w-4 h-4 text-white/30" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-tactical font-bold text-sm text-white flex items-center gap-2">
                          <span className="truncate">{displayName}</span>
                          {isOnline ? (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
                              style={{
                                backgroundColor: theme.primaryGlow,
                                color: '#ffffff',
                              }}
                            >
                              ONLINE
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white/40">
                              OFFLINE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/60 font-mono mt-0.5 truncate flex items-center gap-1.5">
                          <span>{friend.email}</span>
                          {friend.deviceType && (
                            <span>• {friend.deviceType === 'phone' ? '📱' : '💻'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSendSignal(friend.email)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white font-tactical font-bold text-xs tracking-wider transition-all active:scale-95"
                        style={{
                          backgroundColor: theme.buttonBg,
                          boxShadow: `0 0 12px ${theme.primaryGlow}`,
                        }}
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>FLASH RED</span>
                      </button>

                      <button
                        onClick={() => onRemoveFriend(friend.email)}
                        className="p-2 rounded-lg bg-black/40 hover:bg-black/70 text-white/40 hover:text-red-400 border transition-colors"
                        style={{ borderColor: theme.border }}
                        title="Remove friend"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
