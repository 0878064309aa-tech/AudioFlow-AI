'use client';

import React from 'react';
import { Folder, FolderOpen, PlusCircle, Settings, AudioLines, Moon, Sun } from 'lucide-react';
import { type Project } from '@/lib/db';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  projects: Project[];
  activeProjectId?: number;
  onSelectProject: (id: number) => void;
  onCreateProject: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Sidebar({ projects, activeProjectId, onSelectProject, onCreateProject, isDarkMode, onToggleDarkMode }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-lg p-1.5 flex items-center justify-center">
            <AudioLines className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">AudioFlow AI</h1>
        </div>
        <button 
          onClick={onToggleDarkMode}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 custom-scrollbar">
        <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Projects</p>
        
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id!)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left w-full group",
              activeProjectId === project.id 
                ? "bg-primary text-white" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            {activeProjectId === project.id ? (
              <FolderOpen className="w-5 h-5" />
            ) : (
              <Folder className="w-5 h-5 group-hover:text-primary transition-colors" />
            )}
            <span className="text-sm font-medium truncate">{project.name}</span>
          </button>
        ))}

        <button 
          onClick={onCreateProject}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group mt-4 w-full text-left"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-sm font-medium truncate">New Project</span>
        </button>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">JD</div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">User</span>
            <span className="text-[11px] text-slate-400">Local Storage</span>
          </div>
          <button className="ml-auto text-slate-400 hover:text-slate-600">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
