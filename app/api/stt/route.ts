import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

let groqClient: Groq | null = null;

function getGroq() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is missing in environment');
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export async function POST(req: Request) {
  console.log('[STT] Request received');
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[STT] No file in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`[STT] Processing file: ${file.name}, size: ${file.size} bytes`);

    const groq = getGroq();
    
    // Whisper v3 Turbo via Groq SDK
    // The SDK handles multi-part form data correctly
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3-turbo',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    if (!transcription || !(transcription as any).words) {
      console.error('[STT] Groq returned invalid response', transcription);
      return NextResponse.json({ error: 'Groq returned invalid transcription data' }, { status: 500 });
    }

    // Map to our Word interface
    const words = (transcription as any).words.map((w: any, i: number) => ({
      i,
      w: w.word,
      s_ms: Math.round(w.start * 1000),
      e_ms: Math.round(w.end * 1000),
    }));

    console.log(`[STT] Transcription successful. Words: ${words.length}`);
    return NextResponse.json({ words, text: transcription.text });
  } catch (error: any) {
    console.error('[STT] Route Error:', error);
    
    // Handle specific Groq errors if possible
    const status = error.status || 500;
    const message = error.message || 'Internal server error during STT';
    
    return NextResponse.json({ 
      error: message,
      details: error.stack
    }, { status });
  }
}
