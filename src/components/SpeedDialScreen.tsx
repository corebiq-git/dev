import React, { useState } from 'react';
import { Zap, Phone, Plus, UserX, Voicemail, X } from 'lucide-react';
import { Contact } from '../types';

interface SpeedDialScreenProps {
  contacts: Contact[];
  onCallNumber: (target: { name: string; phone: string; contactId?: string }) => void;
  onAssignSpeedDial: (contactId: string, slot: number) => void;
  onRemoveSpeedDial: (slot: number) => void;
  onSelectVoicemail: () => void;
}

export const SpeedDialScreen: React.FC<SpeedDialScreenProps> = ({
  contacts,
  onCallNumber,
  onAssignSpeedDial,
  onRemoveSpeedDial,
  onSelectVoicemail,
}) => {
  const [assigningSlot, setAssigningSlot] = useState<number | null>(null);

  // Slots 1 to 9
  const slots = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Candidates for assignment (contacts without speed dial)
  const unassignedContacts = contacts.filter((c) => !c.speedDialKey);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-full px-4 py-2">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span>Speed Dial Matrix (Keys 1 - 9)</span>
        </h2>
        <p className="text-xs text-slate-500">
          Hold down any number on the dial pad for 0.6s, or tap below to instantly call
        </p>
      </div>

      {/* 3x3 Grid of Speed Dial Slots */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 overflow-y-auto flex-1 pb-16">
        {slots.map((slot) => {
          if (slot === 1) {
            // Slot 1 is always Voicemail
            return (
              <div
                key={slot}
                onClick={onSelectVoicemail}
                className="group relative p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/70 hover:from-blue-100 hover:to-indigo-100/80 rounded-2xl border border-blue-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-mono font-extrabold text-xs flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-full border border-blue-200/60">
                    Default
                  </span>
                </div>

                <div className="my-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-xs text-blue-600 flex items-center justify-center mx-auto mb-2 border border-blue-100">
                    <Voicemail className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Voicemail Center</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">*86 Carrier Line</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVoicemail();
                  }}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5 fill-white" />
                  <span>Check Voicemail</span>
                </button>
              </div>
            );
          }

          // Check if a contact is assigned to this slot
          const contact = contacts.find((c) => c.speedDialKey === slot);

          if (contact) {
            return (
              <div
                key={slot}
                className="group relative p-3.5 bg-white hover:bg-slate-50/90 rounded-2xl border border-slate-200/90 hover:border-blue-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-mono font-extrabold text-xs flex items-center justify-center shadow-xs">
                    {slot}
                  </span>
                  <button
                    onClick={() => onRemoveSpeedDial(slot)}
                    title="Remove speed dial"
                    className="text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="my-2 text-center">
                  <div
                    className={`w-12 h-12 rounded-2xl ${contact.avatarBg} text-white flex items-center justify-center text-lg font-bold mx-auto mb-2 shadow-xs`}
                  >
                    {contact.name.charAt(0)}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 truncate px-1">
                    {contact.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                    {contact.phone}
                  </p>
                  {contact.company && (
                    <span className="inline-block text-[10px] text-blue-600 font-medium truncate max-w-full">
                      {contact.company}
                    </span>
                  )}
                </div>

                <button
                  onClick={() =>
                    onCallNumber({
                      name: contact.name,
                      phone: contact.phone,
                      contactId: contact.id,
                    })
                  }
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 fill-white" />
                  <span>Call Key {slot}</span>
                </button>
              </div>
            );
          }

          // Empty slot
          return (
            <div
              key={slot}
              onClick={() => setAssigningSlot(slot)}
              className="group p-3.5 bg-slate-50/60 hover:bg-blue-50/40 rounded-2xl border border-dashed border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between items-center text-center cursor-pointer min-h-[190px]"
            >
              <div className="w-full flex justify-start">
                <span className="w-7 h-7 rounded-xl bg-slate-200 text-slate-600 font-mono font-extrabold text-xs flex items-center justify-center">
                  {slot}
                </span>
              </div>

              <div className="my-auto py-2">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-300 flex items-center justify-center mx-auto mb-2 transition-all">
                  <Plus className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-600 group-hover:text-blue-700">
                  Assign Slot {slot}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Hold key {slot} on keypad</p>
              </div>

              <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-600">
                + Select Contact
              </span>
            </div>
          );
        })}
      </div>

      {/* Slot Assignment Contact Picker Modal */}
      {assigningSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 relative max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Assign Speed Dial {assigningSlot}
                </h3>
                <p className="text-xs text-slate-500">Pick a contact to assign to key {assigningSlot}</p>
              </div>
              <button
                onClick={() => setAssigningSlot(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 my-3 overflow-y-auto flex-1">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => {
                    onAssignSpeedDial(contact.id, assigningSlot);
                    setAssigningSlot(null);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full ${contact.avatarBg} text-white flex items-center justify-center text-xs font-bold`}
                    >
                      {contact.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{contact.name}</p>
                      <p className="text-[11px] font-mono text-slate-500">{contact.phone}</p>
                    </div>
                  </div>

                  {contact.speedDialKey ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Key {contact.speedDialKey}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-blue-600">+ Assign</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
