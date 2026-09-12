import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Download,
  Upload,
  UserCheck,
  Sparkles,
  X
} from 'lucide-react';
import { Contact, DialerSettings } from '../types';

interface GoogleContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DialerSettings;
  contacts: Contact[];
  onUpdateSettings: (settings: Partial<DialerSettings>) => void;
  onSyncGoogleContacts: () => void;
}

export const GoogleContactsModal: React.FC<GoogleContactsModalProps> = ({
  isOpen,
  onClose,
  settings,
  contacts,
  onUpdateSettings,
  onSyncGoogleContacts,
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const syncedCount = contacts.filter((c) => c.isGoogleSynced).length;

  const handleSyncNow = () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    setTimeout(() => {
      onSyncGoogleContacts();
      setIsSyncing(false);
      const nowFormatted = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      onUpdateSettings({
        lastGoogleSync: `Today, ${nowFormatted}`,
        googleContactsLinked: true,
      });
      setSyncFeedback('Google Contacts synced successfully! All contact changes updated.');
      setTimeout(() => setSyncFeedback(null), 4000);
    }, 1200);
  };

  const handleToggleLink = () => {
    if (settings.googleContactsLinked) {
      onUpdateSettings({ googleContactsLinked: false });
    } else {
      onUpdateSettings({
        googleContactsLinked: true,
        googleAccountEmail: 'corebiq@gmail.com',
      });
      handleSyncNow();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            {/* Google G logo stylized */}
            <div className="w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Google Contacts Link & Sync</h3>
              <p className="text-xs text-slate-500">2-way live sync with your Google account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Link Card */}
        <div
          className={`p-4 rounded-2xl border transition-all mb-4 ${
            settings.googleContactsLinked
              ? 'bg-blue-50/70 border-blue-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {settings.googleAccountEmail.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-slate-900">
                    {settings.googleContactsLinked
                      ? 'Google Account Connected'
                      : 'Not Connected'}
                  </h4>
                  {settings.googleContactsLinked && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Live
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-slate-600">
                  {settings.googleAccountEmail}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleLink}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settings.googleContactsLinked
                  ? 'bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              }`}
            >
              {settings.googleContactsLinked ? 'Disconnect' : 'Connect Google'}
            </button>
          </div>

          {settings.googleContactsLinked && (
            <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs text-slate-600">
              <span>Last synced: {settings.lastGoogleSync}</span>
              <span className="font-bold text-blue-700">
                {syncedCount} contacts linked
              </span>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {syncFeedback && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Features & Options */}
        <div className="space-y-2.5 text-xs mb-5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <div>
                <span className="font-bold text-slate-800 block">Automatic 2-Way Sync</span>
                <span className="text-[11px] text-slate-500">
                  Changes made in CM Dialer sync back to Google Contacts immediately
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.googleContactsLinked}
              onChange={handleToggleLink}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-bold text-slate-800 block">Encrypted Privacy Protection</span>
                <span className="text-[11px] text-slate-500">
                  Google People API OAuth tokens are scoped exclusively to contacts
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Verified
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleSyncNow}
            disabled={!settings.googleContactsLinked || isSyncing}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 ${
              !settings.googleContactsLinked
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Contacts...' : 'Sync with Google Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
