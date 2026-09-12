import React, { useState, useMemo } from 'react';
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Sparkles,
  Phone,
  Info,
  Clock,
  Trash2,
  X,
  FileText
} from 'lucide-react';
import { CallRecord, CallType } from '../types';

interface RecentCallsProps {
  calls: CallRecord[];
  onCallNumber: (target: { name: string; phone: string; contactId?: string }) => void;
  onClearHistory: () => void;
}

export const RecentCalls: React.FC<RecentCallsProps> = ({
  calls,
  onCallNumber,
  onClearHistory,
}) => {
  const [filter, setFilter] = useState<'all' | 'missed' | 'outgoing' | 'incoming'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  // Filtered list
  const filteredCalls = useMemo(() => {
    return calls.filter((record) => {
      // Filter by type
      if (filter === 'missed' && record.type !== 'missed') return false;
      if (filter === 'outgoing' && record.type !== 'outgoing') return false;
      if (filter === 'incoming' && record.type !== 'incoming') return false;

      // Filter by query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = record.name.toLowerCase().includes(query);
        const matchesPhone = record.phone.toLowerCase().includes(query);
        return matchesName || matchesPhone;
      }
      return true;
    });
  }, [calls, filter, searchQuery]);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s (Missed)';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const renderCallIcon = (type: CallType) => {
    switch (type) {
      case 'missed':
        return <PhoneMissed className="w-4 h-4 text-rose-500" />;
      case 'incoming':
        return <PhoneIncoming className="w-4 h-4 text-blue-600" />;
      case 'outgoing':
        return <PhoneOutgoing className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-full px-4 py-2">
      {/* Search & Filter Header */}
      <div className="mb-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="recent-calls-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent calls or numbers..."
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Clear History Button */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-1.5">
            {(['all', 'missed', 'outgoing', 'incoming'] as const).map((tab) => (
              <button
                key={tab}
                id={`filter-${tab}-btn`}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {calls.length > 0 && (
            <button
              id="clear-call-history-btn"
              onClick={onClearHistory}
              title="Clear call log"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Call Log List */}
      <div className="space-y-2 overflow-y-auto flex-1 pb-16">
        {filteredCalls.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No calls found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try matching a different caller or number' : 'Your recent call activity will appear here'}
            </p>
          </div>
        ) : (
          filteredCalls.map((record) => (
            <div
              key={record.id}
              className="group flex items-center justify-between p-3 sm:p-3.5 bg-white hover:bg-blue-50/30 rounded-2xl border border-slate-200/80 hover:border-blue-200 transition-all shadow-xs hover:shadow-sm"
            >
              {/* Left: Direction Icon + Info */}
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => setSelectedCall(record)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                    record.type === 'missed'
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : record.type === 'incoming'
                      ? 'bg-blue-50 border-blue-200 text-blue-600'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  }`}
                >
                  {renderCallIcon(record.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold truncate ${
                        record.type === 'missed' ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {record.name}
                    </span>
                    {record.aiSummary && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                        <Sparkles className="w-2.5 h-2.5 text-violet-600" />
                        AI Notes
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                    <span>{record.phone}</span>
                    <span>•</span>
                    <span className="font-sans">{record.timeFormatted}</span>
                    {record.durationSeconds > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-sans text-slate-400">{formatDuration(record.durationSeconds)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => setSelectedCall(record)}
                  title="View call details & AI summary"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    onCallNumber({
                      name: record.name,
                      phone: record.phone,
                      contactId: record.contactId,
                    })
                  }
                  title={`Call ${record.name}`}
                  className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl border border-emerald-200 hover:border-emerald-300 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Phone className="w-4 h-4 fill-emerald-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Call Details Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className={`p-1.5 rounded-lg ${
                    selectedCall.type === 'missed'
                      ? 'bg-rose-100 text-rose-600'
                      : selectedCall.type === 'incoming'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  {renderCallIcon(selectedCall.type)}
                </span>
                <span className="font-bold text-slate-800 capitalize text-sm">
                  {selectedCall.type} Call Details
                </span>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Caller Header in Modal */}
            <div className="my-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-violet-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-2 shadow-sm">
                {selectedCall.name.charAt(0)}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{selectedCall.name}</h3>
              <p className="text-xs font-mono text-slate-500">{selectedCall.phone}</p>
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                <span>{selectedCall.timeFormatted}</span>
                <span>•</span>
                <span>Duration: {formatDuration(selectedCall.durationSeconds)}</span>
              </div>
            </div>

            {/* Gemini AI Intelligence Section */}
            {selectedCall.aiSummary && (
              <div className="p-3.5 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 rounded-2xl border border-blue-200/80 mb-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Gemini AI Call Summary</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedCall.aiSummary}
                </p>

                {selectedCall.transcript && (
                  <div className="mt-3 pt-2 border-t border-blue-200/60">
                    <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                      Transcript Excerpt
                    </span>
                    <p className="text-xs text-slate-600 italic bg-white/70 p-2.5 rounded-xl border border-blue-100 font-mono">
                      "{selectedCall.transcript}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedCall(null);
                  onCallNumber({
                    name: selectedCall.name,
                    phone: selectedCall.phone,
                    contactId: selectedCall.contactId,
                  });
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
              >
                <Phone className="w-4 h-4 fill-white" />
                <span>Call {selectedCall.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
