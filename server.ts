import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

interface ConnectedDevice {
  socketId: string;
  ws: WebSocket;
  email: string;
  nickname?: string;
  deviceType: 'pc' | 'phone';
  lastSeen: number;
  ip?: string;
}

// Map from email (normalized lowercase) -> Map<socketId, ConnectedDevice>
const userSessions = new Map<string, Map<string, ConnectedDevice>>();
// Track client interested friend lists: socketId -> Set of friend emails
const socketWatchLists = new Map<string, Set<string>>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUserOnline(email: string): boolean {
  const norm = normalizeEmail(email);
  const devices = userSessions.get(norm);
  if (!devices || devices.size === 0) return false;
  for (const dev of devices.values()) {
    if (dev.ws.readyState === WebSocket.OPEN) return true;
  }
  return false;
}

function getUserDeviceType(email: string): 'pc' | 'phone' | undefined {
  const norm = normalizeEmail(email);
  const devices = userSessions.get(norm);
  if (!devices || devices.size === 0) return undefined;
  // Return phone if any connected device is phone, else pc
  for (const dev of devices.values()) {
    if (dev.deviceType === 'phone') return 'phone';
  }
  return 'pc';
}

function notifyWatchersOfPresence(email: string, isOnline: boolean, deviceType?: 'pc' | 'phone') {
  const norm = normalizeEmail(email);
  const payload = JSON.stringify({
    type: 'FRIEND_PRESENCE_CHANGED',
    payload: {
      email: norm,
      isOnline,
      deviceType: deviceType || 'pc',
      lastSeen: Date.now()
    }
  });

  for (const [sId, watchedSet] of socketWatchLists.entries()) {
    if (watchedSet.has(norm)) {
      // Find ws for socketId
      for (const devs of userSessions.values()) {
        const targetDev = devs.get(sId);
        if (targetDev && targetDev.ws.readyState === WebSocket.OPEN) {
          targetDev.ws.send(payload);
        }
      }
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  const socketId = 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  let registeredEmail: string | null = null;

  ws.on('message', (raw: string) => {
    try {
      const data = JSON.parse(raw.toString());
      const { type, payload } = data;

      switch (type) {
        // Register current device by email
        case 'REGISTER_DEVICE': {
          const { email, nickname, deviceType } = payload;
          if (!email) return;

          const norm = normalizeEmail(email);
          registeredEmail = norm;

          if (!userSessions.has(norm)) {
            userSessions.set(norm, new Map());
          }

          const devMap = userSessions.get(norm)!;
          const dev: ConnectedDevice = {
            socketId,
            ws,
            email: norm,
            nickname: nickname || norm.split('@')[0],
            deviceType: deviceType === 'phone' ? 'phone' : 'pc',
            lastSeen: Date.now()
          };
          devMap.set(socketId, dev);

          // Confirmation
          ws.send(JSON.stringify({
            type: 'REGISTERED_OK',
            payload: {
              email: norm,
              socketId,
              deviceType: dev.deviceType,
              serverTime: Date.now()
            }
          }));

          // Notify friends watching this email that user is online
          notifyWatchersOfPresence(norm, true, dev.deviceType);
          break;
        }

        // Client sends list of friends' emails to watch
        case 'WATCH_FRIENDS': {
          const { friendEmails } = payload;
          if (Array.isArray(friendEmails)) {
            const watched = new Set<string>();
            const statusMap: Record<string, { isOnline: boolean; deviceType?: 'pc' | 'phone'; lastSeen: number }> = {};

            friendEmails.forEach((e: string) => {
              const norm = normalizeEmail(e);
              if (norm) {
                watched.add(norm);
                const online = isUserOnline(norm);
                statusMap[norm] = {
                  isOnline: online,
                  deviceType: online ? getUserDeviceType(norm) : undefined,
                  lastSeen: Date.now()
                };
              }
            });

            socketWatchLists.set(socketId, watched);

            ws.send(JSON.stringify({
              type: 'FRIENDS_STATUS_BATCH',
              payload: {
                statusMap
              }
            }));
          }
          break;
        }

        // Send Bright Red Sonar Signal to a friend by email
        case 'SEND_SIGNAL': {
          const { targetEmail, fromEmail, fromNickname, fromDevice, message } = payload;
          if (!targetEmail || !fromEmail) return;

          const targetNorm = normalizeEmail(targetEmail);
          const fromNorm = normalizeEmail(fromEmail);

          const signalMessage = {
            id: 'sig_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            fromEmail: fromNorm,
            fromNickname: fromNickname || fromNorm.split('@')[0],
            fromDevice: fromDevice || 'pc',
            toEmail: targetNorm,
            message: message || 'Pinging you to play! Look at your screen!',
            timestamp: Date.now()
          };

          const targetDevs = userSessions.get(targetNorm);
          let deliveredCount = 0;

          if (targetDevs && targetDevs.size > 0) {
            const outPayload = JSON.stringify({
              type: 'SIGNAL_RECEIVED',
              payload: signalMessage
            });

            for (const dev of targetDevs.values()) {
              if (dev.ws.readyState === WebSocket.OPEN) {
                dev.ws.send(outPayload);
                deliveredCount++;
              }
            }
          }

          // Acknowledge back to sender
          ws.send(JSON.stringify({
            type: 'SIGNAL_SENT_ACK',
            payload: {
              signalId: signalMessage.id,
              targetEmail: targetNorm,
              isTargetOnline: deliveredCount > 0,
              deliveredToDevices: deliveredCount,
              timestamp: Date.now()
            }
          }));
          break;
        }

        // Recipient acknowledges / accepts signal
        case 'SIGNAL_RESPONSE': {
          const { signalId, fromEmail, toEmail, response } = payload;
          const targetNorm = normalizeEmail(toEmail);
          const targetDevs = userSessions.get(targetNorm);
          if (targetDevs) {
            const outPayload = JSON.stringify({
              type: 'SIGNAL_RESPONSE_RECEIVED',
              payload: {
                signalId,
                fromEmail: normalizeEmail(fromEmail),
                response,
                timestamp: Date.now()
              }
            });
            for (const dev of targetDevs.values()) {
              if (dev.ws.readyState === WebSocket.OPEN) {
                dev.ws.send(outPayload);
              }
            }
          }
          break;
        }

        // Heartbeat
        case 'HEARTBEAT': {
          if (registeredEmail && userSessions.has(registeredEmail)) {
            const dev = userSessions.get(registeredEmail)!.get(socketId);
            if (dev) dev.lastSeen = Date.now();
          }
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          break;
        }
      }
    } catch (err) {
      console.error('WS parse error:', err);
    }
  });

  ws.on('close', () => {
    socketWatchLists.delete(socketId);
    if (registeredEmail && userSessions.has(registeredEmail)) {
      const devMap = userSessions.get(registeredEmail)!;
      devMap.delete(socketId);
      if (devMap.size === 0) {
        userSessions.delete(registeredEmail);
        notifyWatchersOfPresence(registeredEmail, false);
      }
    }
  });
});

// REST Health & Query API
app.get('/api/health', (req, res) => {
  let totalConnections = 0;
  for (const m of userSessions.values()) {
    totalConnections += m.size;
  }
  res.json({
    status: 'online',
    uniqueUsers: userSessions.size,
    totalDevices: totalConnections,
    time: Date.now()
  });
});

app.get('/api/check-user', (req, res) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const online = isUserOnline(email);
  res.json({
    email: normalizeEmail(email),
    isOnline: online,
    deviceType: online ? getUserDeviceType(email) : null
  });
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[RedSonar Server] running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
