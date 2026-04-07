// Copyright (c) 2026 Devforge Pty Ltd. All rights reserved.
// Author: Benjamin C. Tehan
import { useState } from "react";

export interface Tab {
  id: string;
  title: string;
  closable?: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab }: TabBarProps) {
  return (
    <div className="flex items-center h-8 bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`flex items-center gap-1 px-3 py-1 text-xs cursor-pointer border-r border-zinc-800 whitespace-nowrap transition-colors ${
              isActive
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            }`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span>{tab.title}</span>
            {tab.closable !== false && (
              <button
                className="ml-1 text-zinc-600 hover:text-zinc-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                &times;
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={onNewTab}
        className="px-2 py-1 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
      >
        +
      </button>
    </div>
  );
}
