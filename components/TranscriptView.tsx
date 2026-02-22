'use client';

import React from 'react';
import { Edit3, UserPlus } from 'lucide-react';
import { type Segment, type Speaker } from '@/lib/db';
import { formatTime } from '@/lib/audio-utils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TranscriptViewProps {
  segments: Segment[];
  speakers: Speaker[];
  currentTime: number;
  onSegmentClick: (time: number) => void;
  onEditSegment: (id: string, text: string) => void;
  onRenameSpeaker: (id: string, label: string) => void;
}

export function TranscriptView({ 
  segments, 
  speakers, 
  currentTime, 
  onSegmentClick,
  onEditSegment,
  onRenameSpeaker
}: TranscriptViewProps) {
  
  const activeSegmentId = segments.find(s => currentTime >= s.start_ms && currentTime <= s.end_ms)?.segment_id;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-8">
      {segments.map((segment) => {
        const speaker = speakers.find(s => s.id === segment.speaker_id);
        const isActive = activeSegmentId === segment.segment_id;

        return (
          <div 
            key={segment.segment_id} 
            className={cn(
              "flex gap-8 group relative transition-all duration-300",
              isActive && "scale-[1.01]"
            )}
            onClick={() => onSegmentClick(segment.start_ms)}
          >
            {isActive && (
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary rounded-full" />
            )}
            
            <div className="w-32 flex-shrink-0 flex flex-col items-end gap-1">
              <button 
                className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded uppercase tracking-tighter transition-colors",
                  isActive ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  const newLabel = prompt('Rename Speaker:', speaker?.label);
                  if (newLabel) onRenameSpeaker(segment.speaker_id, newLabel);
                }}
              >
                {speaker?.label || 'Unknown'}
              </button>
              <span className={cn(
                "text-[11px] font-mono",
                isActive ? "text-primary font-bold" : "text-slate-400"
              )}>
                [{formatTime(segment.start_ms)}]
              </span>
            </div>

            <div className="flex-1 relative pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div 
                  className={cn(
                    "text-[15px] leading-relaxed p-3 rounded-lg transition-all",
                    isActive ? "bg-primary/5 text-slate-900 dark:text-slate-100 border-l-2 border-primary" : "text-slate-700 dark:text-slate-300"
                  )}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => onEditSegment(segment.segment_id, e.currentTarget.innerText)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {segment.edited_text || segment.text}
                </div>
                
                <div className={cn(
                  "flex items-center gap-1 ml-4 shrink-0 transition-opacity",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
