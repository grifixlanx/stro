export type DeviceType = 'pc' | 'phone';

export type ThemeColor = 'red' | 'cyan' | 'green' | 'amber' | 'purple';

export interface FriendContact {
  email: string;
  nickname?: string;
  isOnline: boolean;
  deviceType?: DeviceType;
  lastSeen?: number;
  addedAt: number;
  fishDepth: number;
  fishBearing: number;
  fishSpeed: number;
  fishSize: number;
}

export interface SonarSignalMessage {
  id: string;
  fromEmail: string;
  fromNickname?: string;
  fromDevice: DeviceType;
  toEmail: string;
  timestamp: number;
  message?: string;
  ack?: boolean;
}

export interface UserProfile {
  email: string;
  nickname: string;
  deviceType: DeviceType;
  wakeLockActive: boolean;
  soundEnabled: boolean;
  themeColor: ThemeColor;
}
