import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Delete, UserPlus, Sparkles, Voicemail, Plus, PhoneCall } from 'lucide-react';
import { Contact } from '../types';
import { dialerAudio } from '../utils/audio';
import { searchT9Contacts, formatPhoneNumber } from '../data/initialData';

interface KeypadProps {
  contacts: Contact[];
  onStartCall: (target: { name: string; phone: string; contactId?: string }) => void;
  onOpenAddContactModal: (phone: string) => void;
  onSelectVoicemail: () => void;
}

interface KeypadButtonConfig {
  digit: string;
  letters: string;
  subIcon?: boolean;
}

const KEYPAD_BUTTONS: KeypadButtonConfig[] = [
  { digit: '1', letters: 'VOICEMAIL', subIcon: true },
  { digit: '2', letters: 'A B C' },
  { digit: '3', letters: 'D E F' },
  { digit: '4', letters: 'G H I' },
  { digit: '5', letters: 'J K L' },
  { digit: '6', letters: 'M N O' },
  { digit: '7', letters: 'P Q R S' },
  { digit: '8', letters: 'T U V' },
  { digit: '9', letters: 'W X Y Z' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

export const Keypad: React.FC<KeypadProps> = ({
  contacts,
  onStartCall,
  onOpenAddContactModal,
  onSelectVoicemail,
}) => {
  const [inputNumber, setInputNumber] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  // T9 Predictive Search results
  const matchedContacts = React.useMemo(() => {
    if (!inputNumber) return [];
    return searchT9Contacts(inputNumber, contacts);
  }, [inputNumber, contacts]);

  // Check if current number matches an exact existing contact
  const exactContactMatch = React.useMemo(() => {
    if (!inputNumber) return null;
    const clean = inputNumber.replace(/\D/g, '');
    return contacts.find(c => c.phone.replace(/\D/g, '') === clean);
  }, [inputNumber, contacts]);

  // Handle digit press
  const handleKeyPress = useCallback((digit: string) => {
    dialerAudio.playDtmf(digit);
    setInputNumber(prev => prev + digit);
    setActiveKey(digit);
    setTimeout(() => setActiveKey(null), 140);
  }, []);

  // Backspace handler
  const handleBackspace = useCallback(() => {
    setInputNumber(prev => prev.slice(0, -1));
  }, []);

  // Clear all
  const handleClearAll = useCallback(() => {
    setInputNumber('');
  }, []);

  // Handle dial action
  const handleCall = useCallback(() => {
    if (!inputNumber.trim()) return;

    if (exactContactMatch) {
      onStartCall({
        name: exactContactMatch.name,
        phone: exactContactMatch.phone,
        contactId: exactContactMatch.id,
      });
    } else if (matchedContacts.length > 0 && inputNumber.length < 5) {
      // If T9 search has an exact top hit from speed dial/abbreviation
      const top = matchedContacts[0];
      onStartCall({
        name: top.name,
        phone: top.phone,
        contactId: top.id,
      });
    } else {
      onStartCall({
        name: formatPhoneNumber(inputNumber),
        phone: inputNumber,
      });
    }
  }, [inputNumber, exactContactMatch, matchedContacts, onStartCall]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input field elsewhere
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === '*' || e.key === '#') {
        handleKeyPress(e.key);
      } else if (e.key === '+') {
        handleKeyPress('+');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleCall();
      } else if (e.key === 'Escape') {
        handleClearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleBackspace, handleCall, handleClearAll]);

  // Long press on button (e.g. 1 for voicemail, 0 for +)
  const handleButtonMouseDown = (btn: KeypadButtonConfig) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      if (btn.digit === '1') {
        // Long press 1 = Voicemail
        dialerAudio.playDtmf('1', 300);
        onSelectVoicemail();
      } else if (btn.digit === '0') {
        // Long press 0 = '+'
        dialerAudio.playDtmf('0');
        setInputNumber(prev => prev + '+');
      } else {
        // Check if there's a speed dial assigned to this digit
        const digitNum = parseInt(btn.digit, 10);
        const speedContact = contacts.find(c => c.speedDialKey === digitNum);
        if (speedContact) {
          dialerAudio.playDtmf(btn.digit, 250);
          onStartCall({
            name: speedContact.name,
            phone: speedContact.phone,
            contactId: speedContact.id,
          });
        }
      }
    }, 600);
  };

  const handleButtonMouseUp = (btn: KeypadButtonConfig) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleKeyPress(btn.digit);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-between px-4 py-2 select-none">
      {/* T9 Smart Suggestions Pill / Bar */}
      <div className="w-full min-h-[58px] mb-2 flex items-center justify-center">
        {matchedContacts.length > 0 ? (
          <div className="w-full overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-2 px-1">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2.5 py-1 rounded-full whitespace-nowrap shadow-xs">
                <Sparkles className="w-3 h-3 text-blue-600" />
                T9 Match ({matchedContacts.length})
              </span>
              {matchedContacts.slice(0, 3).map(contact => (
                <button
                  key={contact.id}
                  onClick={() => onStartCall({ name: contact.name, phone: contact.phone, contactId: contact.id })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 text-slate-800 transition-all text-xs font-semibold shadow-xs hover:shadow-sm cursor-pointer whitespace-nowrap group"
                >
                  <span className={`w-5 h-5 rounded-full ${contact.avatarBg} text-white flex items-center justify-center text-[10px] font-bold`}>
                    {contact.name.charAt(0)}
                  </span>
                  <span className="font-medium text-slate-800 group-hover:text-blue-700">{contact.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">{contact.phone}</span>
                </button>
              ))}
            </div>
          </div>
        ) : inputNumber.length >= 3 && !exactContactMatch ? (
          <button
            onClick={() => onOpenAddContactModal(inputNumber)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-semibold border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>Create new contact for {inputNumber}</span>
          </button>
        ) : exactContactMatch ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50/70 border border-blue-200/60 rounded-full text-xs text-blue-800 font-semibold animate-fade-in">
            <span className={`w-4 h-4 rounded-full ${exactContactMatch.avatarBg} text-white flex items-center justify-center text-[9px]`}>
              {exactContactMatch.name.charAt(0)}
            </span>
            <span>{exactContactMatch.name}</span>
            {exactContactMatch.company && (
              <span className="text-[10px] text-blue-600 font-normal">({exactContactMatch.company})</span>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3 h-3 text-blue-500" />
            <span>Type digits to dial or search contacts with T9</span>
          </div>
        )}
      </div>

      {/* Number Display Input & Actions */}
      <div className="w-full flex flex-col items-center justify-center mb-4 min-h-[68px]">
        <div className="relative w-full text-center px-4">
          <input
            id="dialer-number-display"
            type="text"
            readOnly
            value={inputNumber}
            placeholder="Dial number..."
            className="w-full text-center text-3xl sm:text-4xl font-bold font-mono tracking-wider text-slate-900 bg-transparent outline-none placeholder:text-slate-300 placeholder:font-sans"
          />
          {inputNumber && (
            <button
              onClick={handleClearAll}
              title="Clear all"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Formatted phone display subtitle if international/US */}
        {inputNumber.length >= 7 && (
          <span className="text-xs text-slate-500 font-mono tracking-wide mt-0.5">
            {formatPhoneNumber(inputNumber)}
          </span>
        )}
      </div>

      {/* 12 Keypad Dial Buttons (Grid 3x4) */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-xs mb-5">
        {KEYPAD_BUTTONS.map((btn) => {
          const isPressed = activeKey === btn.digit;
          return (
            <button
              key={btn.digit}
              id={`keypad-btn-${btn.digit === '*' ? 'star' : btn.digit === '#' ? 'hash' : btn.digit}`}
              onMouseDown={() => handleButtonMouseDown(btn)}
              onMouseUp={() => handleButtonMouseUp(btn)}
              onTouchStart={() => handleButtonMouseDown(btn)}
              onTouchEnd={() => handleButtonMouseUp(btn)}
              className={`group relative flex flex-col items-center justify-center h-16 sm:h-[70px] rounded-2xl transition-all duration-150 cursor-pointer border ${
                isPressed
                  ? 'bg-blue-100/90 border-blue-300 scale-95 shadow-inner'
                  : 'bg-white hover:bg-slate-50/90 active:bg-blue-50 border-slate-200/90 hover:border-blue-200 shadow-xs hover:shadow-md'
              }`}
            >
              <span className="text-2xl sm:text-[26px] font-semibold text-slate-800 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                {btn.digit}
              </span>

              {btn.subIcon ? (
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-slate-400 group-hover:text-blue-500 mt-1 uppercase tracking-wider">
                  <Voicemail className="w-2.5 h-2.5" />
                  VM
                </span>
              ) : btn.letters ? (
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 mt-0.5 uppercase tracking-widest leading-none">
                  {btn.letters}
                </span>
              ) : (
                <span className="h-3" />
              )}
            </button>
          );
        })}
      </div>

      {/* Action Row: Add contact, Call Button, Backspace */}
      <div className="w-full max-w-xs flex items-center justify-between px-2">
        {/* Left Side: Add Contact or Speed Dial Shortcut */}
        <div className="w-14 flex justify-center">
          {inputNumber.length > 0 && !exactContactMatch ? (
            <button
              id="add-contact-btn"
              onClick={() => onOpenAddContactModal(inputNumber)}
              title="Add to contacts"
              className="p-3.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-12 h-12" />
          )}
        </div>

        {/* Center: Gemini Pulsing Green Call Button */}
        <button
          id="dialer-call-action-btn"
          onClick={handleCall}
          disabled={!inputNumber.trim() && matchedContacts.length === 0}
          title={inputNumber.trim() ? `Call ${inputNumber}` : 'Enter a number to call'}
          className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 cursor-pointer ${
            inputNumber.trim() || matchedContacts.length > 0
              ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 hover:shadow-emerald-500/50'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
          }`}
        >
          {/* Subtle Gemini light ring animation */}
          {inputNumber.trim() && (
            <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping pointer-events-none" />
          )}
          <PhoneCall className="w-7 h-7 fill-white" />
        </button>

        {/* Right Side: Backspace / Delete Button */}
        <div className="w-14 flex justify-center">
          {inputNumber.length > 0 ? (
            <button
              id="dialer-backspace-btn"
              onClick={handleBackspace}
              title="Delete last digit"
              className="p-3.5 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-12 h-12" />
          )}
        </div>
      </div>

      {/* Helpful Hint Footer */}
      <p className="text-[11px] text-slate-400 mt-4 text-center font-medium">
        Press <span className="font-semibold text-slate-600">Enter</span> to dial • Hold <span className="font-semibold text-slate-600">1</span> for Voicemail • Hold <span className="font-semibold text-slate-600">0</span> for <span className="font-semibold text-slate-600">+</span>
      </p>
    </div>
  );
};
