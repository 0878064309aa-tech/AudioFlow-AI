'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, ZoomIn, Search } from 'lucide-react';
import { formatTime } from '@/lib/audio-utils';

interface AudioPlayerProps {
  url: string;
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
  onSeek: (time: number) => void;
}

export function AudioPlayer({ url, currentTime, duration, onTimeUpdate, onSeek }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => onTimeUpdate(audio.currentTime * 1000);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime / 1000;
    }
  };

  return (
    <footer className="h-32 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex flex-col">
      <audio ref={audioRef} src={url} />
      
      {/* Timeline */}
      <div 
        className="h-12 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 relative group cursor-pointer"
        onClick={handleTimelineClick}
      >
        <div 
          className="absolute top-0 bottom-0 bg-primary/10 transition-all"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-primary z-20"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        >
          <div className="absolute -top-1 -left-1.5 w-4 h-4 rounded-full bg-primary border-2 border-white dark:border-slate-900 shadow-md" />
        </div>
        
        {/* Waveform Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-4 opacity-20 pointer-events-none">
          {[40, 70, 45, 90, 65, 30, 85, 50, 75, 40, 60, 80, 35, 95, 55, 45, 70, 30, 85, 60, 40, 75, 50, 90, 65, 35, 80, 45, 70, 55, 40, 85, 60, 30, 95, 50, 75, 40, 65, 90, 45, 80, 35, 70, 55, 40, 85, 60, 30, 95].map((h, i) => (
            <div 
              key={i} 
              className="w-1 bg-slate-400 rounded-full" 
              style={{ height: `${h}%` }} 
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex items-center justify-between px-6">
        <div className="flex items-center gap-6 w-1/3">
          <div className="flex flex-col">
            <span className="text-[15px] font-mono font-bold text-slate-900 dark:text-slate-100">
              {formatTime(currentTime)}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Current Time</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <ZoomIn className="w-4 h-4 text-slate-400" />
            <input 
              type="range" 
              className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
              min="1" max="10" defaultValue="3"
            />
          </div>
        </div>

        <div className="flex items-center gap-8 justify-center">
          <button onClick={() => skip(-5)} className="text-slate-500 hover:text-primary transition-colors">
            <RotateCcw className="w-7 h-7" />
          </button>
          <button 
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25 hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
          <button onClick={() => skip(5)} className="text-slate-500 hover:text-primary transition-colors">
            <RotateCw className="w-7 h-7" />
          </button>
        </div>

        <div className="flex items-center gap-6 w-1/3 justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">SPEED</span>
            <select 
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer p-0"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                <option key={rate} value={rate}>{rate}x</option>
              ))}
            </select>
          </div>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-slate-400" />
            <input 
              type="range" 
              className="w-20 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
              min="0" max="1" step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
