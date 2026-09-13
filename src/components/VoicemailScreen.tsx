import React, { useState, useEffect, useRef } from 'react';
import {
  Voicemail,
  Play,
  Pause,
  Phone,
  Trash2,
  Sparkles,
  Volume2,
  Volume1,
  RotateCcw,
  CheckCircle,
  FileText
} from 'lucide-react';
import { VoicemailItem } from '../types';

interface VoicemailScreenProps {
  voicemails: VoicemailItem[];
  onCallNumber: (target: { name: string; phone: string; contactId?: string }) => void;
  onDeleteVoicemail: (id: string) => void;
  onMarkAsRead: (id: string) => void;
}

export const VoicemailScreen: React.FC<VoicemailScreenProps> = ({
  voicemails,
  onCallNumber,
  onDeleteVoicemail,
  onMarkAsRead,
}) => {
  const [selectedVmId, setSelectedVmId] = useState<string | null>(voicemails[0]?.id || null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0); // 0 to 100
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const progressIntervalRef = useRef<number | null>(null);

  const currentVm = voicemails.find((vm) => vm.id === selectedVmId);

  // Playback simulation effect
  useEffect(() => {
    if (isPlaying && currentVm) {
      progressIntervalRef.current = window.setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          const step = (100 / (currentVm.durationSeconds || 30)) * 0.2 * playbackSpeed;
          return Math.min(100, prev + step);
        });
      }, 200);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, currentVm, playbackSpeed]);

  const handleSelectVm = (vm: VoicemailItem) => {
    setSelectedVmId(vm.id);
    setIsPlaying(false);
    setPlaybackProgress(0);
    if (!vm.isRead) {
      onMarkAsRead(vm.id);
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate waveform heights for visualizer
  const waveformHeights = [
    25, 45, 60, 80, 50, 70, 95, 65, 40, 85, 90, 75, 55, 35, 60, 80, 70, 45, 90, 60, 40, 65, 80, 50, 30,
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-full px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Voicemail className="w-5 h-5 text-blue-600" />
            <span>CM Dialer AI Visual Voicemail</span>
          </h2>
          <p className="text-xs text-slate-500">
            Automated speech transcription & Gemini key takeaway synthesis
          </p>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full">
          {voicemails.filter((v) => !v.isRead).length} Unread
        </span>
      </div>

      {voicemails.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
          <Voicemail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Voicemail inbox is empty</p>
          <p className="text-xs text-slate-400 mt-1">New voicemails will appear here with AI summaries</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 pb-16 overflow-y-auto">
          {/* Left Column: Voicemail List */}
          <div className="md:col-span-5 space-y-2">
            {voicemails.map((vm) => {
              const isSelected = vm.id === selectedVmId;
              return (
                <div
                  key={vm.id}
                  onClick={() => handleSelectVm(vm)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {!vm.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                      <span className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {vm.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {formatDuration(vm.durationSeconds)}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-500 mt-0.5">{vm.phone}</p>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 italic">
                    "{vm.transcript}"
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60 text-[10px] text-slate-400">
                    <span>{vm.timestamp}</span>
                    <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI Summarized
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Voicemail Player & Gemini Intelligence */}
          {currentVm && (
            <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                {/* Contact Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{currentVm.name}</h3>
                    <p className="text-xs font-mono text-slate-500">{currentVm.phone}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        onCallNumber({
                          name: currentVm.name,
                          phone: currentVm.phone,
                          contactId: currentVm.contactId,
                        })
                      }
                      title="Call back"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-all cursor-pointer"
                    >
                      <Phone className="w-4 h-4 fill-emerald-600" />
                    </button>
                    <button
                      onClick={() => onDeleteVoicemail(currentVm.id)}
                      title="Delete voicemail"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Audio Waveform & Player Controls */}
                <div className="my-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  {/* Visual Waveform */}
                  <div className="flex items-center justify-between gap-1 h-12 mb-3 px-2">
                    {waveformHeights.map((height, idx) => {
                      const barPercent = (idx / waveformHeights.length) * 100;
                      const hasPlayed = barPercent <= playbackProgress;
                      return (
                        <div
                          key={idx}
                          onClick={() => setPlaybackProgress(barPercent)}
                          style={{ height: `${height}%` }}
                          className={`w-1 rounded-full cursor-pointer transition-all ${
                            hasPlayed
                              ? 'bg-blue-600'
                              : 'bg-slate-300 hover:bg-slate-400'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTogglePlay}
                        className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm cursor-pointer active:scale-95 transition-all"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                      </button>

                      <button
                        onClick={() => setPlaybackProgress(0)}
                        title="Restart playback"
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs font-mono text-slate-600 font-semibold">
                      {formatDuration(Math.round((playbackProgress / 100) * currentVm.durationSeconds))} /{' '}
                      {formatDuration(currentVm.durationSeconds)}
                    </div>

                    {/* Speed Switcher */}
                    <button
                      onClick={() => {
                        const speeds = [1, 1.25, 1.5, 2];
                        const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                        setPlaybackSpeed(speeds[nextIdx]);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                    >
                      {playbackSpeed}x
                    </button>
                  </div>
                </div>

                {/* Gemini AI Summary & Key Points */}
                <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/70 p-3.5 rounded-2xl border border-blue-200/80 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Gemini AI Takeaways</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {currentVm.aiKeyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Full Transcript Box */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Audio Transcription</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    "{currentVm.transcript}"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
