import { useEffect, useRef, useState } from 'react';
import { Lock, Loader2, Pause, Play, RotateCcw, X } from 'lucide-react';
import { decryptMediaPayload, type EncryptedMediaPayload } from '../../lib/media/e2eeMedia';
import { cn } from '../../lib/cn';

interface EncryptedMediaBubbleProps {
  payload: EncryptedMediaPayload;
  mine: boolean;
  failed?: boolean;
}

export function EncryptedMediaBubble({ payload, mine, failed }: EncryptedMediaBubbleProps) {
  const isUploading = Boolean(mine && payload.isUploading && !failed);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!payload.url?.startsWith('blob:'));
  const [error, setError] = useState(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(payload.duration || 0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Image full view modal
  const [fullView, setFullView] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);

    decryptMediaPayload(payload)
      .then((url) => {
        if (isMounted) {
          setMediaUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [payload.url, payload.key]);

  // Handle audio playback
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || payload.duration || 1;
    setCurrentTime(cur);
    if (!duration || duration === 0) setDuration(dur);
    setProgress((cur / dur) * 100);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur = audioRef.current.duration || payload.duration || 1;
    audioRef.current.currentTime = pos * dur;
    setProgress(pos * 100);
  };

  const toggleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 py-2 px-3 text-xs text-zinc-500 select-none">
        <Lock size={13} className="animate-pulse text-zinc-400" />
        <span>Decrypting secure media…</span>
      </div>
    );
  }

  if (error || !mediaUrl) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 text-xs text-red-400 select-none">
        <Lock size={13} />
        <span>Media decryption failed</span>
      </div>
    );
  }

  // 1. VOICE NOTE / AUDIO PLAYER
  if (payload.mediaType === 'audio') {
    return (
      <div className="flex w-64 sm:w-72 flex-col gap-1.5 py-1 select-none">
        <audio
          ref={audioRef}
          src={mediaUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="hidden"
        />

        <div className="flex items-center gap-2.5">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={isUploading ? undefined : togglePlay}
            disabled={isUploading}
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-95 cursor-pointer',
              mine
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm'
                : 'bg-zinc-800 text-white dark:bg-white/20 dark:text-white shadow-sm'
            )}
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : mine && failed ? (
              <RotateCcw size={15} className="text-red-400" />
            ) : isPlaying ? (
              <Pause size={15} />
            ) : (
              <Play size={15} className="ml-0.5" />
            )}
          </button>

          {/* Scrubber & Waveform track */}
          <div className="flex flex-1 flex-col justify-center gap-1">
            <div
              onClick={isUploading ? undefined : handleSeek}
              className="relative h-2 w-full cursor-pointer rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"
            >
              <div
                style={{ width: `${progress}%` }}
                className={cn(
                  'h-full rounded-full transition-all duration-75',
                  mine ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-700 dark:bg-white'
                )}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>{isUploading ? 'Sending…' : mine && failed ? 'Failed' : formatSeconds(currentTime)}</span>
              <span>{formatSeconds(duration || currentTime)}</span>
            </div>
          </div>

          {/* Speed Toggle */}
          {!isUploading && !failed && (
            <button
              type="button"
              onClick={toggleSpeed}
              className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 cursor-pointer"
            >
              {speed}x
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. IMAGE VIEWER
  if (payload.mediaType === 'image') {
    return (
      <>
        <div className="relative group overflow-hidden rounded-lg">
          <img
            src={mediaUrl}
            alt="Encrypted media"
            onClick={() => !isUploading && setFullView(true)}
            className={cn(
              'max-h-64 sm:max-h-80 w-auto rounded-lg object-cover cursor-pointer transition-transform hover:scale-[1.01] active:scale-98',
              isUploading && 'brightness-75',
              mine && failed && 'brightness-60 grayscale-[30%]'
            )}
          />

          {isUploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 backdrop-blur-[1px] pointer-events-none select-none rounded-lg">
              <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin flex items-center justify-center" />
              <span className="text-[11px] font-medium text-white/95 drop-shadow">Sending…</span>
            </div>
          ) : mine && failed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 backdrop-blur-[1px] pointer-events-none select-none rounded-lg text-white">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                <RotateCcw size={17} />
              </div>
              <span className="text-[11px] font-medium text-red-200">Upload failed</span>
            </div>
          ) : (
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Lock size={10} />
              <span>E2EE</span>
            </div>
          )}
        </div>

        {/* Full View Modal */}
        {fullView && (
          <div
            onClick={() => setFullView(false)}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 p-4 select-none animate-fadeIn"
          >
            <button
              type="button"
              onClick={() => setFullView(false)}
              className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
            <img
              src={mediaUrl}
              alt="Full view"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  // 3. VIDEO PLAYER
  if (payload.mediaType === 'video') {
    return (
      <div className="relative overflow-hidden rounded-lg max-w-sm">
        <video
          src={mediaUrl}
          controls={!isUploading && !failed}
          playsInline
          className={cn(
            'max-h-64 sm:max-h-80 w-full rounded-lg bg-black object-contain shadow-sm',
            isUploading && 'brightness-75',
            mine && failed && 'brightness-60'
          )}
        />
        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 backdrop-blur-[1px] pointer-events-none select-none rounded-lg">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin flex items-center justify-center" />
            <span className="text-[11px] font-medium text-white/95 drop-shadow">Sending video…</span>
          </div>
        ) : mine && failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 backdrop-blur-[1px] pointer-events-none select-none rounded-lg text-white">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              <RotateCcw size={17} />
            </div>
            <span className="text-[11px] font-medium text-red-200">Upload failed</span>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
