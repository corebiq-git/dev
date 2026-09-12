import { Contact, CallRecord, VoicemailItem, CallRecording, ScheduledTask, DialerSettings } from '../types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c-1',
    name: 'Elena Rostova',
    phone: '+1 (415) 882-9014',
    email: 'elena.rostova@biqcloud.io',
    company: 'CoreBIQ Technologies',
    role: 'VP Engineering',
    avatarBg: 'bg-blue-600',
    isFavorite: true,
    speedDialKey: 2,
    isGoogleSynced: true,
    notes: 'Primary contact for CoreBIQ distributed mesh architecture and sprint planning.'
  },
  {
    id: 'c-2',
    name: 'Marcus Vance',
    phone: '+1 (415) 309-8871',
    email: 'marcus.vance@corebiq.com',
    company: 'CoreBIQ Systems',
    role: 'Head of Product',
    avatarBg: 'bg-indigo-600',
    isFavorite: true,
    speedDialKey: 3,
    isGoogleSynced: true,
    notes: 'Follow-up regarding Q3 enterprise roadmap and client feedback synthesis.'
  },
  {
    id: 'c-3',
    name: 'CoreBIQ Support VIP',
    phone: '+1 (800) 555-0199',
    email: 'priority@corebiq.support',
    company: 'CoreBIQ Global',
    role: '24/7 Priority Operations Desk',
    avatarBg: 'bg-emerald-600',
    isFavorite: true,
    speedDialKey: 4,
    isGoogleSynced: false,
    notes: 'Direct priority routing for cloud infrastructure incidents.'
  },
  {
    id: 'c-4',
    name: 'Dr. Sarah Lin',
    phone: '+1 (650) 492-7715',
    email: 'sarah.lin@stanford-health.org',
    company: 'Bay Health Institute',
    role: 'Principal Researcher',
    avatarBg: 'bg-violet-600',
    isFavorite: false,
    speedDialKey: 5,
    isGoogleSynced: true,
    notes: 'Medical sensor telemetry and HIPAA compliance review.'
  },
  {
    id: 'c-5',
    name: 'Alexander Sterling',
    phone: '+1 (212) 677-4022',
    email: 'a.sterling@apexpartners.vc',
    company: 'Apex Capital',
    role: 'Managing Partner',
    avatarBg: 'bg-amber-600',
    isFavorite: true,
    speedDialKey: 6,
    isGoogleSynced: true,
    notes: 'Quarterly investor relations and growth metrics discussion.'
  },
  {
    id: 'c-6',
    name: 'Chloe Dubois',
    phone: '+33 1 42 68 55 00',
    email: 'chloe.dubois@designcraft.fr',
    company: 'Atelier Dubois',
    role: 'Creative Director',
    avatarBg: 'bg-rose-500',
    isFavorite: false,
    speedDialKey: 7,
    isGoogleSynced: false,
    notes: 'Gemini light UI design language and typography guidelines.'
  },
  {
    id: 'c-7',
    name: 'Kenji Takahashi',
    phone: '+81 3 5555 0148',
    email: 'k.takahashi@tokyoneo.jp',
    company: 'Neo Cloud Tokyo',
    role: 'Solutions Architect',
    avatarBg: 'bg-cyan-600',
    isFavorite: false,
    speedDialKey: 8,
    isGoogleSynced: true,
    notes: 'APAC regional routing nodes and latency optimization.'
  },
  {
    id: 'c-8',
    name: 'Jordan Rivera',
    phone: '+1 (312) 904-1188',
    email: 'jordan.rivera@chicagolaw.com',
    company: 'Rivera & Partners',
    role: 'Legal Counsel',
    avatarBg: 'bg-teal-600',
    isFavorite: false,
    speedDialKey: 9,
    isGoogleSynced: false,
    notes: 'Contract execution for enterprise SaaS licensing agreements.'
  }
];

