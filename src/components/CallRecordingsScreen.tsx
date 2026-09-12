import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Disc,
  Play,
  Pause,
  Download,
  Trash2,
  Sparkles,
  Phone,
  Search,
  Sliders,
  ShieldAlert,
  VolumeX,
  Volume2,
  FileText,
  RotateCcw,
  CheckCircle2,
  X
} from 'lucide-react';
import { CallRecording, DialerSettings, AnnouncementMode } from '../types';

interface CallRecordingsScreenProps {
  recordings: CallRecording[];
  settings: DialerSettings;
  onUpdateSettings: (settings: Partial<DialerSettings>) => void;
  onDeleteRecording: (id: string) => void;
  onCallNumber: (target: { name: string; phone: string }) => void;
}

export const CallRecordingsScreen: React.FC<CallRecordingsScreenProps> = ({
  recordings,
  settings,
  onUpdateSettings,
  onDeleteRecording,
  onCallNumber,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(
    recordings[0]?.id || null
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  const activeRec = recordings.find((r) => r.id === activeRecordingId);
  const intervalRef = useRef<number | null>(null);

  // Playback simulation
  useEffect(() => {
    if (isPlaying && activeRec) {
      intervalRef.current = window.setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          const step = (100 / (activeRec.durationSeconds || 30)) * 0.2 * playbackSpeed;
          return Math.min(100, prev + step);
        });
      }, 200);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, activeRec, playbackSpeed]);

  const handleSelectRecording = (rec: CallRecording) => {
    setActiveRecordingId(rec.id);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const handleDownloadAudio = (rec: CallRecording) => {
    // Generate simulated WAV file blob for export
    const sampleRate = 8000;
    const duration = Math.min(rec.durationSeconds, 60);
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);

    // RIFF identifier
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples, true);

    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 127 + 128;
      view.setUint8(44 + i, Math.floor(sample));
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CM_Dialer_Record_${rec.name.replace(/\s+/g, '_')}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredRecordings = recordings.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q);
  });

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full px-4 py-2">
      {/* Top Banner: Auto Call Recording Controls & Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 mb-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Auto Call Recording</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Silent • No Announcement
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Every phone conversation is silently recorded into local device storage with zero
              audible alert tone or automated prompt. Android 14 telephony compliant.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateSettings({ autoRecord: !settings.autoRecord })}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                settings.autoRecord
                  ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/50'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {settings.autoRecord ? '● Auto-Record: ON' : '○ Auto-Record: OFF'}
            </button>

            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              title="Recording options"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Announcement Mode Drawer */}
        {showSettingsDrawer && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs animate-fade-in">
            <span className="font-bold text-slate-200 block mb-1.5">Announcement Mode:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'none' as AnnouncementMode,
                  label: 'No Announcement (Silent)',
                  desc: 'Completely silent. No beep, chime, or voice alert.',
                },
                {
                  id: 'beep' as AnnouncementMode,
                  label: 'Single Beep Tone',
                  desc: 'Plays a subtle 0.2s DTMF tone at connection.',
                },
                {
                  id: 'voice' as AnnouncementMode,
                  label: 'Voice Announcement',
                  desc: 'Standard telephony disclaimer.',
                },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onUpdateSettings({ announcementMode: mode.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    settings.announcementMode === mode.id
                      ? 'bg-blue-600/30 border-blue-400 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold block text-white">{mode.label}</span>
                  <span className="text-[10px] text-slate-300">{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search call recordings by contact name or phone number..."
          className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Content: Split List and Audio Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 pb-16 overflow-y-auto">
        {/* Left Column: Recordings List */}
        <div className="lg:col-span-5 space-y-2">
          {filteredRecordings.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
              <Disc className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">No Call Recordings Found</p>
              <p className="text-xs text-slate-400 mt-1">
                Make an incoming or outgoing call; it will silently record here.
              </p>
            </div>
          ) : (
            filteredRecordings.map((rec) => {
              const isSelected = rec.id === activeRecordingId;
              return (
                <div
                  key={rec.id}
                  onClick={() => handleSelectRecording(rec)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{rec.name}</h4>
                        <p className="text-[11px] font-mono text-slate-500">{rec.phone}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {formatDuration(rec.durationSeconds)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{rec.timestamp}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Silent Record
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Active Player & Transcript / AI Summary */}
        {activeRec && (
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{activeRec.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      HD 32kHz
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500">{activeRec.phone} • {activeRec.timestamp}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDownloadAudio(activeRec)}
                    title="Download audio recording (.wav)"
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      onCallNumber({
                        name: activeRec.name,
                        phone: activeRec.phone,
                      })
                    }
                    title="Call contact back"
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <Phone className="w-4 h-4 fill-emerald-600" />
                  </button>
                  <button
                    onClick={() => onDeleteRecording(activeRec.id)}
                    title="Delete recording"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Waveform Player Box */}
              <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200 mb-4">
                {/* Waveform Bars */}
                <div className="flex items-center justify-between gap-1 h-14 mb-3 px-1">
                  {activeRec.waveform.map((height, idx) => {
                    const barPercent = (idx / activeRec.waveform.length) * 100;
                    const hasPlayed = barPercent <= playbackProgress;
                    return (
                      <div
                        key={idx}
                        onClick={() => setPlaybackProgress(barPercent)}
                        style={{ height: `${height}%` }}
                        className={`w-1.5 rounded-full cursor-pointer transition-all ${
                          hasPlayed
                            ? 'bg-rose-500 shadow-xs'
                            : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Player Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-all"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      )}
                    </button>

                    <button
                      onClick={() => setPlaybackProgress(0)}
                      title="Rewind to start"
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs font-mono font-bold text-slate-700">
                    {formatDuration(
                      Math.round((playbackProgress / 100) * activeRec.durationSeconds)
                    )}{' '}
                    / {formatDuration(activeRec.durationSeconds)}
                  </div>

                  {/* Playback speed toggle */}
                  <button
                    onClick={() => {
                      const speeds = [1, 1.25, 1.5, 2];
                      const next = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                      setPlaybackSpeed(speeds[next]);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    {playbackSpeed}x
                  </button>
                </div>
              </div>

              {/* Gemini AI Call Notes */}
              <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/70 p-3.5 rounded-2xl border border-blue-200/80 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Gemini AI Key Takeaways</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700">
                  {activeRec.aiKeyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Full Speech Transcript Box */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Call Transcription</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-mono">
                  "{activeRec.transcript}"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
