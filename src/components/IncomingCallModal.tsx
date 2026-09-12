import React, { useState } from 'react';
import { Phone, PhoneOff, Sparkles, Shield, UserCheck, MessageSquare } from 'lucide-react';
import { Contact } from '../types';

interface IncomingCallModalProps {
  caller: {
    name: string;
    phone: string;
    company?: string;
    role?: string;
  };
  onAccept: () => void;
  onDecline: () => void;
  onScreenWithGemini: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller,
  onAccept,
  onDecline,
  onScreenWithGemini,
}) => {
  const [isScreening, setIsScreening] = useState<boolean>(false);
  const [screeningTranscript, setScreeningTranscript] = useState<string[]>([]);

  const handleScreenClick = () => {
    setIsScreening(true);
    setScreeningTranscript([
      'CoreBIQ AI: "Hi, I am screening this call for CoreBIQ. Who is speaking and what is this regarding?"',
    ]);

    setTimeout(() => {
      setScreeningTranscript((prev) => [
        ...prev,
        `${caller.name}: "Hi! It's ${caller.name} from ${caller.company || 'CoreBIQ Team'}. Calling about the release build deployment."`,
      ]);
    }, 1800);

    setTimeout(() => {
      setScreeningTranscript((prev) => [
        ...prev,
        'CoreBIQ AI: "Verified high-priority contact. Summary: Deployment synchronization."',
      ]);
    }, 3200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 relative overflow-hidden text-center">
        {/* Gemini Halo Glow */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-blue-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-violet-200/50 rounded-full blur-2xl pointer-events-none" />

        {/* Incoming Label */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>Incoming CoreBIQ Call</span>
        </div>

        {/* Caller Avatar */}
        <div className="relative mx-auto w-20 h-20 mb-3">
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-md">
            {caller.name ? caller.name.charAt(0) : '?'}
          </div>
          <span className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping pointer-events-none opacity-50" />
        </div>

        {/* Caller Details */}
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{caller.name}</h3>
        <p className="text-sm font-mono text-slate-500 mt-0.5">{caller.phone}</p>
        {caller.company && (
          <p className="text-xs text-slate-600 font-medium mt-1">
            {caller.role ? `${caller.role} • ` : ''}{caller.company}
          </p>
        )}

        {/* Live Screening Dialog if activated */}
        {isScreening ? (
          <div className="mt-4 p-3 bg-blue-50/80 rounded-2xl border border-blue-200 text-left text-xs space-y-1.5 animate-fade-in max-h-40 overflow-y-auto">
            <div className="flex items-center gap-1 text-blue-800 font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Gemini Call Screen Live</span>
            </div>
            {screeningTranscript.map((line, i) => (
              <p key={i} className="text-slate-700 leading-snug">
                {line}
              </p>
            ))}
          </div>
        ) : (
          /* Gemini Screening Suggestion Chip */
          <div className="mt-4 mb-2">
            <button
              onClick={handleScreenClick}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Screen Call with Gemini AI</span>
            </button>
          </div>
        )}

        {/* Accept / Decline Action Buttons */}
        <div className="mt-6 flex items-center justify-around px-4">
          {/* Decline Button */}
          <button
            id="incoming-decline-btn"
            onClick={onDecline}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 group-active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 transition-all">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-600 group-hover:text-rose-600">
              Decline
            </span>
          </button>

          {/* Accept Button */}
          <button
            id="incoming-accept-btn"
            onClick={onAccept}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 group-active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all">
              <Phone className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-xs font-semibold text-slate-600 group-hover:text-emerald-600">
              Accept
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
