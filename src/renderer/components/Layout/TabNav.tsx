import React from 'react';

export type TabId = 'device' | 'settings';

export interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

const DeviceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
    />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const tabs: Tab[] = [
  {
    id: 'device',
    label: 'Device',
    icon: <DeviceIcon className="w-5 h-5" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon className="w-5 h-5" />,
  },
];

const TabNav: React.FC<TabNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      className="flex bg-bg-secondary border-b border-border"
      data-testid="tab-nav"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`flex items-center gap-2 px-md py-sm transition-colors duration-fast border-b-2 ${
            activeTab === tab.id
              ? 'text-text-primary border-accent bg-bg-tertiary'
              : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-hover'
          }`}
          onClick={() => onTabChange(tab.id)}
          data-testid={`tab-${tab.id}`}
        >
          {tab.icon}
          <span className="text-sm font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default TabNav;
