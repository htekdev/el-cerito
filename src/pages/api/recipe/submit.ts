/**
 * POST /api/recipe/submit
 *
 * Voice-submission → GitHub Issue pipeline.
 *
 * Body (application/json):
 *   { recipe: PartialRecipe, transcript?: string, locale?: 'es' | 'en' }
 *
 * Behaviour:
 *   1. Basic validation — must have title + at least one ingredient.
 *   2. Light rate limit (in-memory, per-IP, 3/hr) — best-effort; Vercel
 *      serverless is stateless so this only blocks bursts on a single warm
 *      instance. Good enough for beta while pages are `noindex`.
 *   3. Renders the recipe as YAML frontmatter + a JSON block inside a GitHub
 *      Issue body. Adds labels `new-recipe-request`, `voice-submission`,
 *      `needs-review` so the watcher agent on the rocha-family side can pick
 *      them up and open a PR with the actual `.md` file.
 *   4. Requires EL_CERITO_ISSUE_TOKEN (repo:issues scope on htekdev/el-cerito).
 *
 * Non-goals: this does NOT commit the .md file. The rocha-family el-cerito
 * agent watches the issue label and lands the PR.
 */
import type { APIRoute } from 'astro';
import type { PartialRecipe } from '../../../lib/ai';
import { evaluateCoverage } from '../../../lib/recipe-coverage';
import { buildRecipeMarkdown, slugify } from '../../../lib/recipe-markdown';

export const prerender = false;
export const config = { maxDuration: 30 };

const REPO_OWNER = 'htekdev';
const REPO_NAME = 'el-cerito';
const MAX_TITLE_LEN = 120;
const MAX_TRANSCRIPT_LEN = 8_000;

