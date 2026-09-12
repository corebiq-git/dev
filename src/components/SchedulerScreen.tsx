import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MessageSquare,
  Phone,
  Send,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  User,
  Check
} from 'lucide-react';
import { Contact, ScheduledTask, DialerSettings } from '../types';

interface SchedulerScreenProps {
  contacts: Contact[];
  tasks: ScheduledTask[];
  settings: DialerSettings;
  onAddTask: (task: Omit<ScheduledTask, 'id' | 'createdAt'>) => void;
  onDeleteTask: (id: string) => void;
  onCallNumber: (target: { name: string; phone: string }) => void;
  onUpdateSettings: (settings: Partial<DialerSettings>) => void;
}

export const SchedulerScreen: React.FC<SchedulerScreenProps> = ({
  contacts,
  tasks,
  settings,
  onAddTask,
  onDeleteTask,
  onCallNumber,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'calls' | 'whatsapp'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'call' | 'whatsapp'>('whatsapp');

  // New task form state
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('Today, 6:00 PM');
  const [noteOrMessage, setNoteOrMessage] = useState<string>('');
  const [autoDial, setAutoDial] = useState<boolean>(true);

  // Template suggestions for WhatsApp
  const whatsappTemplates = [
    "Hi! Missed your call on CM Dialer. I'm in a meeting, will call you back shortly.",
    "Following up on our earlier call regarding the CoreBIQ project deliverables.",
    "Could you please share the updated invoice / document on WhatsApp?",
    "Confirming our scheduled call for tomorrow. Let me know if that time still works for you."
  ];

  const handleOpenAddModal = (type: 'call' | 'whatsapp') => {
    setModalType(type);
    setSelectedContactId(contacts[0]?.id || '');
    setCustomName(contacts[0]?.name || '');
    setCustomPhone(contacts[0]?.phone || '');
    setNoteOrMessage(type === 'whatsapp' ? whatsappTemplates[0] : 'Discuss project updates and milestones');
    setScheduledTime('Today, 5:30 PM');
    setShowAddModal(true);
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    const found = contacts.find((c) => c.id === contactId);
    if (found) {
      setCustomName(found.name);
      setCustomPhone(found.phone);
    }
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customPhone) return;

    onAddTask({
      type: modalType,
      contactName: customName,
      phone: customPhone,
      scheduledTime: scheduledTime || 'Soon',
      status: 'pending',
      autoDial: modalType === 'call' ? autoDial : false,
      message: modalType === 'whatsapp' ? noteOrMessage : undefined,
      note: modalType === 'call' ? noteOrMessage : undefined,
    });

    setShowAddModal(false);
  };

  const handleTriggerWhatsApp = (phone: string, message?: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message || 'Hello from CM Dialer');
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'calls') return t.type === 'call';
    if (activeTab === 'whatsapp') return t.type === 'whatsapp';
    return true;
  });

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full px-4 py-2">
      {/* Top Banner: Auto-Reply Rule & Quick Action */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-4 sm:p-5 mb-4 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              <h2 className="text-base sm:text-lg font-bold">Auto Call & WhatsApp Scheduler</h2>
            </div>
            <p className="text-xs text-blue-100 leading-relaxed">
              Automate follow-up calls or send scheduled WhatsApp messages automatically. Set instant
              auto-reply rules when you miss a call or are busy.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenAddModal('whatsapp')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>+ Schedule WhatsApp</span>
            </button>
            <button
              onClick={() => handleOpenAddModal('call')}
              className="px-3.5 py-2 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>+ Schedule Call</span>
            </button>
          </div>
        </div>

        {/* Missed Call Auto-WhatsApp Rule */}
        <div className="mt-4 pt-3 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-white">Auto WhatsApp on Missed Call:</span>
            <span className="text-blue-200 truncate max-w-xs sm:max-w-md">
              "{settings.whatsappMissedMessage}"
            </span>
          </div>
          <button
            onClick={() =>
              onUpdateSettings({ autoWhatsAppOnMissed: !settings.autoWhatsAppOnMissed })
            }
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              settings.autoWhatsAppOnMissed
                ? 'bg-emerald-400 text-slate-900 shadow-xs'
                : 'bg-white/20 text-white'
            }`}
          >
            {settings.autoWhatsAppOnMissed ? 'Auto Rule Active' : 'Auto Rule Off'}
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Scheduled ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp ({tasks.filter((t) => t.type === 'whatsapp').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'calls'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Calls ({tasks.filter((t) => t.type === 'call').length})</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono hidden sm:inline">
          Automatic execution engine
        </span>
      </div>

      {/* Tasks List */}
      <div className="flex-1 space-y-3 pb-16 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-3xl border border-dashed border-slate-200">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Scheduled Tasks Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Schedule a telephone call or automated WhatsApp message to stay on top of your client communications.
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => handleOpenAddModal('whatsapp')}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-100"
              >
                + Schedule WhatsApp
              </button>
              <button
                onClick={() => handleOpenAddModal('call')}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-100"
              >
                + Schedule Call
              </button>
            </div>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    task.type === 'whatsapp'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}
                >
                  {task.type === 'whatsapp' ? (
                    <MessageSquare className="w-5 h-5" />
                  ) : (
                    <Phone className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {task.contactName}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.type === 'whatsapp'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {task.type === 'whatsapp' ? 'WhatsApp Message' : 'Phone Call'}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-500 mt-0.5">{task.phone}</p>

                  {task.type === 'whatsapp' && task.message && (
                    <p className="text-xs text-slate-700 bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 mt-2 leading-relaxed">
                      "{task.message}"
                    </p>
                  )}

                  {task.type === 'call' && task.note && (
                    <p className="text-xs text-slate-600 italic mt-1">Note: {task.note}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-indigo-600">
                      <Clock className="w-3.5 h-3.5" />
                      {task.scheduledTime}
                    </span>
                    {task.autoDial && (
                      <span className="text-slate-500">• Auto-Prompt Enabled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {task.type === 'whatsapp' ? (
                  <button
                    onClick={() => handleTriggerWhatsApp(task.phone, task.message)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <span>Send on WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      onCallNumber({
                        name: task.contactName,
                        phone: task.phone,
                      })
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </button>
                )}

                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete scheduled task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Schedule Call or WhatsApp Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    modalType === 'whatsapp'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {modalType === 'whatsapp' ? (
                    <MessageSquare className="w-4 h-4" />
                  ) : (
                    <Phone className="w-4 h-4" />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalType === 'whatsapp' ? 'Schedule WhatsApp Message' : 'Schedule Call'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5 text-xs">
              {/* Select Existing Contact */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Contact:</label>
                <select
                  value={selectedContactId}
                  onChange={(e) => handleContactSelect(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Or Manual Phone Number */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Name:</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number:</label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Scheduled Time */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Schedule For:</label>
                <div className="flex gap-1.5 mb-2">
                  {['In 15 min', 'In 1 hour', 'Tomorrow 10 AM'].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setScheduledTime(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                        scheduledTime === preset
                          ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  placeholder="e.g. Today 5:00 PM, Tomorrow 9:30 AM"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Message / Note */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {modalType === 'whatsapp' ? 'WhatsApp Message Content:' : 'Call Objective / Note:'}
                </label>
                {modalType === 'whatsapp' && (
                  <div className="space-y-1 mb-2">
                    <span className="text-[10px] font-bold text-slate-500">Quick Templates:</span>
                    <div className="flex flex-wrap gap-1">
                      {whatsappTemplates.map((tmpl, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setNoteOrMessage(tmpl)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 truncate max-w-[200px] border border-slate-200 cursor-pointer"
                        >
                          {tmpl.slice(0, 30)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <textarea
                  value={noteOrMessage}
                  onChange={(e) => setNoteOrMessage(e.target.value)}
                  rows={3}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-md cursor-pointer transition-all active:scale-95 ${
                    modalType === 'whatsapp'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
