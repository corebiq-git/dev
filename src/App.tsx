import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Keypad } from './components/Keypad';
import { InCallScreen } from './components/InCallScreen';
import { IncomingCallModal } from './components/IncomingCallModal';
import { RecentCalls } from './components/RecentCalls';
import { ContactsList } from './components/ContactsList';
import { VoicemailScreen } from './components/VoicemailScreen';
import { SpeedDialScreen } from './components/SpeedDialScreen';
import { CallRecordingsScreen } from './components/CallRecordingsScreen';
import { SchedulerScreen } from './components/SchedulerScreen';
import { GoogleContactsModal } from './components/GoogleContactsModal';
import { PlayStoreReadyModal } from './components/PlayStoreReadyModal';
import {
  Contact,
  CallRecord,
  VoicemailItem,
  ActiveCallState,
  NavigationTab,
  TranscriptLine,
  CallRecording,
  ScheduledTask,
  DialerSettings
} from './types';
import {
  INITIAL_CONTACTS,
  INITIAL_CALL_RECORDS,
  INITIAL_VOICEMAILS,
  INITIAL_RECORDINGS,
  INITIAL_SCHEDULED_TASKS,
  INITIAL_SETTINGS,
  formatPhoneNumber
} from './data/initialData';
import { dialerAudio } from './utils/audio';
import { Smartphone, Monitor, Sparkles } from 'lucide-react';