// ─── In-memory rate limit (per-warm-instance best effort) ────────────────────

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hr
const hits = new Map<string, number[]>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) return false;
  arr.push(now);
  hits.set(ip, arr);
  return true;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const token = process.env.EL_CERITO_ISSUE_TOKEN;
    if (!token) {
      return json({ error: 'EL_CERITO_ISSUE_TOKEN is not configured on this deployment.' }, 500);
    }

    const ip = (() => { try { return clientAddress; } catch { return 'unknown'; } })() ?? 'unknown';
    if (!rateLimit(ip)) {
      return json({ error: 'Muchas recetas por hora. Intenta más tarde.' }, 429);
    }

    let body: { recipe?: PartialRecipe; transcript?: string; locale?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: 'Body must be JSON.' }, 400);
    }

    const recipe = body.recipe;
    if (!recipe || typeof recipe !== 'object') {
      return json({ error: "Missing 'recipe' in body." }, 400);
    }
    if (!recipe.title || typeof recipe.title !== 'string' || !recipe.title.trim()) {
      return json({ error: 'La receta necesita al menos un título.' }, 422);
    }
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      return json({ error: 'La receta necesita al menos un ingrediente.' }, 422);
    }

    const locale: 'es' | 'en' = body.locale === 'en' ? 'en' : 'es';
    const title = recipe.title.trim().slice(0, MAX_TITLE_LEN);
    const slug = slugify(title);
    const transcript = (body.transcript ?? '').slice(0, MAX_TRANSCRIPT_LEN);
    const coverage = evaluateCoverage(recipe);

    const issueTitle = locale === 'en'
      ? `New recipe: ${title}`
      : `Nueva receta: ${title}`;
    const issueBody = renderIssueBody({ recipe, transcript, coverage, slug, locale });

    const ghRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'el-cerito-voice-submission',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: ['new-recipe-request', 'voice-submission', 'needs-review'],
        }),
      },
    );

    if (!ghRes.ok) {
      const text = await ghRes.text().catch(() => '');
      return json(
        { error: `GitHub API failed (${ghRes.status}): ${text.slice(0, 400)}` },
        502,
      );
    }

    const issue = await ghRes.json() as { number: number; html_url: string };
    return json({
      ok: true,
      issue: { number: issue.number, url: issue.html_url },
      message: locale === 'en'
        ? `Recipe sent — the family will review it (issue #${issue.number}).`
        : `Receta enviada — la familia la va a revisar (issue #${issue.number}).`,
    });
  } catch (err) {
    console.error('[/api/recipe/submit]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
};

function renderIssueBody(args: {
  recipe: PartialRecipe;
  transcript: string;
  coverage: ReturnType<typeof evaluateCoverage>;
  slug: string;
  locale: 'es' | 'en';
}): string {
  const { recipe, transcript, coverage, slug, locale } = args;
  const md = buildRecipeMarkdown(recipe);
  const humanSummary = renderHumanSummary(recipe, locale);
  const missing = coverage.nextGaps.length > 0
    ? coverage.nextGaps.map((g) => `- ${g.label}`).join('\n')
    : (locale === 'en' ? '_All required fields present._' : '_Todos los campos requeridos están._');

  const parts: string[] = [];
  parts.push(locale === 'en'
    ? '> Recipe submitted via **/en/add-recipe** (voice pipeline).'
    : '> Receta enviada por **/agregar-receta** (pipeline de voz).');
  parts.push('');
  parts.push(`**Source language:** \`${locale}\` — content below is in this language ONLY. The watcher agent is responsible for producing the bilingual ES + EN recipe file. Do NOT assume any \`*En\` fields are present.`);
  parts.push(`**Slug (proposed):** \`${slug}.md\``);
  parts.push(`**Coverage:** ${coverage.score}/100 · ${coverage.isComplete ? '✅' : '⚠️ incomplete'}`);
  parts.push('');
  parts.push(locale === 'en' ? '## Human summary' : '## Resumen');
  parts.push(humanSummary);
  parts.push('');
  parts.push(locale === 'en' ? '## Missing / low-confidence' : '## Falta / baja confianza');
  parts.push(missing);
  parts.push('');
  parts.push(locale === 'en'
    ? '## Recipe markdown (drop-in for `src/content/recipes/`)'
    : '## Markdown listo (para `src/content/recipes/`)');
  parts.push('```markdown');
  parts.push(md.trim());
  parts.push('```');
  parts.push('');
  parts.push(locale === 'en' ? '## Raw JSON' : '## JSON crudo');
  parts.push('```json');
  parts.push(JSON.stringify(recipe, null, 2));
  parts.push('```');
  if (transcript) {
    parts.push('');
    parts.push(locale === 'en' ? '## Transcript (PII-redacted)' : '## Transcripción (PII redactada)');
    parts.push('```');
    parts.push(transcript);
    parts.push('```');
  }
  parts.push('');
  parts.push('---');
  parts.push(locale === 'en'
    ? '_This issue is watched by the `el-cerito` agent, which will open a PR with the recipe file._'
    : '_Este issue lo vigila el agente `el-cerito` para abrir el PR con el archivo de la receta._');

  return parts.join('\n');
}

function renderHumanSummary(r: PartialRecipe, locale: 'es' | 'en'): string {
  const lines: string[] = [];
  if (r.title) lines.push(`**${r.title}**`);
  if (r.description) lines.push(`_${r.description}_`);
  const meta: string[] = [];
  if (r.servings) meta.push(`${r.servings} ${r.servingLabel ?? (locale === 'en' ? 'servings' : 'porciones')}`);
  if (r.prepTime) meta.push(`${r.prepTime} min ${locale === 'en' ? 'prep' : 'prep'}`);
  if (r.cookTime) meta.push(`${r.cookTime} min ${locale === 'en' ? 'cook' : 'cocción'}`);
  if (r.difficulty) meta.push(r.difficulty);
  if (meta.length) lines.push(meta.join(' · '));
  if ((r.ingredients ?? []).length > 0) {
    lines.push('', locale === 'en' ? '**Ingredients**' : '**Ingredientes**');
    for (const i of r.ingredients!) {
      const amt = i.unit === 'to taste'
        ? (locale === 'en' ? 'to taste' : 'al gusto')
        : `${i.amount} ${i.unit}`;
      lines.push(`- ${amt} ${i.name}${i.note ? ` — ${i.note}` : ''}${i.optional ? ' _(opt)_' : ''}`);
    }
  }
  if ((r.instructions ?? []).length > 0) {
    lines.push('', locale === 'en' ? '**Steps**' : '**Preparación**');
    r.instructions!.forEach((s, idx) => lines.push(`${idx + 1}. ${s}`));
  }
  if (r.story && r.story.trim()) {
    lines.push('', locale === 'en' ? '**Story**' : '**Historia**');
    lines.push(r.story.trim());
  }
  return lines.join('\n');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
