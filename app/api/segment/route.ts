import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

let genAI: GoogleGenAI | null = null;

function getAI() {
  if (!genAI) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is missing');
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function POST(req: Request) {
  try {
    const { text, words, durationMs } = await req.json();
    
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_GEMINI_API_KEY is missing in environment' }, { status: 500 });
    }

    const ai = getAI();

    const prompt = `
      You are an expert audio editor. I have a transcript with word-level timestamps.
      Task: Perform speaker diarization and segmentation.
      
      Rules:
      1. Identify speakers (e.g., Speaker 1, Speaker 2).
      2. Group words into segments.
      3. A new speaker MUST start a new segment.
      4. Segments should be between 300-800 characters unless a speaker change occurs.
      5. Only split segments at natural boundaries (punctuation, pauses).
      6. Return ONLY a JSON object.
      
      Input Data:
      - Total Duration: ${durationMs}ms
      - Full Text: ${text}
      - Words with indices: ${JSON.stringify(words.map((w: any) => ({ i: w.i, w: w.w })))}
      
      Output Schema:
      {
        "speakers": [{"speaker_id": "string", "label": "string"}],
        "segments": [{"segment_id": "string", "speaker_id": "string", "word_start": number, "word_end": number, "text": "string"}]
      }
      
      IMPORTANT: word_start and word_end are indices from the provided words array.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Using 1.5 flash for speed and cost
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            speakers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker_id: { type: Type.STRING },
                  label: { type: Type.STRING }
                },
                required: ["speaker_id", "label"]
              }
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  segment_id: { type: Type.STRING },
                  speaker_id: { type: Type.STRING },
                  word_start: { type: Type.INTEGER },
                  word_end: { type: Type.INTEGER },
                  text: { type: Type.STRING }
                },
                required: ["segment_id", "speaker_id", "word_start", "word_end", "text"]
              }
            }
          },
          required: ["speakers", "segments"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Segmentation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
