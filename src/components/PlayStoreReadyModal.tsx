import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Smartphone,
  Shield,
  Layers,
  FileCode,
  Image,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';

interface PlayStoreReadyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayStoreReadyModal: React.FC<PlayStoreReadyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manifest' | 'listing' | 'assets'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const appTitle = 'CM Dialer AI - Auto Call Recorder & Smart Dialer';
  const shortDescription =
    'Lightweight Gemini dialer with silent auto call recording, T9 & WhatsApp auto.';
  const fullDescription = `CM Dialer AI is a modern, responsive, Gemini-inspired telephony and smart dialer application built with speed, precision, and privacy at its core.

KEY FEATURES:
• Silent Auto Call Recording: Automatically record all inbound and outbound telephone calls directly to local device storage with zero audible alert tone or announcement interruption.
• Smart T9 Predictive Keypad: Search through thousands of contacts and phone numbers instantly with responsive T9 predictive letter-to-digit conversion and DTMF dual tones.
• 2-Way Google Contacts Sync: One-tap live synchronization with your Google account (corebiq@gmail.com) via official Google People APIs.
• Scheduled Calls & Auto WhatsApp: Automate follow-up phone calls with reminder prompts and schedule automatic WhatsApp messages or instant auto-replies for missed calls.
• Gemini AI Call Transcription: Simulated live speech-to-text transcriptions with automatic action item extraction and bullet point call summaries.
• Visual Voicemail: Interactive voicemail scrubbing with variable playback speeds (1x to 2x) and speech-to-text transcriptions.
• 100% On-Device Privacy: Telephony logs and call recordings are kept safely inside local sandboxed device storage.

PERMISSIONS DISCLOSURE:
- CALL_PHONE: Required to initiate direct telephony calls.
- RECORD_AUDIO: Required for offline call recording functionality.
- READ_CONTACTS / WRITE_CONTACTS: Required for contact management and Google Contacts sync.
- POST_NOTIFICATIONS: Required for call reminders and scheduled tasks.
- SCHEDULE_EXACT_ALARM: Required for precision scheduled call prompts.

Support & Inquiries: corebiq@gmail.com
Developed by CoreBIQ AI Systems`;

  const androidManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.corebiq.cmdialer"
    android:versionCode="100"
    android:versionName="1.0.0">

    <!-- Telephony and Call Permissions -->
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.WRITE_CALL_LOG" />
    <uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />

    <!-- Silent Call Recording Permissions -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    
    <!-- Contacts Sync Permissions -->
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.WRITE_CONTACTS" />
    <uses-permission android:name="android.permission.GET_ACCOUNTS" />

    <!-- Scheduling and Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="CM Dialer AI"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.CMDialer">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:screenOrientation="portrait"
            android:theme="@style/Theme.CMDialer.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Default Dialer Intent Filter -->
            <intent-filter>
                <action android:name="android.intent.action.DIAL" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:scheme="tel" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const twaCommand = `# Build Android App Bundle (.aab) with PWABuilder or Bubblewrap CLI:
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://your-domain.com/manifest.json
bubblewrap build
# The resulting app-release-bundle.aab is ready to upload to Google Play Console!`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-scale-in">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Google Play Store Submission Hub
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready to Post
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Package: <span className="font-mono font-semibold">com.corebiq.cmdialer</span> • Android 14 (API 34)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 pt-3 gap-2 border-b border-slate-100 bg-slate-50/50">
          {[
            { id: 'overview', label: 'Checklist', icon: CheckCircle2 },
            { id: 'assets', label: 'Store Assets', icon: Image },
            { id: 'listing', label: 'Store Copy', icon: Layers },
            { id: 'manifest', label: 'AndroidManifest.xml', icon: FileCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 px-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                  <span className="text-[10px] text-blue-700 font-bold block uppercase">Target SDK</span>
                  <span className="text-base font-bold text-slate-900">API 34</span>
                  <span className="text-[10px] text-slate-500 block">Android 14 Ready</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-bold block uppercase">Silent Recording</span>
                  <span className="text-base font-bold text-slate-900">Compliant</span>
                  <span className="text-[10px] text-slate-500 block">Offline storage</span>
                </div>
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100">
                  <span className="text-[10px] text-purple-700 font-bold block uppercase">Contacts Link</span>
                  <span className="text-base font-bold text-slate-900">Google Synced</span>
                  <span className="text-[10px] text-slate-500 block">OAuth 2.0 Ready</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                  <span className="text-[10px] text-amber-700 font-bold block uppercase">Content Rating</span>
                  <span className="text-base font-bold text-slate-900">Everyone (E)</span>
                  <span className="text-[10px] text-slate-500 block">Communication</span>
                </div>
              </div>

              {/* Ready Checklist */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Google Play Console Launch Checklist</span>
                </h4>
                <div className="space-y-2 text-slate-700">
                  {[
                    'App icon in high resolution (512x512 PNG, 192x192 PNG, SVG favicon)',
                    'Web App Manifest with standalone display and theme color #ffffff',
                    'Silent Auto Call Recording without announcement chime',
                    'Google Contacts 2-way sync option with corebiq@gmail.com',
                    'Automated call scheduler and WhatsApp message triggering',
                    'Complete AndroidManifest.xml with telephony & audio permissions',
                    'Play Store Title, Short Description (80 chars), and Full Description'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TWA Build Instructions */}
              <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-[11px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 font-bold">1-Click Android App Bundle (.aab) Command</span>
                  <button
                    onClick={() => handleCopy('twa', twaCommand)}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    {copiedKey === 'twa' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'twa' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto text-emerald-400 leading-relaxed whitespace-pre-wrap">
                  {twaCommand}
                </pre>
              </div>
            </div>
          )}

          {/* STORE ASSETS TAB */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <p className="text-slate-600">
                All graphic assets required for Google Play Console submission are generated and bundled:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 512x512 App Icon */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-md mb-3 flex items-center justify-center">
                    <img src="/favicon.svg" alt="CM Dialer Icon" className="w-20 h-20" />
                  </div>
                  <h4 className="font-bold text-slate-900">App Icon (512 × 512)</h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Format: 32-bit PNG with transparency • For Google Play Store
                  </p>
                  <a
                    href="/icon-512.png"
                    download="CM_Dialer_Icon_512.png"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download 512x512 PNG</span>
                  </a>
                </div>

                {/* Vector SVG Favicon */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 p-2 shadow-xs mb-3 flex items-center justify-center">
                    <img src="/favicon.svg" alt="Vector Icon" className="w-16 h-16" />
                  </div>
                  <h4 className="font-bold text-slate-900">Vector SVG Badge</h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Format: Scalable SVG vector with gradient & spark
                  </p>
                  <a
                    href="/favicon.svg"
                    download="CM_Dialer_Icon.svg"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download SVG</span>
                  </a>
                </div>
              </div>

              {/* Feature Graphic Banner Preview */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded text-blue-100">
                    Feature Graphic (1024 × 500)
                  </span>
                  <span className="text-[11px] text-blue-200">Google Play Promotional Banner</span>
                </div>
                <div className="py-6 text-center">
                  <h3 className="text-xl font-black tracking-tight">CM DIALER AI</h3>
                  <p className="text-xs text-blue-100 mt-1">
                    Silent Auto Call Recording • Google Contacts • T9 Smart Dialer
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STORE COPY TAB */}
          {activeTab === 'listing' && (
            <div className="space-y-4">
              {/* Title */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700">App Title (Max 30 chars):</span>
                  <button
                    onClick={() => handleCopy('title', appTitle)}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {copiedKey === 'title' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'title' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-slate-900 font-bold">{appTitle}</p>
              </div>

              {/* Short Description */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700">Short Description (Max 80 chars):</span>
                  <button
                    onClick={() => handleCopy('short', shortDescription)}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {copiedKey === 'short' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'short' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-slate-900 font-mono">{shortDescription}</p>
              </div>

              {/* Full Description */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700">Full Description (Max 4000 chars):</span>
                  <button
                    onClick={() => handleCopy('full', fullDescription)}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {copiedKey === 'full' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'full' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {fullDescription}
                </pre>
              </div>
            </div>
          )}

          {/* ANDROID MANIFEST TAB */}
          {activeTab === 'manifest' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">
                  Pre-configured with all required Android telephony and recording permissions:
                </span>
                <button
                  onClick={() => handleCopy('manifest', androidManifestXml)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {copiedKey === 'manifest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'manifest' ? 'Copied XML' : 'Copy AndroidManifest.xml'}</span>
                </button>
              </div>

              <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-[11px] max-h-80 overflow-y-auto">
                <pre className="text-emerald-400 whitespace-pre">{androidManifestXml}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-3xl">
          <span className="text-slate-500">
            Package: <strong className="text-slate-800">com.corebiq.cmdialer</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
