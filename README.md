# AudioFlow AI

Professional audio transcription and segmentation tool.

## Environment Variables

Create a `.env` file with the following:

```env
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

## Features

- **Local Storage**: All data stays in your browser (IndexedDB).
- **Whisper v3 Turbo**: High-speed word-level transcription via Groq.
- **Gemini Diarization**: Intelligent speaker detection and segmentation.
- **Interactive Editor**: Edit text and speaker labels with real-time sync.
- **Export**: TXT, SRT, VTT formats supported.

## Setup

1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Open [http://localhost:3000](http://localhost:3000)
