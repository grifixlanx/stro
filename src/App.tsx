import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FriendContact, SonarSignalMessage, DeviceType, UserProfile, ThemeColor } from './types';
import { FishFinderSonar } from './components/FishFinderSonar';
import { FriendsTab } from './components/FriendsTab';
import { BrightRedSonarFlash } from './components/BrightRedSonarFlash';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { THEMES } from './utils/theme';
import { sonarAudio } from './utils/audio';
import { notificationController } from './utils/notifications';
import { wakeLockManager } from './utils/wakeLock';
import {
  Users,
  Radio,
  Monitor,
  Smartphone,
  Volume2,
  VolumeX,
  Settings,
  Sparkles,
} from 'lucide-react';

function detectDevice(): DeviceType {
  if (typeof navigator === 'undefined') return 'pc';
  const ua = navigator.userAgent;
  return /Mobi|Android|iPhone|iPad/i.test(ua) ? 'phone' : 'pc';
}

const AUTHORIZED_ADMIN_EMAIL = 'grifixlanx@gmail.com';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stro_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            deviceType: detectDevice(),
            themeColor: parsed.themeColor || 'red',
          };
        } catch {}
      }
    }
    return null; // Show login modal if not logged in
  });

  const [activeTab, setActiveTab] = useState<'sonar' | 'friends'>('sonar');
  const [selectedFriendEmail, setSelectedFriendEmail] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Removed mock example friends: starts empty!
  const [friends, setFriends] = useState<FriendContact[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stro_friends_list');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });

  // Check if invited by friend link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteEmail = params.get('friendEmail');
    if (inviteEmail && inviteEmail.includes('@')) {
      const norm = inviteEmail.trim().toLowerCase();
      setFriends((prev) => {
        if (!prev.some((f) => f.email.toLowerCase() === norm)) {
          const count = prev.length;
          const newFriend: FriendContact = {
            email: norm,
            nickname: norm.split('@')[0],
            isOnline: false,
            addedAt: Date.now(),
            fishDepth: 0.35 + ((count * 0.18) % 0.45),
            fishBearing: (count * 137.5 + 30) % 360,
            fishSpeed: 1,
            fishSize: 2,
          };
          return [...prev, newFriend];
        }
        return prev;
      });
    }
  }, []);

  // Save friends to localStorage
  useEffect(() => {
    localStorage.setItem('stro_friends_list', JSON.stringify(friends));
  }, [friends]);

  // Save profile to localStorage
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('stro_profile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  // Active theme
  const currentTheme = THEMES[userProfile?.themeColor || 'red'];

  // Realtime WebSocket & Connection
  const [isConnected, setIsConnected] = useState(false);
  const [sonarWaveActive, setSonarWaveActive] = useState(false);
  const [activeSignal, setActiveSignal] = useState<SonarSignalMessage | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const syncWatchList = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'WATCH_FRIENDS',
          payload: {
            friendEmails: friends.map((f) => f.email),
          },
        })
      );
    }
  }, [friends]);

  const connectWebSocket = useCallback(() => {
    if (!userProfile) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(
          JSON.stringify({
            type: 'REGISTER_DEVICE',
            payload: {
              email: userProfile.email,
              nickname: userProfile.nickname,
              deviceType: userProfile.deviceType,
            },
          })
        );
        syncWatchList();
      };

      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);

          switch (type) {
            case 'REGISTERED_OK': {
              syncWatchList();
              break;
            }

            case 'FRIENDS_STATUS_BATCH': {
              const statusMap = payload.statusMap || {};
              setFriends((prev) =>
                prev.map((f) => {
                  const norm = f.email.toLowerCase();
                  if (statusMap[norm]) {
                    return {
                      ...f,
                      isOnline: statusMap[norm].isOnline,
                      deviceType: statusMap[norm].deviceType || f.deviceType,
                      lastSeen: statusMap[norm].lastSeen || f.lastSeen,
                    };
                  }
                  return f;
                })
              );
              break;
            }

            case 'FRIEND_PRESENCE_CHANGED': {
              const { email, isOnline, deviceType, lastSeen } = payload;
              setFriends((prev) =>
                prev.map((f) => {
                  if (f.email.toLowerCase() === email.toLowerCase()) {
                    return {
                      ...f,
                      isOnline,
                      deviceType: deviceType || f.deviceType,
                      lastSeen: lastSeen || Date.now(),
                    };
                  }
                  return f;
                })
              );
              break;
            }

            case 'SIGNAL_RECEIVED': {
              const sig = payload as SonarSignalMessage;
              setActiveSignal(sig);
              setSonarWaveActive(true);
              sonarAudio.triggerSonarSignal();

              notificationController.showSignalNotification({
                fromEmail: sig.fromEmail,
                fromNickname: sig.fromNickname,
                deviceType: sig.fromDevice,
                message: sig.message,
                onFocus: () => {
                  window.focus();
                  setActiveSignal(sig);
                },
              });
              break;
            }

            case 'SIGNAL_SENT_ACK': {
              if (payload.isTargetOnline) {
                showToast(`🔴 Red Sonar Signal flashed on ${payload.targetEmail}'s screen!`);
              } else {
                showToast(`📡 Signal transmitted! (${payload.targetEmail} is currently offline)`);
              }
              break;
            }

            case 'SIGNAL_RESPONSE_RECEIVED': {
              showToast(`✔ ${payload.fromEmail} responded: "${payload.response.toUpperCase()}"!`);
              sonarAudio.playChirp();
              break;
            }
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connectWebSocket, 2500);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.warn('WS error:', e);
    }
  }, [userProfile, syncWatchList]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [userProfile?.email, userProfile?.deviceType, connectWebSocket]);

  useEffect(() => {
    syncWatchList();
  }, [friends, syncWatchList]);

  useEffect(() => {
    const hb = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'HEARTBEAT' }));
      }
    }, 20000);
    return () => clearInterval(hb);
  }, []);

  const handleSendSignal = (targetEmail: string) => {
    if (!userProfile) return;
    sonarAudio.triggerSonarSignal();
    setSonarWaveActive(true);
    setTimeout(() => setSonarWaveActive(false), 2500);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SEND_SIGNAL',
          payload: {
            targetEmail,
            fromEmail: userProfile.email,
            fromNickname: userProfile.nickname,
            fromDevice: userProfile.deviceType,
            message: 'Signal from STRO! Hop on!',
          },
        })
      );
    } else {
      showToast(`Signal queued...`);
    }
  };

  const handleRespondToSignal = (signalId: string, response: string) => {
    if (activeSignal && userProfile && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SIGNAL_RESPONSE',
          payload: {
            signalId,
            fromEmail: userProfile.email,
            toEmail: activeSignal.fromEmail,
            response,
          },
        })
      );
    }
  };

  const handleAddFriend = (email: string, nickname?: string) => {
    const existing = friends.find((f) => f.email.toLowerCase() === email.toLowerCase());
    if (existing) return;

    const count = friends.length;
    const newFriend: FriendContact = {
      email,
      nickname: nickname || email.split('@')[0],
      isOnline: false,
      addedAt: Date.now(),
      fishDepth: 0.35 + ((count * 0.18) % 0.45),
      fishBearing: (count * 137.5 + 30) % 360,
      fishSpeed: 1,
      fishSize: 2,
    };
    setFriends((prev) => [...prev, newFriend]);
    showToast(`Added ${email}!`);
  };

  const handleRemoveFriend = (email: string) => {
    setFriends((prev) => prev.filter((f) => f.email !== email));
    showToast(`Removed ${email}`);
  };

  const handleToggleSound = () => {
    if (!userProfile) return;
    const next = !userProfile.soundEnabled;
    sonarAudio.setSoundEnabled(next);
    setUserProfile((p) => (p ? { ...p, soundEnabled: next } : null));
  };

  const handleLogin = (email: string) => {
    const detected = detectDevice();
    const profile: UserProfile = {
      email,
      nickname: email.split('@')[0],
      deviceType: detected,
      wakeLockActive: false,
      soundEnabled: true,
      themeColor: 'red',
    };
    setUserProfile(profile);
    sonarAudio.playChirp();
  };

  const handleSignOut = () => {
    localStorage.removeItem('stro_profile');
    setUserProfile(null);
    setIsSettingsOpen(false);
  };

  const isOwner = userProfile?.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-hidden selection:bg-red-800 selection:text-white"
      style={{
        backgroundColor: currentTheme.bgDark,
        color: currentTheme.textPrimary,
      }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-4 border"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.primary,
            color: '#ffffff',
            boxShadow: `0 0 25px ${currentTheme.primaryGlow}`,
          }}
        >
          <Radio className="w-4 h-4 animate-pulse" style={{ color: currentTheme.primary }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER:
          - UP LEFT: "stro", logo, and device using
          - MIDDLE: user email
          - FAR UP RIGHT: volume and settings tab
      */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(5, 2, 4, 0.9)',
          borderColor: currentTheme.border,
        }}
      >
        {/* UP LEFT: "stro", logo, and device using */}
        <div className="flex items-center space-x-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full border shadow-md"
            style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderColor: currentTheme.primary,
              boxShadow: `0 0 10px ${currentTheme.primaryGlow}`,
            }}
          >
            <Radio className="w-4 h-4 animate-pulse" style={{ color: currentTheme.primary }} />
          </div>

          <div className="flex items-center gap-1.5">
            <h1 className="font-tactical font-black text-lg tracking-widest text-white uppercase">
              stro
            </h1>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase"
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.border,
                borderWidth: '1px',
                color: currentTheme.primary,
              }}
            >
              {userProfile?.deviceType.toUpperCase() || 'PC'}
            </span>
          </div>
        </div>

        {/* MIDDLE: User email ID */}
        {userProfile && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: currentTheme.border,
            }}
            title="Your email ID"
          >
            {userProfile.deviceType === 'phone' ? (
              <Smartphone className="w-3.5 h-3.5" style={{ color: currentTheme.primary }} />
            ) : (
              <Monitor className="w-3.5 h-3.5" style={{ color: currentTheme.primary }} />
            )}
            <span className="font-semibold text-white/90 max-w-[110px] sm:max-w-[210px] truncate">
              {userProfile.email}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 shadow-[0_0_6px_#22c55e]' : 'bg-amber-500'
              }`}
            />
          </div>
        )}

        {/* FAR UP RIGHT: Volume and Settings Tab */}
        <div className="flex items-center space-x-2">
          {/* Volume toggle */}
          <button
            onClick={handleToggleSound}
            className="p-2 rounded-lg border transition-all"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: currentTheme.border,
              color: userProfile?.soundEnabled ? currentTheme.primary : 'rgba(255,255,255,0.3)',
            }}
            title={userProfile?.soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {userProfile?.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings tab (with theme switcher and app settings) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg border transition-all hover:text-white"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: currentTheme.border,
              color: currentTheme.primary,
            }}
            title="Settings & Radar UI Color"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Tab Switcher */}
      <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-2">
        <div
          className="grid grid-cols-2 p-1 rounded-xl border gap-1 select-none"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.border,
          }}
        >
          <button
            onClick={() => setActiveTab('sonar')}
            className={`py-2 px-3 rounded-lg font-tactical font-bold text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'sonar' ? 'text-white shadow-md' : 'text-white/50 hover:text-white'
            }`}
            style={{
              backgroundColor: activeTab === 'sonar' ? currentTheme.buttonBg : 'transparent',
              boxShadow: activeTab === 'sonar' ? `0 0 15px ${currentTheme.primaryGlow}` : 'none',
            }}
          >
            <Radio className="w-4 h-4" />
            <span>SONAR SCOPE</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`py-2 px-3 rounded-lg font-tactical font-bold text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'friends' ? 'text-white shadow-md' : 'text-white/50 hover:text-white'
            }`}
            style={{
              backgroundColor: activeTab === 'friends' ? currentTheme.buttonBg : 'transparent',
              boxShadow: activeTab === 'friends' ? `0 0 15px ${currentTheme.primaryGlow}` : 'none',
            }}
          >
            <Users className="w-4 h-4" />
            <span>MY FRIENDS ({friends.length})</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-3 pb-24">
        {activeTab === 'sonar' ? (
          <FishFinderSonar
            friends={friends}
            onSendSignal={handleSendSignal}
            selectedFriendEmail={selectedFriendEmail}
            onSelectFriend={(f) => setSelectedFriendEmail(f.email)}
            sonarWaveActive={sonarWaveActive}
            theme={currentTheme}
          />
        ) : (
          userProfile && (
            <FriendsTab
              friends={friends}
              userEmail={userProfile.email}
              onAddFriend={handleAddFriend}
              onRemoveFriend={handleRemoveFriend}
              onSendSignal={handleSendSignal}
              theme={currentTheme}
            />
          )
        )}

        {/* BOTTOM PART: Slogan "trust you dick to be pure"
            (Testing controls only shown for admin/owner email)
        */}
        <div className="mt-8 text-center space-y-2 select-none">
          <p className="font-tactical font-bold text-xs tracking-widest text-white/50 uppercase">
            "trust you dick to be pure"
          </p>

          {/* Testing strip only for the admin/owner */}
          {isOwner && (
            <div className="pt-2 flex items-center justify-center gap-3 text-[11px] font-mono text-white/30">
              <span>[Developer Diagnostics]</span>
              <button
                onClick={() => {
                  const testSig: SonarSignalMessage = {
                    id: 'test_' + Date.now(),
                    fromEmail: 'squad.test@gmail.com',
                    fromNickname: 'Test Squad',
                    fromDevice: 'phone',
                    toEmail: userProfile.email,
                    timestamp: Date.now(),
                    message: 'Diagnostic red sonar test!',
                  };
                  setActiveSignal(testSig);
                }}
                className="underline hover:text-white"
              >
                Trigger Flash
              </button>
            </div>
          )}
        </div>
      </main>

      {/* FULL-SCREEN SONAR FLASH: GLOWS USER'S THEME COLOR + SMALL BOX WITH GREEN/RED */}
      {activeSignal && (
        <BrightRedSonarFlash
          signal={activeSignal}
          theme={currentTheme}
          durationSeconds={10}
          onRespond={handleRespondToSignal}
          onDismiss={() => setActiveSignal(null)}
        />
      )}

      {/* SETTINGS MODAL (with color theme picker & audio) */}
      {userProfile && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          profile={userProfile}
          onUpdateProfile={(updated) =>
            setUserProfile((prev) => (prev ? { ...prev, ...updated } : null))
          }
          onSignOut={handleSignOut}
        />
      )}

      {/* LOGIN MODAL (when first opening app, asks for email) */}
      {!userProfile && (
        <LoginModal
          onLogin={handleLogin}
          theme={currentTheme}
          defaultEmail="grifixlanx@gmail.com"
        />
      )}
    </div>
  );
}
