import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { ThemeConfig } from '../utils/theme';
import type { useCall } from '../utils/useCall';

type CallApi = ReturnType<typeof useCall>;

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const CallScreen: React.FC<{ call: CallApi; theme: ThemeConfig }> = ({ call, theme }) => {
  const remoteRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream, call.phase]);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = call.localStream;
  }, [call.localStream, call.phase]);

  if (call.phase === 'idle') return null;

  const isVideo = call.kind === 'video';
  const showRemoteVideo = isVideo && !!call.remoteStream;

  const status =
    call.phase === 'outgoing'
      ? 'Calling…'
      : call.phase === 'incoming'
      ? `Incoming ${call.kind} call`
      : call.phase === 'connecting'
      ? 'Connecting…'
      : fmt(call.seconds);

  const roundBtn =
    'w-16 h-16 rounded-full flex items-center justify-center text-white active:scale-95 transition-all';

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-between overflow-hidden select-none"
      style={{ backgroundColor: theme.bgDark }}
    >
      {/* Remote media. Always rendered so voice calls play audio too. */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className={
          showRemoteVideo
            ? 'absolute inset-0 w-full h-full object-cover'
            : 'absolute w-px h-px opacity-0 pointer-events-none'
        }
      />
      {showRemoteVideo && <div className="absolute inset-0 bg-black/25" />}

      {/* Who + status */}
      <div className="relative z-10 pt-16 text-center">
        {!showRemoteVideo && (
          <div
            className="mx-auto w-24 h-24 rounded-full border-2 flex items-center justify-center text-4xl font-black text-white uppercase"
            style={{
              borderColor: theme.primary,
              backgroundColor: theme.cardBg,
              boxShadow: `0 0 40px ${theme.primaryGlow}`,
            }}
          >
            {call.peerName.slice(0, 1)}
          </div>
        )}
        <div className="mt-4 font-tactical font-black text-2xl text-white">{call.peerName}</div>
        <div
          className="mt-1 text-xs font-mono tracking-widest uppercase"
          style={{ color: theme.primary }}
        >
          {status}
        </div>
      </div>

      {/* Your own camera preview */}
      {isVideo && call.localStream && (
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute z-10 right-3 bottom-32 w-28 h-40 object-cover rounded-xl border-2"
          style={{ borderColor: theme.primary, transform: 'scaleX(-1)' }}
        />
      )}

      {/* Buttons */}
      <div className="relative z-10 pb-12 flex items-center justify-center gap-5">
        {call.phase === 'incoming' ? (
          <>
            <button
              onClick={call.declineCall}
              className={`${roundBtn} bg-red-600 hover:bg-red-500`}
              title="Decline"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <button
              onClick={call.acceptCall}
              className={`${roundBtn} bg-emerald-600 hover:bg-emerald-500`}
              title="Accept"
            >
              {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={call.toggleMute}
              className={`${roundBtn} border`}
              style={{
                backgroundColor: call.muted ? '#ffffff33' : theme.cardBg,
                borderColor: theme.primary,
              }}
              title={call.muted ? 'Unmute' : 'Mute'}
            >
              {call.muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {isVideo && (
              <button
                onClick={call.toggleCamera}
                className={`${roundBtn} border`}
                style={{
                  backgroundColor: call.cameraOff ? '#ffffff33' : theme.cardBg,
                  borderColor: theme.primary,
                }}
                title={call.cameraOff ? 'Camera on' : 'Camera off'}
              >
                {call.cameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            <button
              onClick={call.hangUp}
              className={`${roundBtn} bg-red-600 hover:bg-red-500`}
              title="End call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};