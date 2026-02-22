'use client';

import React, { useCallback } from 'react';
import { Upload, FileAudio } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
}

export function UploadZone({ onUpload, isProcessing }: UploadZoneProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onUpload(file);
    }
  }, [onUpload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  }, [onUpload]);

  return (
    <div 
      className="flex-1 flex items-center justify-center p-8"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="max-w-md w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 flex flex-col items-center text-center gap-4 hover:border-primary/50 transition-colors group">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          <Upload className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Upload Audio</h3>
          <p className="text-sm text-slate-500 mt-1">
            Drag and drop your audio file here, or click to browse.
            Supports MP3, WAV, M4A, WEBM.
          </p>
        </div>
        <label className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-medium cursor-pointer hover:bg-primary/90 transition-colors">
          Select File
          <input 
            type="file" 
            className="hidden" 
            accept="audio/*" 
            onChange={handleChange}
            disabled={isProcessing}
          />
        </label>
        {isProcessing && (
          <div className="mt-4 flex items-center gap-2 text-primary font-medium animate-pulse">
            <FileAudio className="w-4 h-4" />
            <span>Processing audio...</span>
          </div>
        )}
      </div>
    </div>
  );
}
