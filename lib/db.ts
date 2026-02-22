import Dexie, { type Table } from 'dexie';

export interface Word {
  i: number; // index
  w: string; // word
  s_ms: number; // start ms
  e_ms: number; // end ms
  c?: number; // confidence
}

export interface Segment {
  segment_id: string;
  speaker_id: string;
  word_start: number;
  word_end: number;
  text: string;
  edited_text?: string;
  start_ms: number;
  end_ms: number;
}

export interface Speaker {
  id: string;
  label: string;
}

export interface Project {
  id?: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  audioBlob?: Blob;
  durationMs?: number;
  words?: Word[];
  segments?: Segment[];
  speakers?: Speaker[];
  status: 'idle' | 'processing' | 'ready' | 'error';
  error?: string;
}

export class AudioFlowDB extends Dexie {
  projects!: Table<Project>;

  constructor() {
    super('AudioFlowDB');
    this.version(1).stores({
      projects: '++id, name, createdAt, updatedAt'
    });
  }
}

export const db = new AudioFlowDB();
