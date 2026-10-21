import { useEffect, useRef, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { toast } from '../../features/toast';

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export function VoiceNoteRecorder({ onSend, onCancel }: VoiceNoteRecorderProps) {
  const [seconds, setSeconds] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([30, 45, 25, 60, 40, 75, 50, 35]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Determine best supported Opus mimeType
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            mimeType = 'audio/ogg;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else {
            mimeType = '';
          }
        }

        const options = mimeType ? { mimeType, audioBitsPerSecond: 24000 } : undefined;
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start(100);

        // Timer
        timerRef.current = setInterval(() => {
          setSeconds((s) => s + 1);
        }, 1000);

        // Web Audio Analyser for live visualizer
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 32;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateWaveform = () => {
              if (isCancelled) return;
              analyser.getByteFrequencyData(dataArray);
              const bars: number[] = [];
              for (let i = 0; i < 8; i++) {
                const val = dataArray[i * 2] || 0;
                bars.push(Math.max(15, Math.round((val / 255) * 100)));
              }
              setWaveformBars(bars);
              animFrameRef.current = requestAnimationFrame(updateWaveform);
            };
            updateWaveform();
          }
        } catch {}
      } catch (err) {
        toast.error('Microphone blocked', 'Please allow microphone access to record voice notes.');
        onCancel();
      }
    }

    startRecording();

    return () => {
      isCancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleStopAndSend = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      onCancel();
      return;
    }

    const duration = Math.max(1, seconds);

    recorder.onstop = () => {
      const mime = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      onSend(audioBlob, duration);
    };

    recorder.stop();
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    onCancel();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 animate-fadeIn select-none">
      {/* Left: Recording Indicator & Timer */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="mono text-[13px] font-semibold text-red-500 dark:text-red-400">
          {formatTime(seconds)}
        </span>
      </div>

      {/* Center: Live Waveform Visualizer */}
      <div className="flex items-center gap-1 h-6">
        {waveformBars.map((height, idx) => (
          <div
            key={idx}
            style={{ height: `${height}%` }}
            className="w-1 min-h-[4px] rounded-full bg-red-500/70 dark:bg-red-400/80 transition-all duration-75"
          />
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCancel}
          title="Discard recording"
          className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          onClick={handleStopAndSend}
          title="Send voice note"
          className="grid h-8 w-8 place-items-center rounded-md bg-red-600 hover:bg-red-500 text-white shadow-sm transition-transform active:scale-95 cursor-pointer"
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  );
}
