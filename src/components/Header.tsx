import React from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  PhoneIncoming,
  ShieldCheck,
  Wifi,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { dialerAudio } from '../utils/audio';
import { DialerSettings } from '../types';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onSimulateIncomingCall: () => void;
  isCallActive: boolean;
  settings: DialerSettings;
  onOpenGoogleContactsModal: () => void;
  onOpenPlayStoreModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
  onSimulateIncomingCall,
  isCallActive,
  settings,
  onOpenGoogleContactsModal,
  onOpenPlayStoreModal,
}) => {
  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 transition-colors">
      {/* Top Telephony Carrier Status Bar (Simulated OS/HD Voice) */}
      <div className="px-4 py-1 flex items-center justify-between text-[11px] font-medium text-slate-500 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-700 tracking-tight">CM Dialer 5G</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-500">
            <Wifi className="w-3 h-3 text-blue-500" />
            VoLTE HD Voice
          </span>
          <span className="hidden md:inline text-slate-400">•</span>
          <span className="hidden md:inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded font-bold text-[10px]">
            ● Silent Auto-Record Active
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Google Contacts Quick Link */}
          <button
            onClick={onOpenGoogleContactsModal}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 cursor-pointer transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span className="hidden sm:inline">Google Contacts:</span>
            <span>{settings.googleContactsLinked ? 'Linked' : 'Link'}</span>
          </button>

          {/* Play Store Ready Badge */}
          <button
            onClick={onOpenPlayStoreModal}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-all shadow-2xs active:scale-95"
          >
            <Smartphone className="w-3 h-3 text-emerald-600" />
            <span>Play Store Ready</span>
          </button>
        </div>
      </div>

      {/* Main App Brand & Global Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                CM Dialer <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AI</span>
              </h1>
              <span className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Light Telephony
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Silent Auto Recording • Google Contacts • T9 Smart Keypad
            </p>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Incoming Call Simulation Button */}
          {!isCallActive && (
            <button
              id="simulate-call-btn"
              onClick={onSimulateIncomingCall}
              title="Test incoming call screen with Gemini AI screening"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all hover:shadow-xs active:scale-95 cursor-pointer"
            >
              <PhoneIncoming className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
              <span className="hidden sm:inline">Test Incoming Call</span>
              <span className="sm:hidden">Test Call</span>
            </button>
          )}

          {/* Sound / DTMF Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={() => {
              const next = !soundEnabled;
              onToggleSound(next);
              dialerAudio.setSoundEnabled(next);
            }}
            title={soundEnabled ? 'Mute Keypad DTMF audio' : 'Enable Keypad DTMF audio'}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-blue-50/80 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