export default function App() {
  // Local storage persisted state
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('cmdialer_contacts_v2');
      return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
    } catch {
      return INITIAL_CONTACTS;
    }
  });

  const [calls, setCalls] = useState<CallRecord[]>(() => {
    try {
      const saved = localStorage.getItem('cmdialer_calls_v2');
      return saved ? JSON.parse(saved) : INITIAL_CALL_RECORDS;
    } catch {
      return INITIAL_CALL_RECORDS;
    }
  });

  const [voicemails, setVoicemails] = useState<VoicemailItem[]>(() => {
    try {
      const saved = localStorage.getItem('cmdialer_voicemails_v2');
      return saved ? JSON.parse(saved) : INITIAL_VOICEMAILS;
    } catch {
      return INITIAL_VOICEMAILS;
    }
  });

  const [recordings, setRecordings] = useState<CallRecording[]>(() => {
    try {
      const saved = localStorage.getItem('cmdialer_recordings_v2');
      return saved ? JSON.parse(saved) : INITIAL_RECORDINGS;
    } catch {
      return INITIAL_RECORDINGS;
    }
  });

  const [tasks, setTasks] = useState<ScheduledTask[]>(() => {
    try {
      const saved = localStorage.getItem('cmdialer_tasks_v2');
      return saved ? JSON.parse(saved) : INITIAL_SCHEDULED_TASKS;
    } catch {
      return INITIAL_SCHEDULED_TASKS;
    }
  });

  const [settings, setSettings] = useState<DialerSettings>(() => {
    try {
      const saved = localStorage.getItem('cmdialer_settings_v2');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<NavigationTab>('keypad');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [phoneToAddToContacts, setPhoneToAddToContacts] = useState<string | null>(null);
  const [desktopViewMode, setDesktopViewMode] = useState<'handset' | 'expanded'>('handset');

  // Modals state
  const [isGoogleContactsModalOpen, setIsGoogleContactsModalOpen] = useState<boolean>(false);
  const [isPlayStoreModalOpen, setIsPlayStoreModalOpen] = useState<boolean>(false);

  // Active call state
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    name: string;
    phone: string;
    company?: string;
    role?: string;
  } | null>(null);

  const callDurationTimerRef = useRef<number | null>(null);
  const callConnectTimeoutRef = useRef<number | null>(null);
  const transcriptTimeoutRef = useRef<number | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('cmdialer_contacts_v2', JSON.stringify(contacts));
    } catch {
      // ignore
    }
  }, [contacts]);

  useEffect(() => {
    try {
      localStorage.setItem('cmdialer_calls_v2', JSON.stringify(calls));
    } catch {
      // ignore
    }
  }, [calls]);

  useEffect(() => {
    try {
      localStorage.setItem('cmdialer_voicemails_v2', JSON.stringify(voicemails));
    } catch {
      // ignore
    }
  }, [voicemails]);

  useEffect(() => {
    try {
      localStorage.setItem('cmdialer_recordings_v2', JSON.stringify(recordings));
    } catch {
      // ignore
    }
  }, [recordings]);

  useEffect(() => {
    try {
      localStorage.setItem('cmdialer_tasks_v2', JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('cmdialer_settings_v2', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Handle active call duration timer
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected' && !activeCall.isHold) {
      callDurationTimerRef.current = window.setInterval(() => {
        setActiveCall((prev) => {
          if (!prev) return null;
          return { ...prev, duration: prev.duration + 1 };
        });
      }, 1000);
    } else {
      if (callDurationTimerRef.current) {
        clearInterval(callDurationTimerRef.current);
        callDurationTimerRef.current = null;
      }
    }
    return () => {
      if (callDurationTimerRef.current) {
        clearInterval(callDurationTimerRef.current);
      }
    };
  }, [activeCall?.status, activeCall?.isHold]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      dialerAudio.stopRingback();
      if (callDurationTimerRef.current) clearInterval(callDurationTimerRef.current);
      if (callConnectTimeoutRef.current) clearTimeout(callConnectTimeoutRef.current);
      if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    };
  }, []);

  // START OUTGOING CALL
  const handleStartCall = (target: { name: string; phone: string; contactId?: string }) => {
    dialerAudio.startRingback();

    const initialTranscript: TranscriptLine[] = [
      {
        id: 't-1',
        speaker: 'gemini_ai',
        text: 'CM Dialer HD Voice link established. End-to-end encryption activated.',
        time: '00:00',
      },
    ];

    const matchedContact = contacts.find((c) => c.id === target.contactId || c.phone === target.phone);

    const newCall: ActiveCallState = {
      status: 'ringing',
      contact: {
        id: target.contactId,
        name: target.name,
        phone: target.phone,
        role: matchedContact?.role,
        company: matchedContact?.company,
      },
      duration: 0,
      isMuted: false,
      isSpeaker: false,
      isHold: false,
      isRecording: settings.autoRecord,
      silentRecording: settings.announcementMode === 'none',
      recordingDuration: 0,
      transcript: initialTranscript,
      aiSummary: `Connecting to ${target.name} via high-bandwidth carrier gateway...`,
    };

    setActiveCall(newCall);

    // Simulate answer after 2.8 seconds
    callConnectTimeoutRef.current = window.setTimeout(() => {
      dialerAudio.stopRingback();
      dialerAudio.playConnectedChime();

      setActiveCall((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'connected',
          aiSummary: `Connected to ${prev.contact.name}. Gemini speech transcription active.`,
          transcript: [
            ...prev.transcript,
            {
              id: 't-2',
              speaker: 'other',
              text: `Hello! This is ${prev.contact.name}. Glad we connected!`,
              time: '00:01',
            },
          ],
        };
      });

      // Add conversational speech bubbles simulating Gemini live transcription
      transcriptTimeoutRef.current = window.setTimeout(() => {
        setActiveCall((prev) => {
          if (!prev || prev.status !== 'connected') return prev;
          return {
            ...prev,
            transcript: [
              ...prev.transcript,
              {
                id: 't-3',
                speaker: 'other',
                text: 'Reviewing the latest metrics. The CM Dialer telephony bridge is running smoothly.',
                time: '00:07',
              },
            ],
            aiSummary: 'Discussion in progress: Real-time network telemetry and deployment sync.',
          };
        });
      }, 7000);
    }, 2800);
  };

  // END CALL
  const handleEndCall = () => {
    dialerAudio.stopRingback();
    dialerAudio.playHangupTone();

    if (callDurationTimerRef.current) clearInterval(callDurationTimerRef.current);
    if (callConnectTimeoutRef.current) clearTimeout(callConnectTimeoutRef.current);
    if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);

    if (activeCall) {
      const finalDuration = activeCall.duration;
      const callRecordId = `call-${Date.now()}`;
      const recId = (activeCall.isRecording && finalDuration > 0) ? `rec-${Date.now()}` : undefined;

      const newRecord: CallRecord = {
        id: callRecordId,
        contactId: activeCall.contact.id,
        name: activeCall.contact.name,
        phone: activeCall.contact.phone,
        type: 'outgoing',
        timestamp: new Date().toISOString(),
        timeFormatted: 'Just now',
        durationSeconds: finalDuration,
        aiSummary: activeCall.aiSummary || `Call completed (${finalDuration}s). CM Dialer HD Voice.`,
        transcript: activeCall.transcript.map((t) => `${t.speaker}: "${t.text}"`).join(' '),
        recordingId: recId,
      };

      setCalls((prev) => [newRecord, ...prev]);

      // If call was recorded, store it in CallRecordings
      if (activeCall.isRecording && finalDuration > 0) {
        const newRecording: CallRecording = {
          id: recId || `rec-${Date.now()}`,
          callId: callRecordId,
          name: activeCall.contact.name,
          phone: activeCall.contact.phone,
          timestamp: 'Just now',
          durationSeconds: finalDuration,
          silentRecorded: activeCall.silentRecording,
          waveform: [30, 50, 70, 85, 60, 45, 65, 80, 90, 75, 50, 60, 75, 85, 70, 55, 65, 80, 90, 60],
          transcript: activeCall.transcript.map((t) => `${t.speaker}: "${t.text}"`).join(' '),
          aiKeyPoints: [
            `Silent call recording mode: Zero announcement chime played`,
            `Total call duration: ${finalDuration}s saved to local device storage`,
            activeCall.aiSummary || 'High-fidelity audio recording saved locally'
          ]
        };
        setRecordings((prev) => [newRecording, ...prev]);
      }
    }

    setActiveCall(null);
  };

  // SIMULATE INCOMING CALL
  const handleTriggerIncomingCall = () => {
    if (activeCall) return; // don't interrupt active call
    dialerAudio.startRingback();

    // Pick a realistic caller or Elena Rostova
    const caller = contacts[0] || {
      name: 'Elena Rostova',
      phone: '+1 (415) 882-9014',
      company: 'CM Technologies',
      role: 'VP Engineering',
    };

    setIncomingCall({
      name: caller.name,
      phone: caller.phone,
      company: caller.company,
      role: caller.role,
    });
  };

  // ACCEPT INCOMING CALL
  const handleAcceptIncomingCall = () => {
    dialerAudio.stopRingback();
    dialerAudio.playConnectedChime();

    if (!incomingCall) return;

    const matched = contacts.find((c) => c.phone === incomingCall.phone);

    setActiveCall({
      status: 'connected',
      contact: {
        id: matched?.id,
        name: incomingCall.name,
        phone: incomingCall.phone,
        role: incomingCall.role,
        company: incomingCall.company,
      },
      duration: 0,
      isMuted: false,
      isSpeaker: false,
      isHold: false,
      isRecording: settings.autoRecord,
      silentRecording: settings.announcementMode === 'none',
      recordingDuration: 0,
      transcript: [
        {
          id: 't-in-1',
          speaker: 'gemini_ai',
          text: 'Incoming call connected via CM Dialer VoIP routing.',
          time: '00:00',
        },
        {
          id: 't-in-2',
          speaker: 'other',
          text: `Hi there! Elena here from CM Technologies. Thanks for picking up!`,
          time: '00:02',
        },
      ],
      aiSummary: 'Incoming call accepted. Verified caller from CM Technologies engineering team.',
    });

    setIncomingCall(null);
  };

  // DECLINE INCOMING CALL
  const handleDeclineIncomingCall = () => {
    dialerAudio.stopRingback();
    dialerAudio.playHangupTone();

    if (incomingCall) {
      const matched = contacts.find((c) => c.phone === incomingCall.phone);
      const missedRecord: CallRecord = {
        id: `call-missed-${Date.now()}`,
        contactId: matched?.id,
        name: incomingCall.name,
        phone: incomingCall.phone,
        type: 'missed',
        timestamp: new Date().toISOString(),
        timeFormatted: 'Just now',
        durationSeconds: 0,
        aiSummary: 'Missed incoming call. Notification logged in CM Dialer recents.',
      };
      setCalls((prev) => [missedRecord, ...prev]);

      // If auto WhatsApp on missed is enabled, schedule an automatic WhatsApp task
      if (settings.autoWhatsAppOnMissed) {
        const autoTask: ScheduledTask = {
          id: `task-auto-${Date.now()}`,
          type: 'whatsapp',
          contactName: incomingCall.name,
          phone: incomingCall.phone,
          scheduledTime: 'Immediate (Auto)',
          message: settings.whatsappMissedMessage,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        setTasks((prev) => [autoTask, ...prev]);
      }
    }

    setIncomingCall(null);
  };

  // IN-CALL CONTROLS
  const handleToggleMute = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const handleToggleSpeaker = () => {
    setActiveCall((prev) => (prev ? { ...prev, isSpeaker: !prev.isSpeaker } : null));
  };

  const handleToggleHold = () => {
    setActiveCall((prev) => (prev ? { ...prev, isHold: !prev.isHold } : null));
  };

  const handleAddTranscriptLine = (line: { speaker: 'you' | 'other' | 'gemini_ai'; text: string }) => {
    setActiveCall((prev) => {
      if (!prev) return null;
      const mins = Math.floor(prev.duration / 60);
      const secs = prev.duration % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      return {
        ...prev,
        transcript: [
          ...prev.transcript,
          {
            id: `line-${Date.now()}`,
            speaker: line.speaker,
            text: line.text,
            time: timeStr,
          },
        ],
      };
    });
  };

  // CONTACTS MANAGEMENT
  const handleAddContact = (newContactData: Omit<Contact, 'id'>) => {
    const newContact: Contact = {
      ...newContactData,
      id: `c-${Date.now()}`,
    };
    setContacts((prev) => [...prev, newContact]);
    setPhoneToAddToContacts(null);
  };

  const handleUpdateContact = (updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleFavorite = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
  };

  // SPEED DIAL SLOTS
  const handleAssignSpeedDial = (contactId: string, slot: number) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId) return { ...c, speedDialKey: slot };
        if (c.speedDialKey === slot) return { ...c, speedDialKey: undefined }; // clear collision
        return c;
      })
    );
  };

  const handleRemoveSpeedDial = (slot: number) => {
    setContacts((prev) =>
      prev.map((c) => (c.speedDialKey === slot ? { ...c, speedDialKey: undefined } : c))
    );
  };

  // VOICEMAIL ACTIONS
  const handleDeleteVoicemail = (id: string) => {
    setVoicemails((prev) => prev.filter((v) => v.id !== id));
  };

  const handleMarkVoicemailAsRead = (id: string) => {
    setVoicemails((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isRead: true } : v))
    );
  };

  // RECORDINGS ACTIONS
  const handleDeleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  // SCHEDULER ACTIONS
  const handleAddTask = (taskData: Omit<ScheduledTask, 'id' | 'createdAt'>) => {
    const newTask: ScheduledTask = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // SETTINGS ACTIONS
  const handleUpdateSettings = (newSettings: Partial<DialerSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // GOOGLE CONTACTS SYNC
  const handleSyncGoogleContacts = () => {
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        isGoogleSynced: true,
      }))
    );
    setSettings((prev) => ({
      ...prev,
      googleContactsLinked: true,
      lastGoogleSync: 'Just now',
    }));
  };

  // CALL LOG ACTIONS
  const handleClearCallHistory = () => {
    if (confirm('Are you sure you want to clear your call history?')) {
      setCalls([]);
    }
  };

  const missedCount = calls.filter((c) => c.type === 'missed').length;
  const unreadVoicemailCount = voicemails.filter((v) => !v.isRead).length;

  return (
    <div className="min-h-screen bg-[#f8fafd] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={setSoundEnabled}
        onSimulateIncomingCall={handleTriggerIncomingCall}
        isCallActive={!!activeCall}
        settings={settings}
        onOpenGoogleContactsModal={() => setIsGoogleContactsModalOpen(true)}
        onOpenPlayStoreModal={() => setIsPlayStoreModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-start py-2 sm:py-4 px-2 sm:px-4 w-full max-w-7xl mx-auto">
        {/* Desktop View Mode Toggle (Handset Frame vs Full Screen View) */}
        <div className="hidden lg:flex items-center justify-between w-full max-w-2xl mb-2 px-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Display Layout:</span>
            <div className="inline-flex rounded-xl bg-slate-200/70 p-0.5 border border-slate-300/60">
              <button
                onClick={() => setDesktopViewMode('handset')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  desktopViewMode === 'handset'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone Chassis</span>
              </button>
              <button
                onClick={() => setDesktopViewMode('expanded')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  desktopViewMode === 'expanded'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Expanded Deck</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-200/60">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>CM Dialer AI Telephony Active</span>
          </div>
        </div>

        {/* Responsive Content Chassis */}
        <div
          className={`w-full transition-all duration-300 ${
            desktopViewMode === 'handset'
              ? 'max-w-md bg-white sm:rounded-[36px] sm:border sm:border-slate-200/90 sm:shadow-xl sm:p-2 sm:ring-8 sm:ring-slate-100'
              : 'max-w-4xl bg-white sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-lg sm:p-4'
          }`}
        >
          {/* Top Pill Navigation for Tablet/Desktop */}
          {!activeCall && (
            <Navigation
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              missedCallsCount={missedCount}
              unreadVoicemailCount={unreadVoicemailCount}
            />
          )}

          {/* Active Call Overlay Screen */}
          {activeCall ? (
            <InCallScreen
              call={activeCall}
              onEndCall={handleEndCall}
              onToggleMute={handleToggleMute}
              onToggleSpeaker={handleToggleSpeaker}
              onToggleHold={handleToggleHold}
              onToggleRecording={() =>
                setActiveCall((prev) =>
                  prev ? { ...prev, isRecording: !prev.isRecording } : null
                )
              }
              onAddTranscriptLine={handleAddTranscriptLine}
            />
          ) : (
            /* Tab Screens */
            <div className="w-full flex-1 flex flex-col justify-start">
              {activeTab === 'keypad' && (
                <Keypad
                  contacts={contacts}
                  onStartCall={handleStartCall}
                  onOpenAddContactModal={(phone) => {
                    setPhoneToAddToContacts(phone);
                    setActiveTab('contacts');
                  }}
                  onSelectVoicemail={() => setActiveTab('voicemail')}
                />
              )}

              {activeTab === 'recents' && (
                <RecentCalls
                  calls={calls}
                  onCallNumber={handleStartCall}
                  onClearHistory={handleClearCallHistory}
                />
              )}

              {activeTab === 'contacts' && (
                <ContactsList
                  contacts={contacts}
                  onCallContact={(contact) =>
                    handleStartCall({
                      name: contact.name,
                      phone: contact.phone,
                      contactId: contact.id,
                    })
                  }
                  onAddContact={handleAddContact}
                  onUpdateContact={handleUpdateContact}
                  onDeleteContact={handleDeleteContact}
                  onToggleFavorite={handleToggleFavorite}
                  initialPhoneToAdd={phoneToAddToContacts}
                  onClearInitialPhone={() => setPhoneToAddToContacts(null)}
                  onOpenGoogleContactsModal={() => setIsGoogleContactsModalOpen(true)}
                  googleContactsLinked={settings.googleContactsLinked}
                />
              )}

              {activeTab === 'recordings' && (
                <CallRecordingsScreen
                  recordings={recordings}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onDeleteRecording={handleDeleteRecording}
                  onCallNumber={handleStartCall}
                />
              )}

              {activeTab === 'scheduler' && (
                <SchedulerScreen
                  contacts={contacts}
                  tasks={tasks}
                  settings={settings}
                  onAddTask={handleAddTask}
                  onDeleteTask={handleDeleteTask}
                  onCallNumber={handleStartCall}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}

              {activeTab === 'voicemail' && (
                <VoicemailScreen
                  voicemails={voicemails}
                  onCallNumber={handleStartCall}
                  onDeleteVoicemail={handleDeleteVoicemail}
                  onMarkAsRead={handleMarkVoicemailAsRead}
                />
              )}

              {activeTab === 'speeddial' && (
                <SpeedDialScreen
                  contacts={contacts}
                  onCallNumber={handleStartCall}
                  onAssignSpeedDial={handleAssignSpeedDial}
                  onRemoveSpeedDial={handleRemoveSpeedDial}
                  onSelectVoicemail={() => setActiveTab('voicemail')}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Simulated Incoming Call Alert Modal */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
          onScreenWithGemini={() => {
            // Handled inside modal with interactive dialogue simulation
          }}
        />
      )}

      {/* Google Contacts Link & Sync Modal */}
      <GoogleContactsModal
        isOpen={isGoogleContactsModalOpen}
        onClose={() => setIsGoogleContactsModalOpen(false)}
        settings={settings}
        contacts={contacts}
        onUpdateSettings={handleUpdateSettings}
        onSyncGoogleContacts={handleSyncGoogleContacts}
      />

      {/* Play Store Readiness & APK Deployment Modal */}
      <PlayStoreReadyModal
        isOpen={isPlayStoreModalOpen}
        onClose={() => setIsPlayStoreModalOpen(false)}
      />
    </div>
  );
}