export const INITIAL_RECORDINGS: CallRecording[] = [
  {
    id: 'rec-1',
    callId: 'call-1',
    name: 'Marcus Vance',
    phone: '+1 (415) 309-8871',
    timestamp: 'Today, 11:20 AM',
    durationSeconds: 245,
    silentRecorded: true,
    waveform: [30, 45, 65, 80, 50, 70, 90, 85, 40, 60, 75, 95, 80, 60, 45, 70, 85, 90, 65, 50, 40, 60, 75, 85, 45],
    transcript: 'Marcus: "The silent auto-recording works seamlessly on Android 14 without interrupting either party." You: "Yes, fully compliant with local device storage." Marcus: "Let us review deployment status at 4 PM."',
    aiKeyPoints: [
      'Silent call recording mode: Verified with zero announcement chime',
      'Topic: Android 14 telephony and offline storage compliance',
      'Action Item: Review deployment sync at 4:00 PM'
    ]
  },
  {
    id: 'rec-2',
    callId: 'call-2',
    name: 'Elena Rostova',
    phone: '+1 (415) 882-9014',
    timestamp: 'Yesterday, 3:45 PM',
    durationSeconds: 512,
    silentRecorded: true,
    waveform: [40, 60, 80, 70, 50, 65, 85, 90, 75, 55, 65, 80, 95, 70, 60, 80, 85, 90, 60, 45, 55, 70, 80, 65, 35],
    transcript: 'Elena: "CoreBIQ architecture benchmark shows 34ms reduction in latency across all Asia-Pacific nodes." You: "Confirmed, syncing Google Contacts and database replication now."',
    aiKeyPoints: [
      'APAC latency dropped by 34ms',
      'Google Contacts 2-way sync enabled',
      'Database replication status: Healthy'
    ]
  }
];

