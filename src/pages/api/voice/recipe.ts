/**
 * POST /api/voice/recipe
 *
 * One-shot voice → recipe extraction. Used when the cook narrates the whole
 * recipe in a single take (no iteration). See spec §5.2.
 */
import type { APIRoute } from 'astro';
import { getOpenAI, redactPii, extractRecipe } from '../../../lib/ai';
import { evaluateCoverage } from '../../../lib/recipe-coverage';

export const prerender = false;
export const config = { maxDuration: 60 };

const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

export const POST: APIRoute = async ({ request }) => {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: 'Request must be multipart/form-data.' }, 400);
    }

    const honey = (formData.get('website') as string | null) ?? '';
    if (honey.trim() !== '') return json({ error: 'Bad request' }, 400);

    const audioFile = formData.get('audio') as File | null;
    if (!audioFile) return json({ error: "Missing required field: 'audio'." }, 400);
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return json({ error: 'Audio too large (max 24 MB).' }, 413);
    }

    const openai = getOpenAI();
    let rawTranscript: string;
    try {
      rawTranscript = (await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'text',
      })) as unknown as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return json({ error: `Whisper failed: ${msg}` }, 502);
    }

    const transcript = redactPii(rawTranscript).trim();
    if (!transcript) return json({ error: 'Empty transcript' }, 422);

    const recipe = await extractRecipe(transcript);
    const coverage = evaluateCoverage(recipe);
    return json({ transcript, recipe, coverage });
  } catch (err) {
    console.error('[/api/voice/recipe]', err);
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
