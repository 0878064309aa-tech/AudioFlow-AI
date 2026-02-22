'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Project, type Word, type Segment, type Speaker } from '@/lib/db';
import { normalizeAudio } from '@/lib/audio-utils';
import { Sidebar } from '@/components/Sidebar';
import { UploadZone } from '@/components/UploadZone';
import { AudioPlayer } from '@/components/AudioPlayer';
import { TranscriptView } from '@/components/TranscriptView';
import { CloudUpload, Download, ChevronDown, Edit2, Trash2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AudioFlowApp() {
  const projectsData = useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray());
  const projects = useMemo(() => projectsData || [], [projectsData]);
  const [activeProjectId, setActiveProjectId] = useState<number | undefined>();
  const [currentTime, setCurrentTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  };

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId), 
    [projects, activeProjectId]
  );

  const audioUrl = useMemo(() => 
    activeProject?.audioBlob ? URL.createObjectURL(activeProject.audioBlob) : '', 
    [activeProject?.audioBlob]
  );

  const handleCreateProject = async () => {
    const id = await db.projects.add({
      name: 'Untitled Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'idle'
    });
    setActiveProjectId(id as number);
  };

  const handleUpload = async (file: File) => {
    if (!activeProjectId) return;
    
    setIsProcessing(true);
    setProgress(10);
    
    try {
      // 1. Normalize Audio
      console.log('Starting audio normalization...');
      const { blob, durationMs } = await normalizeAudio(file);
      setProgress(30);

      await db.projects.update(activeProjectId, {
        name: file.name,
        audioBlob: blob,
        durationMs,
        status: 'processing',
        updatedAt: Date.now(),
        words: [],
        speakers: [],
        segments: []
      });

      // 2. STT (Groq)
      console.log('Sending audio to STT API...');
      const formData = new FormData();
      formData.append('file', blob, 'audio.wav');
      
      const sttRes = await fetch('/api/stt', { 
        method: 'POST', 
        body: formData,
      });

      if (!sttRes.ok) {
        let errorMsg = `STT API returned ${sttRes.status}`;
        try {
          const errorData = await sttRes.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // If not JSON, try text
          const text = await sttRes.text().catch(() => '');
          if (sttRes.status === 413 || text.includes('Payload Too Large')) {
            errorMsg = 'Audio file is too large for the server. Try a shorter file or a more compressed format.';
          } else if (sttRes.status === 504) {
            errorMsg = 'Request timed out. The audio might be too long.';
          }
        }
        throw new Error(errorMsg);
      }

      const { words, text } = await sttRes.json();
      console.log('STT completed successfully');
      setProgress(60);

      // 3. Segmentation (Gemini)
      console.log('Sending transcript to Segmentation API...');
      const segRes = await fetch('/api/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, words, durationMs })
      });

      if (!segRes.ok) {
        let errorMsg = `Segmentation API returned ${segRes.status}`;
        try {
          const errorData = await segRes.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          const text = await segRes.text().catch(() => '');
          if (segRes.status === 504) errorMsg = 'Segmentation timed out. The transcript might be too long.';
        }
        throw new Error(errorMsg);
      }

      const { speakers, segments: rawSegments } = await segRes.json();
      console.log('Segmentation completed successfully');
      setProgress(90);

      // 4. Post-process segments (calculate timestamps)
      const processedSegments = rawSegments.map((seg: any) => {
        const startWord = words[seg.word_start];
        const endWord = words[seg.word_end];
        return {
          ...seg,
          start_ms: startWord.s_ms,
          end_ms: endWord.e_ms
        };
      });

      await db.projects.update(activeProjectId, {
        words,
        speakers,
        segments: processedSegments,
        status: 'ready',
        updatedAt: Date.now()
      });
      
    } catch (error: any) {
      console.error('Processing error:', error);
      const errorMessage = error.message === 'Failed to fetch' 
        ? 'Network error: Could not reach the server. Please check your connection and ensure API keys are set.'
        : error.message;
      await db.projects.update(activeProjectId, { 
        status: 'error', 
        error: errorMessage 
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleEditSegment = async (segmentId: string, text: string) => {
    if (!activeProject) return;
    const newSegments = activeProject.segments?.map(s => 
      s.segment_id === segmentId ? { ...s, edited_text: text } : s
    );
    await db.projects.update(activeProjectId!, { segments: newSegments, updatedAt: Date.now() });
  };

  const handleRenameSpeaker = async (speakerId: string, label: string) => {
    if (!activeProject) return;
    const newSpeakers = activeProject.speakers?.map(s => 
      s.id === speakerId ? { ...s, label } : s
    );
    await db.projects.update(activeProjectId!, { speakers: newSpeakers, updatedAt: Date.now() });
  };

  const handleExport = (format: 'txt' | 'srt' | 'vtt') => {
    if (!activeProject || !activeProject.segments) return;
    
    let content = '';
    if (format === 'txt') {
      content = activeProject.segments.map(s => {
        const speaker = activeProject.speakers?.find(sp => sp.id === s.speaker_id);
        return `${speaker?.label || 'Unknown'}: ${s.edited_text || s.text}`;
      }).join('\n\n');
    } else {
      // Simplified SRT/VTT logic
      content = activeProject.segments.map((s, i) => {
        const start = new Date(s.start_ms).toISOString().substr(11, 12).replace('.', ',');
        const end = new Date(s.end_ms).toISOString().substr(11, 12).replace('.', ',');
        return `${i + 1}\n${start} --> ${end}\n${s.edited_text || s.text}\n`;
      }).join('\n');
      if (format === 'vtt') content = 'WEBVTT\n\n' + content.replaceAll(',', '.');
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name}.${format}`;
    a.click();
  };

  const handleDeleteProject = async (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await db.projects.delete(id);
      if (activeProjectId === id) setActiveProjectId(undefined);
    }
  };

  const handleCloneProject = async (project: Project) => {
    const { id, ...rest } = project;
    const newId = await db.projects.add({
      ...rest,
      name: `${rest.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setActiveProjectId(newId as number);
  };

  return (
    <div className={cn("flex h-screen overflow-hidden", isDarkMode && "dark")}>
      <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950">
        <Sidebar 
          projects={projects} 
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onCreateProject={handleCreateProject}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
        {!activeProject ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
            <GraphicEq className="w-12 h-12 opacity-20" />
            <p>Select or create a project to get started</p>
          </div>
        ) : (
          <>
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2 group">
                  <input 
                    className="bg-transparent border-none p-0 text-lg font-bold focus:ring-0 focus:border-none cursor-pointer group-hover:bg-slate-50 dark:group-hover:bg-slate-800 rounded px-1 transition-all"
                    value={activeProject.name}
                    onChange={(e) => db.projects.update(activeProjectId!, { name: e.target.value })}
                  />
                  <Edit2 className="w-4 h-4 text-slate-300" />
                </div>
                
                {activeProject.status === 'processing' && (
                  <div className="flex items-center gap-4 ml-4">
                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800" />
                    <div className="flex flex-col min-w-[140px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-bold text-primary uppercase">Transcribing...</span>
                        <span className="text-[11px] font-bold text-primary">{progress}%</span>
                      </div>
                      <div className="w-full bg-primary/10 rounded-full h-1.5 overflow-hidden">
                        <motion.div 
                          className="bg-primary h-full rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleCloneProject(activeProject)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                  title="Clone Project"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteProject(activeProjectId!)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
                <button 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                  onClick={() => document.getElementById('replace-audio')?.click()}
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>Replace audio</span>
                  <input 
                    id="replace-audio" 
                    type="file" 
                    className="hidden" 
                    accept="audio/*" 
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  />
                </button>
                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium">
                    <span>Export</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                    {(['txt', 'srt', 'vtt'] as const).map(fmt => (
                      <button 
                        key={fmt}
                        onClick={() => handleExport(fmt)}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase font-medium"
                      >
                        Export as {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeProject.status === 'idle' || activeProject.status === 'processing' ? (
                <UploadZone onUpload={handleUpload} isProcessing={isProcessing} />
              ) : (
                <TranscriptView 
                  segments={activeProject.segments || []}
                  speakers={activeProject.speakers || []}
                  currentTime={currentTime}
                  onSegmentClick={setCurrentTime}
                  onEditSegment={handleEditSegment}
                  onRenameSpeaker={handleRenameSpeaker}
                />
              )}
            </div>

            {activeProject.audioBlob && (
              <AudioPlayer 
                url={audioUrl}
                currentTime={currentTime}
                duration={activeProject.durationMs || 0}
                onTimeUpdate={setCurrentTime}
                onSeek={setCurrentTime}
              />
            )}
          </>
        )}
      </main>
      </div>
    </div>
  );
}

function GraphicEq(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 10v3" />
      <path d="M6 6v11" />
      <path d="M10 3v18" />
      <path d="M14 8v7" />
      <path d="M18 5v13" />
      <path d="M22 10v3" />
    </svg>
  );
}
