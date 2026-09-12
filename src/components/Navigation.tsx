import React from 'react';
import { Grid, Clock, Users, Voicemail, Zap, Mic, Calendar } from 'lucide-react';
import { NavigationTab } from '../types';

interface NavigationProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  missedCallsCount: number;
  unreadVoicemailCount: number;
  recordingsCount: number;
  pendingTasksCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  missedCallsCount,
  unreadVoicemailCount,
  recordingsCount,
  pendingTasksCount,
}) => {
  const tabs = [
    {
      id: 'keypad' as NavigationTab,
      label: 'Keypad',
      icon: Grid,
      badge: null,
    },
    {
      id: 'recents' as NavigationTab,
      label: 'Recents',
      icon: Clock,
      badge: missedCallsCount > 0 ? missedCallsCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'contacts' as NavigationTab,
      label: 'Contacts',
      icon: Users,
      badge: null,
    },
    {
      id: 'recordings' as NavigationTab,
      label: 'Recordings',
      icon: Mic,
      badge: recordingsCount > 0 ? recordingsCount : null,
      badgeColor: 'bg-rose-600 text-white',
    },
    {
      id: 'scheduler' as NavigationTab,
      label: 'Schedule',
      icon: Calendar,
      badge: pendingTasksCount > 0 ? pendingTasksCount : null,
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'voicemail' as NavigationTab,
      label: 'Voicemail',
      icon: Voicemail,
      badge: unreadVoicemailCount > 0 ? unreadVoicemailCount : null,
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'speeddial' as NavigationTab,
      label: 'Speed Dial',
      icon: Zap,
      badge: null,
    },
  ];

  return (
    <>
      {/* Desktop / Tablet Top Pill Bar */}
      <nav className="hidden md:flex items-center justify-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner max-w-2xl mx-auto my-3 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-700 shadow-sm shadow-blue-500/10 border border-blue-100 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile Bottom Fixed Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 px-1 py-1 shadow-lg">
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`mobile-nav-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 min-w-[52px] cursor-pointer ${
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <div
                    className={`p-1 rounded-xl transition-transform ${
                      isActive ? 'bg-blue-50 transform scale-110' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {tab.badge && (
                    <span
                      className={`absolute -top-1 -right-1 text-[8px] font-bold px-1 py-0.2 rounded-full min-w-[13px] text-center ${tab.badgeColor}`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold text-blue-600' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

