export type CallType = 'incoming' | 'outgoing' | 'missed';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  role?: string;
  avatarBg: string;
  isFavorite: boolean;
  speedDialKey?: number; // 1-9
  notes?: string;
  isGoogleSynced?: boolean;
}

export interface CallRecord {
  id: string;
  contactId?: string;
  name: string;
  phone: string;
  type: CallType;
  timestamp: string; // formatted ISO or relative
  timeFormatted: string;
  durationSeconds: number;
  notes?: string;
  aiSummary?: string;
  transcript?: string;
  recordingId?: string;
}

export interface CallRecording {
  id: string;
  callId?: string;
  name: string;
  phone: string;
  timestamp: string;
  durationSeconds: number;
  audioBlobUrl?: string;
  waveform: number[];
  silentRecorded: boolean;
  transcript: string;
  aiKeyPoints: string[];
}

export type ScheduledTaskType = 'call' | 'whatsapp';

export interface ScheduledTask {
  id: string;
  type: ScheduledTaskType;
  contactName: string;
  phone: string;
  scheduledTime: string; // ISO string or human date
  note?: string;
  message?: string;
  autoDial?: boolean;
  status: 'pending' | 'completed' | 'canceled';
  createdAt: string;
}

export type AnnouncementMode = 'none' | 'beep' | 'voice';

export interface DialerSettings {
  autoRecord: boolean;
  announcementMode: AnnouncementMode;
  autoWhatsAppOnMissed: boolean;
  whatsappMissedMessage: string;
  googleContactsLinked: boolean;
  googleAccountEmail: string;
  lastGoogleSync: string;
  soundEnabled: boolean;
}

export interface VoicemailItem {
  id: string;
  contactId?: string;
  name: string;
  phone: string;
  timestamp: string;
  durationSeconds: number;
  audioUrl?: string;
  isRead: boolean;
  transcript: string;
  aiKeyPoints: string[];
}

export type ActiveCallStatus = 'ringing' | 'connected' | 'on_hold' | 'ended';

export interface TranscriptLine {
  id: string;
  speaker: 'you' | 'other' | 'gemini_ai';
  text: string;
  time: string;
}

export interface ActiveCallState {
  status: ActiveCallStatus;
  contact: {
    id?: string;
    name: string;
    phone: string;
    role?: string;
    company?: string;
  };
  duration: number; // in seconds
  isMuted: boolean;
  isSpeaker: boolean;
  isHold: boolean;
  isRecording: boolean;
  silentRecording: boolean;
  recordingDuration: number;
  transcript: TranscriptLine[];
  aiSummary?: string;
  sentiment?: 'positive' | 'neutral' | 'urgent';
}

export type NavigationTab =
  | 'keypad'
  | 'recents'
  | 'contacts'
  | 'recordings'
  | 'scheduler'
  | 'voicemail'
  | 'speeddial';

