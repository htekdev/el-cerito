/**
 * POST /api/voice/recipe-chat
 *
 * Iterative voice → recipe endpoint. Each call is one conversation turn:
 *   1. Whisper transcribes the audio blob
 *   2. GPT-4o-mini merges the transcript into the accumulated recipe
 *   3. Coverage evaluator finds remaining gaps
 *   4. GPT-4o-mini generates a warm 2-4 sentence reply asking the next question
 *
 * See: data/specs/el-cerito-voice-recipe-v1.md (§5.1)
 */
import type { APIRoute } from 'astro';
import { getOpenAI, redactPii, extractAndMergeRecipe, generateReply } from '../../../lib/ai';
import type { PartialRecipe } from '../../../lib/ai';
import { evaluateCoverage } from '../../../lib/recipe-coverage';

// Vercel serverless — allow up to 60s for Whisper + 2 GPT calls
export const prerender = false;
export const config = { maxDuration: 60 };

const MAX_AUDIO_BYTES = 24 * 1024 * 1024; // 24 MB — Whisper cap is 25 MB
const MAX_TRANSCRIPT_CHARS = 40_000;

export const POST: APIRoute = async ({ request }) => {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: "Request must be multipart/form-data with an 'audio' field." }, 400);
    }

    // Honeypot — bots that fill hidden fields get dropped silently
    const honey = (formData.get('website') as string | null) ?? '';
    if (honey.trim() !== '') return json({ error: 'Bad request' }, 400);

    const audioFile = formData.get('audio') as File | null;
    const textInput = ((formData.get('text') as string | null) ?? '').trim();
    if (!audioFile && !textInput) {
      return json({ error: "Missing required field: 'audio' or 'text'." }, 400);
    }
    if (audioFile && audioFile.size > MAX_AUDIO_BYTES) {
      return json(
        { error: `Audio too large (max 24 MB). Got ${(audioFile.size / 1024 / 1024).toFixed(1)} MB.` },
        413,
      );
    }

    const localeRaw = (formData.get('locale') as string | null) ?? 'es';
    const locale: 'es' | 'en' = localeRaw === 'en' ? 'en' : 'es';

    let existing: PartialRecipe | null = null;
    const recipeStr = formData.get('recipe') as string | null;
    if (recipeStr && recipeStr.trim() && recipeStr.trim() !== 'null') {
      try { existing = JSON.parse(recipeStr) as PartialRecipe; }
      catch { /* ignore malformed */ }
    }

    interface Turn { role: 'user' | 'assistant'; text: string }
    let history: Turn[] = [];
    const historyStr = formData.get('history') as string | null;
    if (historyStr && historyStr.trim() && historyStr.trim() !== 'null') {
      try { history = JSON.parse(historyStr) as Turn[]; }
      catch { /* ignore */ }
    }

    // If the caller sent typed text (correction path), skip Whisper.
    // Otherwise transcribe the audio blob.
    let rawTranscript: string;
    if (textInput) {
      rawTranscript = textInput;
    } else {
      const openai = getOpenAI();
      try {
        rawTranscript = (await openai.audio.transcriptions.create({
          file: audioFile!,
          model: 'whisper-1',
          response_format: 'text',
        })) as unknown as string;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return json({ error: `Whisper failed: ${msg}` }, 502);
      }
    }

    const transcript = redactPii(rawTranscript).slice(0, MAX_TRANSCRIPT_CHARS).trim();
    if (!transcript) {
      return json(
        { error: locale === 'en'
            ? 'No speech detected. Make sure your microphone is on.'
            : 'No detecté nada. Revisa que el micrófono esté encendido.' },
        422,
      );
    }

    let recipe: PartialRecipe;
    try {
      recipe = await extractAndMergeRecipe(transcript, existing);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return json({ error: `Extraction failed: ${msg}`, transcript }, 502);
    }

    const coverage = evaluateCoverage(recipe);

    const message = await generateReply({
      transcript,
      recipe,
      coverage,
      history,
      locale,
    });

    return json({
      transcript,
      recipe,
      coverage,
      message,
      isComplete: coverage.isComplete,
    });
  } catch (err) {
    console.error('[/api/voice/recipe-chat]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
