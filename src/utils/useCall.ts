import { useCallback, useEffect, useRef, useState } from 'react';
import { CallKind } from '../types';
import { sonarAudio } from './audio';

// STUN servers help two devices find each other. Some mobile networks
// also need a TURN relay (can be added to this list later).
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected';

interface Session {
  callId: string;
  peerEmail: string;
  peerName: string;
  role: 'caller' | 'callee';
  kind: CallKind;
  pc: RTCPeerConnection | null;
  stream: MediaStream | null;
  pendingIce: RTCIceCandidateInit[];
  remoteSet: boolean;
}

interface UseCallOptions {
  myEmail?: string;
  myName?: string;
  send: (msg: object) => boolean;
  onNotice: (msg: string) => void;
}

const getMedia = (k: CallKind) =>
  navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: k === 'video' ? { facingMode: 'user' } : false,
  });

export function useCall({ myEmail, myName, send, onNotice }: UseCallOptions) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [kind, setKind] = useState<CallKind>('voice');
  const [peerName, setPeerName] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const session = useRef<Session | null>(null);
  const timers = useRef<{ ring?: any; timeout?: any }>({});

  // Always-fresh copies of props, so callbacks never go stale
  const opts = useRef({ myEmail, myName, send, onNotice });
  opts.current = { myEmail, myName, send, onNotice };

  const signal = useCallback((toEmail: string, callId: string, sigKind: string, data?: any) => {
    return opts.current.send({
      type: 'CALL_SIGNAL',
      payload: { toEmail, fromEmail: opts.current.myEmail, kind: sigKind, callId, data },
    });
  }, []);

  const cleanup = useCallback(() => {
    clearInterval(timers.current.ring);
    clearTimeout(timers.current.timeout);
    const s = session.current;
    session.current = null;
    if (s) {
      s.stream?.getTracks().forEach((t) => t.stop());
      if (s.pc) {
        s.pc.onicecandidate = null;
        s.pc.ontrack = null;
        s.pc.onconnectionstatechange = null;
        s.pc.close();
      }
    }
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
    setSeconds(0);
    setPhase('idle');
  }, []);

  const createPeer = useCallback(
    (s: Session) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      s.stream?.getTracks().forEach((t) => pc.addTrack(t, s.stream!));

      pc.onicecandidate = (e) => {
        if (e.candidate) signal(s.peerEmail, s.callId, 'ice', e.candidate.toJSON());
      };
      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
      };
      pc.onconnectionstatechange = () => {
        if (session.current !== s) return;
        if (pc.connectionState === 'connected') {
          setPhase('connected');
        } else if (pc.connectionState === 'failed') {
          opts.current.onNotice('Call could not connect (network blocked it)');
          signal(s.peerEmail, s.callId, 'end');
          cleanup();
        } else if (pc.connectionState === 'disconnected') {
          setTimeout(() => {
            if (session.current === s && pc.connectionState === 'disconnected') {
              opts.current.onNotice('Call dropped');
              cleanup();
            }
          }, 8000);
        }
      };
      return pc;
    },
    [cleanup, signal]
  );

  const armConnectTimeout = useCallback(
    (s: Session) => {
      clearTimeout(timers.current.timeout);
      timers.current.timeout = setTimeout(() => {
        if (session.current === s && s.pc && s.pc.connectionState !== 'connected') {
          opts.current.onNotice('Could not connect the call');
          signal(s.peerEmail, s.callId, 'end');
          cleanup();
        }
      }, 30000);
    },
    [cleanup, signal]
  );

  const flushIce = async (s: Session) => {
    s.remoteSet = true;
    for (const c of s.pendingIce) {
      try {
        await s.pc?.addIceCandidate(c);
      } catch {}
    }
    s.pendingIce = [];
  };

  const startRinging = () => {
    try {
      sonarAudio.triggerSonarSignal();
    } catch {}
    timers.current.ring = setInterval(() => {
      try {
        sonarAudio.triggerSonarSignal();
      } catch {}
    }, 2500);
  };

  // ---- Outgoing call ----
  const startCall = useCallback(
    async (toEmail: string, toName: string, k: CallKind) => {
      if (session.current) {
        opts.current.onNotice('Already in a call');
        return;
      }
      if (!opts.current.myEmail) return;

      const s: Session = {
        callId: 'call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        peerEmail: toEmail.trim().toLowerCase(),
        peerName: toName,
        role: 'caller',
        kind: k,
        pc: null,
        stream: null,
        pendingIce: [],
        remoteSet: false,
      };
      session.current = s;
      setKind(k);
      setPeerName(toName);
      setPhase('outgoing');

      let stream: MediaStream;
      try {
        stream = await getMedia(k);
      } catch {
        opts.current.onNotice('Could not access microphone/camera. Check permissions.');
        if (session.current === s) cleanup();
        return;
      }
      if (session.current !== s) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      s.stream = stream;
      setLocalStream(stream);

      const ok = signal(s.peerEmail, s.callId, 'invite', {
        callKind: k,
        fromNickname: opts.current.myName,
      });
      if (!ok) {
        opts.current.onNotice('Not connected to the server yet. Try again in a moment.');
        cleanup();
        return;
      }

      timers.current.timeout = setTimeout(() => {
        if (session.current === s && !s.pc) {
          signal(s.peerEmail, s.callId, 'end');
          opts.current.onNotice(`${toName} didn't answer`);
          cleanup();
        }
      }, 45000);
    },
    [cleanup, signal]
  );

  // ---- Incoming call: accept / decline ----
  const acceptCall = useCallback(async () => {
    const s = session.current;
    if (!s || s.role !== 'callee' || s.pc) return;
    clearInterval(timers.current.ring);
    clearTimeout(timers.current.timeout);
    setPhase('connecting');

    let stream: MediaStream;
    try {
      stream = await getMedia(s.kind);
    } catch {
      opts.current.onNotice('Could not access microphone/camera. Check permissions.');
      signal(s.peerEmail, s.callId, 'decline');
      if (session.current === s) cleanup();
      return;
    }
    if (session.current !== s) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    s.stream = stream;
    setLocalStream(stream);
    s.pc = createPeer(s);
    signal(s.peerEmail, s.callId, 'accept');
    armConnectTimeout(s);
  }, [cleanup, createPeer, signal, armConnectTimeout]);

  const declineCall = useCallback(() => {
    const s = session.current;
    if (s) signal(s.peerEmail, s.callId, 'decline');
    cleanup();
  }, [cleanup, signal]);

  const hangUp = useCallback(() => {
    const s = session.current;
    if (s) signal(s.peerEmail, s.callId, 'end');
    cleanup();
  }, [cleanup, signal]);

  // ---- Messages coming from the server ----
  const handleSignal = useCallback(
    async (p: { fromEmail: string; kind: string; callId: string; data?: any }) => {
      try {
        const from = p.fromEmail;
        const s = session.current;

        if (p.kind === 'invite') {
          if (s) {
            signal(from, p.callId, 'busy');
            return;
          }
          const k: CallKind = p.data?.callKind === 'video' ? 'video' : 'voice';
          const name = p.data?.fromNickname || from.split('@')[0];
          const ns: Session = {
            callId: p.callId,
            peerEmail: from,
            peerName: name,
            role: 'callee',
            kind: k,
            pc: null,
            stream: null,
            pendingIce: [],
            remoteSet: false,
          };
          session.current = ns;
          setKind(k);
          setPeerName(name);
          setPhase('incoming');
          startRinging();
          timers.current.timeout = setTimeout(() => {
            if (session.current === ns && !ns.pc) {
              signal(from, ns.callId, 'end');
              cleanup();
            }
          }, 45000);
          return;
        }

        if (!s || s.callId !== p.callId) return;

        switch (p.kind) {
          case 'accept': {
            if (s.role !== 'caller' || s.pc) return;
            setPhase('connecting');
            const pc = createPeer(s);
            s.pc = pc;
            armConnectTimeout(s);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signal(s.peerEmail, s.callId, 'offer', { type: offer.type, sdp: offer.sdp });
            break;
          }
          case 'offer': {
            if (s.role !== 'callee' || !s.pc) return;
            await s.pc.setRemoteDescription(p.data);
            await flushIce(s);
            const answer = await s.pc.createAnswer();
            await s.pc.setLocalDescription(answer);
            signal(s.peerEmail, s.callId, 'answer', { type: answer.type, sdp: answer.sdp });
            break;
          }
          case 'answer': {
            if (!s.pc) return;
            await s.pc.setRemoteDescription(p.data);
            await flushIce(s);
            break;
          }
          case 'ice': {
            if (s.pc && s.remoteSet) {
              try {
                await s.pc.addIceCandidate(p.data);
              } catch {}
            } else {
              s.pendingIce.push(p.data);
            }
            break;
          }
          case 'decline':
            opts.current.onNotice(`${s.peerName} declined the call`);
            cleanup();
            break;
          case 'busy':
            opts.current.onNotice(`${s.peerName} is on another call`);
            cleanup();
            break;
          case 'end':
            opts.current.onNotice('Call ended');
            cleanup();
            break;
        }
      } catch (err) {
        console.error('Call signal error:', err);
      }
    },
    [cleanup, createPeer, signal, armConnectTimeout]
  );

  // ---- In-call controls ----
  const toggleMute = useCallback(() => {
    const s = session.current;
    if (!s?.stream) return;
    const tracks = s.stream.getAudioTracks();
    const wasOn = tracks[0]?.enabled ?? true;
    tracks.forEach((t) => (t.enabled = !wasOn));
    setMuted(wasOn);
  }, []);

  const toggleCamera = useCallback(() => {
    const s = session.current;
    if (!s?.stream) return;
    const tracks = s.stream.getVideoTracks();
    const wasOn = tracks[0]?.enabled ?? true;
    tracks.forEach((t) => (t.enabled = !wasOn));
    setCameraOff(wasOn);
  }, []);

  // Call timer
  useEffect(() => {
    if (phase !== 'connected') return;
    const t0 = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // End any call on sign-out / unmount
  useEffect(() => () => cleanup(), [cleanup, myEmail]);

  return {
    phase,
    kind,
    peerName,
    muted,
    cameraOff,
    seconds,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute,
    toggleCamera,
    handleSignal,
  };
}