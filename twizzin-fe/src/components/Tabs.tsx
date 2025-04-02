'use client';

import React from 'react';
import { ReactNode } from 'react';

interface TabsProps {
  children: ReactNode;
  activeTab: string;
  // eslint-disable-next-line no-unused-vars
  onChange: (tabId: string) => void;
  className?: string;
}

interface TabProps {
  id: string;
  label: string;
  children: ReactNode;
}

export const Tabs = ({
  children,
  activeTab,
  onChange,
  className = '',
}: TabsProps) => {
  const tabs = React.Children.toArray(
    children
  ) as React.ReactElement<TabProps>[];

  return (
    <div className={`w-full ${className}`}>
      <div className='flex gap-2 mb-6 border-b border-black/10'>
        {tabs.map((tab) => (
          <button
            key={tab.props.id}
            onClick={() => onChange(tab.props.id)}
            className={`
              px-4 py-2
              font-semibold
              transition-all
              rounded-t-lg
              ${
                activeTab === tab.props.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-disabledText hover:text-primaryText'
              }
            `}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className='w-full'>
        {tabs.find((tab) => tab.props.id === activeTab)?.props.children}
      </div>
    </div>
  );
};

export const Tab = ({ children }: TabProps) => {
  return <>{children}</>;
};
