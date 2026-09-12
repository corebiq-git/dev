import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Grid,
  PhoneOff,
  Sparkles,
  ShieldCheck,
  Radio,
  FileText,
  CheckCircle2,
  ChevronDown,
  Send,
  MessageSquare,
  Disc
} from 'lucide-react';
import { ActiveCallState } from '../types';
import { dialerAudio } from '../utils/audio';

interface InCallScreenProps {
  call: ActiveCallState;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleHold: () => void;
  onToggleRecording?: () => void;
  onAddTranscriptLine?: (line: { speaker: 'you' | 'other' | 'gemini_ai'; text: string }) => void;
}

export const InCallScreen: React.FC<InCallScreenProps> = ({
  call,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  onToggleHold,
  onToggleRecording,
  onAddTranscriptLine,
}) => {
  const [showInCallKeypad, setShowInCallKeypad] = useState<boolean>(false);
  const [showAiNotes, setShowAiNotes] = useState<boolean>(false);
  const [typedReply, setTypedReply] = useState<string>('');

  // Format call duration into MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Play DTMF during call when in-call keypad is used
  const handleInCallKeypadPress = (key: string) => {
    dialerAudio.playDtmf(key, 120);
    if (onAddTranscriptLine) {
      onAddTranscriptLine({
        speaker: 'you',
        text: `[Sent DTMF Tone: ${key}]`,
      });
    }
  };

  const handleSendSmartReply = (text: string) => {
    if (!text.trim() || !onAddTranscriptLine) return;
    onAddTranscriptLine({
      speaker: 'you',
      text: text,
    });
    setTypedReply('');
  };

  return (
    <div className="w-full max-w-lg mx-auto min-h-[580px] flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-white via-[#f8fafd] to-slate-100 rounded-3xl border border-slate-200/90 shadow-xl relative overflow-hidden">
      {/* Gemini Ambient Glow Background Accent */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Telephony Security & Recording Pill */}
      <div className="flex items-center justify-between z-10 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/80 border border-slate-200/80 px-2.5 py-1 rounded-full shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-slate-700">HD VoLTE 32kHz</span>
        </div>

        {/* Silent Auto Recording Indicator */}
        {call.isRecording && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-[11px] font-bold shadow-2xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
            </span>
            <span>REC {formatDuration(call.recordingDuration || call.duration)}</span>
            <span className="text-[9px] text-rose-500 font-extrabold uppercase hidden sm:inline">
              Silent Mode
            </span>
          </div>
        )}

        <button
          onClick={() => setShowAiNotes(!showAiNotes)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
            showAiNotes
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white/90 text-blue-700 border-blue-200 hover:bg-blue-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini Assist</span>
        </button>
      </div>

      {/* Center Hero: Avatar & Caller Info */}
      <div className="flex flex-col items-center justify-center my-auto py-4 z-10 text-center">
        {/* Animated Avatar with Gemini Glow Aura */}
        <div className="relative mb-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-1 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-blue-700">
              {call.contact.name ? call.contact.name.charAt(0) : '#'}
            </div>
          </div>

          {/* Pulse ring when ringing or connected */}
          {call.status === 'ringing' && (
            <span className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping pointer-events-none opacity-40" />
          )}

          {call.status === 'connected' && !call.isHold && (
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white shadow-sm">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </span>
          )}

          {call.isHold && (
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 border-2 border-white rounded-full flex items-center justify-center text-white shadow-sm">
              <Pause className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {/* Name & Role */}
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {call.contact.name || 'Unknown Caller'}
        </h2>
        <p className="text-sm font-mono text-slate-500 mt-0.5">
          {call.contact.phone}
        </p>

        {call.contact.company && (
          <span className="text-xs font-semibold text-slate-600 bg-slate-100/90 px-2.5 py-0.5 rounded-full mt-1.5 border border-slate-200/60">
            {call.contact.role ? `${call.contact.role} • ` : ''}{call.contact.company}
          </span>
        )}

        {/* Call State / Duration Badge */}
        <div className="mt-3 flex items-center gap-2">
          {call.status === 'ringing' ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Calling...
            </span>
          ) : call.isHold ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <Pause className="w-3 h-3" />
              Call on Hold
            </span>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-sm font-mono font-bold text-slate-700 bg-white/90 border border-slate-200 px-3 py-1 rounded-full shadow-xs">
                {formatDuration(call.duration)}
              </span>

              {/* Dynamic Audio Visualizer Bar animation */}
              <div className="flex items-center gap-1 mt-2 h-4">
                {[4, 12, 8, 16, 10, 14, 6, 12, 18, 9].map((height, i) => (
                  <div
                    key={i}
                    style={{ height: call.isMuted ? '3px' : `${height}px` }}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      call.isMuted ? 'bg-slate-300' : 'bg-gradient-to-t from-blue-600 to-purple-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gemini AI Assist Drawer / Popover if open */}
      {showAiNotes && (
        <div className="z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200 p-3 mb-4 shadow-lg animate-fade-in text-left max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Gemini Live Call Intelligence</span>
            </div>
            <button
              onClick={() => setShowAiNotes(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* AI Live Key Takeaways */}
          <div className="text-xs text-slate-600 space-y-1.5 mb-2">
            <div className="p-2 bg-blue-50/70 rounded-xl border border-blue-100 text-blue-900 font-medium">
              <span className="font-bold">Real-time Summary: </span>
              {call.aiSummary || 'Connected via CM Dialer VoIP gateway. Silent auto call recording active.'}
            </div>

            {/* Transcript lines */}
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {call.transcript.map((line) => (
                <div key={line.id} className="text-[11px] leading-tight flex items-start gap-1">
                  <span className={`font-bold ${line.speaker === 'you' ? 'text-blue-700' : 'text-slate-700'}`}>
                    {line.speaker === 'you' ? 'You:' : line.speaker === 'gemini_ai' ? 'CM AI:' : `${call.contact.name}:`}
                  </span>
                  <span className="text-slate-600">{line.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Smart Replies */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
            {['I will WhatsApp you the documents.', 'Let me confirm with engineering.', 'Schedule follow-up call tomorrow at 2 PM'].map(
              (reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendSmartReply(reply)}
                  className="text-[10px] font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  + {reply}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* In-Call DTMF Keypad Drawer */}
      {showInCallKeypad && (
        <div className="z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-3 mb-4 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="text-xs font-bold text-slate-700">DTMF Tone Keypad (IVR Menu)</span>
            <button
              onClick={() => setShowInCallKeypad(false)}
              className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleInCallKeypadPress(digit)}
                className="h-10 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-base font-bold text-slate-800 hover:text-blue-600 active:scale-95 transition-all cursor-pointer"
              >
                {digit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* In-Call Controls Grid */}
      <div className="z-10 grid grid-cols-5 gap-1.5 sm:gap-2 max-w-md mx-auto mb-5 w-full">
        {/* Mute Button */}
        <button
          id="incall-mute-btn"
          onClick={onToggleMute}
          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
            call.isMuted
              ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          {call.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="text-[10px] font-semibold mt-1">
            {call.isMuted ? 'Unmute' : 'Mute'}
          </span>
        </button>

        {/* DTMF Keypad Button */}
        <button
          id="incall-keypad-btn"
          onClick={() => setShowInCallKeypad(!showInCallKeypad)}
          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
            showInCallKeypad
              ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-1">Keypad</span>
        </button>

        {/* Silent Auto Record Toggle Button */}
        <button
          id="incall-record-btn"
          onClick={onToggleRecording}
          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
            call.isRecording
              ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-xs ring-1 ring-rose-300'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          <Disc className={`w-4 h-4 ${call.isRecording ? 'animate-spin text-rose-600' : ''}`} />
          <span className="text-[10px] font-semibold mt-1">
            {call.isRecording ? 'REC ON' : 'Record'}
          </span>
        </button>

        {/* Speaker Button */}
        <button
          id="incall-speaker-btn"
          onClick={onToggleSpeaker}
          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
            call.isSpeaker
              ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          {call.isSpeaker ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="text-[10px] font-semibold mt-1">Speaker</span>
        </button>

        {/* Hold Button */}
        <button
          id="incall-hold-btn"
          onClick={onToggleHold}
          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
            call.isHold
              ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          {call.isHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          <span className="text-[10px] font-semibold mt-1">
            {call.isHold ? 'Resume' : 'Hold'}
          </span>
        </button>
      </div>

      {/* End Call Floating Red Action Button */}
      <div className="z-10 flex items-center justify-center pb-2">
        <button
          id="incall-end-call-btn"
          onClick={onEndCall}
          title="End Call"
          className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 text-white shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