export const INITIAL_SCHEDULED_TASKS: ScheduledTask[] = [
  {
    id: 'sched-1',
    type: 'whatsapp',
    contactName: 'Elena Rostova',
    phone: '+1 (415) 882-9014',
    scheduledTime: 'Today, 5:00 PM',
    message: 'Hi Elena! Sending over the finalized CoreBIQ architecture benchmark report. Let me know if you need any adjustments before the board call.',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sched-2',
    type: 'call',
    contactName: 'Alexander Sterling',
    phone: '+1 (212) 677-4022',
    scheduledTime: 'Tomorrow, 10:30 AM',
    note: 'Quarterly investor review and growth KPI briefing deck.',
    autoDial: true,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_SETTINGS: DialerSettings = {
  autoRecord: true,
  announcementMode: 'none', // 'none' = Silent recording with no announcement!
  autoWhatsAppOnMissed: true,
  whatsappMissedMessage: 'Hi! Missed your call via CM Dialer. I am currently away or in a meeting. Please drop a message here on WhatsApp!',
  googleContactsLinked: true,
  googleAccountEmail: 'corebiq@gmail.com',
  lastGoogleSync: 'Today, 11:30 AM',
  soundEnabled: true,
};


export const INITIAL_CALL_RECORDS: CallRecord[] = [
  {
    id: 'call-1',
    contactId: 'c-2',
    name: 'Marcus Vance',
    phone: '+1 (415) 309-8871',
    type: 'incoming',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    timeFormatted: '25 mins ago',
    durationSeconds: 245,
    aiSummary: 'Discussed Gemini Light UI refinements and sprint milestones. Agreed to finalize release notes by Thursday 4 PM.',
    transcript: 'Marcus: "Hey, the dialer responsiveness on mobile feels great. Let\'s make sure the T9 search highlights cleanly." You: "Sounds good, adding DTMF Web Audio support now."'
  },
  {
    id: 'call-2',
    contactId: 'c-1',
    name: 'Elena Rostova',
    phone: '+1 (415) 882-9014',
    type: 'outgoing',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    timeFormatted: '3 hours ago',
    durationSeconds: 512,
    aiSummary: 'Reviewed CoreBIQ microservices failover tests. 99.99% SLA achieved with zero dropped packets.',
    transcript: 'Elena: "Our latency metrics in Asia-Pacific dropped by 34ms." You: "Excellent, sending the benchmarking chart."'
  },
  {
    id: 'call-3',
    name: 'Apex Capital HQ',
    phone: '+1 (212) 677-4022',
    type: 'missed',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    timeFormatted: '6 hours ago',
    durationSeconds: 0,
    aiSummary: 'Missed call from managing partner desk. Voicemail left requesting 10-minute briefing.',
  },
  {
    id: 'call-4',
    contactId: 'c-3',
    name: 'CoreBIQ Support VIP',
    phone: '+1 (800) 555-0199',
    type: 'incoming',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    timeFormatted: 'Yesterday',
    durationSeconds: 118,
    aiSummary: 'Routine health check confirmation for cloud tenant. All systems green.',
  },
  {
    id: 'call-5',
    contactId: 'c-4',
    name: 'Dr. Sarah Lin',
    phone: '+1 (650) 492-7715',
    type: 'outgoing',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    timeFormatted: '2 days ago',
    durationSeconds: 430,
    aiSummary: 'Follow-up regarding biomedical telemetry pipeline and sample payload schema.',
  },
  {
    id: 'call-6',
    name: 'Unknown Caller',
    phone: '+1 (917) 555-0143',
    type: 'missed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    timeFormatted: '3 days ago',
    durationSeconds: 0,
    aiSummary: 'Screened by CoreBIQ AI: Potential vendor consultation. No voicemail left.',
  }
];

export const INITIAL_VOICEMAILS: VoicemailItem[] = [
  {
    id: 'vm-1',
    contactId: 'c-5',
    name: 'Alexander Sterling',
    phone: '+1 (212) 677-4022',
    timestamp: 'Today, 9:42 AM',
    durationSeconds: 48,
    isRead: false,
    transcript: "Hi there, Alexander Sterling here from Apex Capital. Just reviewing the latest CoreBIQ performance metrics—impressive traction this quarter. When you get a chance today, give me a quick ring to align on the next board deck. Talk soon!",
    aiKeyPoints: [
      'Caller: Alexander Sterling (Apex Capital)',
      'Topic: Positive quarterly performance metrics review',
      'Action Item: Call back to coordinate board briefing deck'
    ]
  },
  {
    id: 'vm-2',
    contactId: 'c-6',
    name: 'Chloe Dubois',
    phone: '+33 1 42 68 55 00',
    timestamp: 'Yesterday, 4:15 PM',
    durationSeconds: 32,
    isRead: true,
    transcript: "Bonjour! Just wanted to let you know the new Gemini light interface components and color tokens have been exported into the Figma workspace. Let me know if you need any adjustments on the button curves. Merci!",
    aiKeyPoints: [
      'Caller: Chloe Dubois (Atelier Dubois)',
      'Topic: Gemini light UI tokens exported to Figma',
      'Status: Ready for developer review'
    ]
  },
  {
    id: 'vm-3',
    name: 'Global Fiber Logistics',
    phone: '+1 (888) 555-0182',
    timestamp: 'Sep 10, 2:10 PM',
    durationSeconds: 24,
    isRead: true,
    transcript: "Hello, this is a dispatch confirmation regarding the dedicated server rack delivery for datacenter facility B. Shipment ID #89201 is confirmed for delivery between 9 AM and noon on Friday.",
    aiKeyPoints: [
      'Topic: Server rack delivery confirmation #89201',
      'Delivery window: Friday 9:00 AM - 12:00 PM'
    ]
  }
];

// T9 Digit to Letters mapping
export const T9_KEYPAD_MAP: Record<string, string> = {
  '1': '',
  '2': 'abc',
  '3': 'def',
  '4': 'ghi',
  '5': 'jkl',
  '6': 'mno',
  '7': 'pqrs',
  '8': 'tuv',
  '9': 'wxyz',
  '0': '+',
  '*': '',
  '#': ''
};

/**
 * Filter contacts matching either phone digits or T9 name letters
 */
export function searchT9Contacts(queryDigits: string, contacts: Contact[]): Contact[] {
  if (!queryDigits) return [];
  const cleanDigits = queryDigits.replace(/[^0-9*#]/g, '');
  if (!cleanDigits) return [];

  // Match by raw phone number digits
  const matched = contacts.filter(contact => {
    const rawPhone = contact.phone.replace(/[^0-9]/g, '');
    if (rawPhone.includes(cleanDigits)) return true;

    // Check T9 letter match for name
    const nameLower = contact.name.toLowerCase();
    // Convert letters in name to corresponding digits
    const nameToDigits = nameLower
      .split('')
      .map(char => {
        for (const [digit, letters] of Object.entries(T9_KEYPAD_MAP)) {
          if (letters.includes(char)) return digit;
        }
        return '';
      })
      .join('');

    return nameToDigits.includes(cleanDigits);
  });

  return matched;
}

/**
 * Clean & format phone numbers nicely
 */
export function formatPhoneNumber(value: string): string {
  if (!value) return '';
  // If contains international '+' or special chars
  if (value.startsWith('+')) {
    return value;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
}
