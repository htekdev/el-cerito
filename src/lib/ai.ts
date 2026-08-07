/**
 * El Cerito — AI utilities for the voice-recipe flow.
 *
 * Pattern borrowed from `htekdev/servodetail` `src/lib/ai.ts` and
 * `src/app/api/voice/onboard-chat/route.ts`. See spec:
 * `data/specs/el-cerito-voice-recipe-v1.md`.
 *
 * Cost profile: `whisper-1` for STT ($0.006/min), `gpt-5.5` for
 * extraction + reply. Model can be overridden with EL_CERITO_OPENAI_MODEL.
 */
import OpenAI from 'openai';

// Best available reasoning model for structured extraction as of 2026.
// Family wants smart parsing over cheap parsing. Overridable via
// EL_CERITO_OPENAI_MODEL — e.g. `gpt-5.6-luna` for max throughput,
// `gpt-5.5-pro` for hardest ambiguities. gpt-5.5 sits in the sweet spot
// (10K RPM, strong structured output) for recipe parsing.
export const OPENAI_MODEL = process.env.EL_CERITO_OPENAI_MODEL ?? 'gpt-5.5';

// ─── OpenAI client (lazy) ─────────────────────────────────────────────────────

let _openai: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ─── PII redaction ────────────────────────────────────────────────────────────

export function redactPii(text: string): string {
  return text
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[CARD]');
}

// ─── Recipe types (partial — matches src/content.config.ts) ───────────────────

export type Unit =
  | 'g' | 'kg' | 'ml' | 'l'
  | 'tsp' | 'tbsp' | 'cup' | 'cups'
  | 'piece' | 'pieces' | 'clove' | 'cloves'
  | 'pinch' | 'slice' | 'slices' | 'can' | 'to taste';

export interface RecipeIngredient {
  name: string;
  nameEn?: string;
  amount: number;
  unit: Unit;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  note?: string;
  noteEn?: string;
  optional?: boolean;
}

export interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
}

export type Category =
  | 'desayuno' | 'comida' | 'cena' | 'snack'
  | 'postre' | 'bebida' | 'guarnicion' | 'salsa';

export type HealthLabel =
  | 'low-calorie' | 'low-carb' | 'low-fat' | 'high-protein'
  | 'high-fiber' | 'gluten-free' | 'vegetarian' | 'vegan';

export interface Recipe {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  servings: number;
  servingLabel: string;
  ingredients: RecipeIngredient[];
  macros: RecipeMacros;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  categories: Category[];
  healthLabels: HealthLabel[];
  difficulty: 'facil' | 'media' | 'dificil';
  ranchOriginal: boolean;
  /**
   * Model-flagged clarifying questions. Populated by the extractor when
   * an ingredient, quantity, or preparation is ambiguous (e.g. "Jell-O"
   * → powder mix vs pre-made cups). These MUST be resolved before the
   * client will let the recipe submit.
   */
  ambiguities: Array<{ label: string; question: string }>;
}

export type PartialRecipe = Partial<Recipe>;

// ─── Extraction / merge prompt ────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are the recipe extractor for El Cerito, a bilingual (Spanish-primary) family recipe site from the Ojo de Agua ranch in México.

Your job: from a voice transcript of someone describing a recipe, extract or UPDATE a structured Recipe JSON. You MERGE new info into the existing recipe rather than starting fresh.

Rules:
- Spanish is the PRIMARY language. Fill *En fields only if the cook explicitly used English.
- If the cook corrects a previous value (e.g. "no, son 4 tomates"), replace the old value.
- Do NOT invent facts. If something wasn't mentioned, omit it.
- \`servings\` defaults to 4 if never stated. Use whatever the cook says otherwise.
- \`servingLabel\` is a short Spanish noun ("porciones", "tacos", "vasos", "tazas"). Default "porciones".
- \`ingredients[].amount\` is numeric only (no ranges). If the cook says "un chorrito" / "al gusto", set unit to "to taste" and amount to 1.
- \`ingredients[].unit\` MUST be one of: g, kg, ml, l, tsp, tbsp, cup, cups, piece, pieces, clove, cloves, pinch, slice, slices, can, to taste.
- \`macros\` (per serving) — fill only when confident from ingredients + amounts; use 0 for unknown fields.
- \`categories\` — infer from context: "para el desayuno" → desayuno, "salsa" → salsa, "postre" → postre. At least 1.
- \`instructions\` — short, imperative Spanish steps. Merge into the existing list (don't duplicate).
- \`healthLabels\` — only when clearly warranted (vegetarian, vegan, gluten-free, etc.).
- \`difficulty\` — "facil" | "media" | "dificil". Default "facil".
- \`prepTime\` / \`cookTime\` — integer minutes. 0 if unknown.

CRITICAL — Clarifying questions (\`ambiguities\` field):
You MUST populate \`ambiguities\` whenever an ingredient, quantity, or preparation is genuinely unclear. This is the ONLY way we can ask the cook for clarification before saving. Do NOT guess and move on — flag it. Empty array only when everything is unambiguous.

Ambiguous ingredient examples that REQUIRE clarification:
- "Jell-O" / "gelatina" → powder mix vs pre-made cups?
- "cream" / "crema" → heavy cream, sour cream, cream cheese, media crema, crema mexicana?
- "cheese" / "queso" → which kind (cheddar, mozzarella, Chihuahua, Oaxaca, panela, cotija, queso fresco)?
- "milk" / "leche" → whole, 2%, skim, condensed, evaporated, plant-based?
- "tortilla" → flour or corn?
- "chile" / "chili" → which one (poblano, jalapeño, serrano, ancho, guajillo, chipotle)?
- "onion" / "cebolla" → white, yellow, red, green?
- "tomato" / "tomate" → red (jitomate) or tomatillo (green)?
- "chicken" / "pollo" → breast, thigh, whole, ground? raw or pre-cooked?
- "beef" / "carne de res" → ground, steak, roast, stew meat?
- "beans" / "frijoles" → black, pinto, refried? dry or canned?
- "rice" / "arroz" → white, brown, mexican-style?
- "oil" / "aceite" → vegetable, olive, avocado?
- "sugar" / "azúcar" → white, brown, powdered?
- "flour" / "harina" → all-purpose, whole wheat, masa, self-rising?

Also flag when:
- An ingredient is mentioned with NO amount ("le pongo un poco de cebolla" — how much?).
- A preparation state is unclear (raw vs cooked, fresh vs canned, whole vs chopped).
- A step references a technique that could mean multiple things (does "hasta que dore" mean 2 min or 10 min?).

For each ambiguity, output:
{
  "label": "short subject in the recipe locale (e.g. 'gelatina', 'crema', 'cantidad de cebolla')",
  "question": "one warm, specific question in the SAME language the cook is speaking. Offer 2-4 concrete choices when possible. Do NOT ask multiple questions in one string."
}

Remove an entry from \`ambiguities\` once the cook has answered it (i.e. the answer is now reflected in the recipe fields).

- Return ONLY valid JSON — no markdown fences, no prose.

Output schema (exact keys, all optional in the response — omit what you don't have):
{
  "title": "string",
  "titleEn": "string",
  "description": "string",
  "descriptionEn": "string",
  "servings": 4,
  "servingLabel": "porciones",
  "ingredients": [
    { "name": "string", "amount": 0, "unit": "g",
      "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0,
      "note": "string", "optional": false }
  ],
  "macros": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0 },
  "instructions": ["string"],
  "prepTime": 0,
  "cookTime": 0,
  "categories": ["comida"],
  "healthLabels": [],
  "difficulty": "facil",
  "ranchOriginal": false,
  "ambiguities": [
    { "label": "gelatina", "question": "¿Es gelatina en polvo o vasitos ya hechos?" }
  ]
}`;

/**
 * One-shot extraction from a transcript (no prior recipe context).
 */
export async function extractRecipe(transcript: string): Promise<PartialRecipe> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `EXISTING RECIPE:\n{}\n\nNEW TRANSCRIPT:\n<data>\n${transcript}\n</data>\n\nExtract the full recipe:`,
      },
    ],
    max_completion_tokens: 3000,
    temperature: 0.1,
  });
  const raw = response.choices[0]?.message?.content ?? '{}';
  return safeJson<PartialRecipe>(raw);
}

/**
 * Iterative extract — takes the accumulated recipe + a new transcript,
 * returns the updated merged recipe.
 */
export async function extractAndMergeRecipe(
  transcript: string,
  existing: PartialRecipe | null,
): Promise<PartialRecipe> {
  const openai = getOpenAI();
  const existingJson = existing ? JSON.stringify(existing, null, 2) : '{}';
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `EXISTING RECIPE:\n${existingJson}\n\nNEW TRANSCRIPT:\n<data>\n${transcript}\n</data>\n\nReturn the FULL merged recipe (existing + new info):`,
      },
    ],
    max_completion_tokens: 3000,
    temperature: 0.1,
  });
  const raw = response.choices[0]?.message?.content ?? '{}';
  const merged = safeJson<PartialRecipe>(raw);
  // Belt-and-suspenders: shallow-merge on our side so we never lose fields
  // the model forgot to echo back.
  return shallowMergeRecipe(existing ?? {}, merged);
}

// ─── Conversational reply generator ───────────────────────────────────────────

const REPLY_SYSTEM_PROMPT_ES = `Eres una asistente cálida y familiar de El Cerito, el recetario del rancho en Ojo de Agua, México.

Estás ayudando a alguien a subir una receta hablando. Después de cada mensaje del cocinero:
1. Reconoce brevemente lo que entendiste (menciona UNA cosa específica: un ingrediente, la porción, o el tiempo — no la lista completa).
2. Haz UNA sola pregunta.

Prioridad de la pregunta (de mayor a menor):
- Si hay AMBIGÜEDADES abiertas, pregunta por la PRIMERA — usa exactamente esa pregunta (o una versión igual de específica), ofreciendo las opciones concretas.
- Si no hay ambigüedades pero faltan campos, pregunta por el hueco más importante.
- Si ya no falta nada, di algo como "Creo que ya tengo todo. ¿Lo mando a la familia?" — NO hagas otra pregunta.

Reglas:
- 2-4 oraciones máximo, español cálido y cercano (tuteo).
- Cuando aclares una ambigüedad, ofrece 2-4 opciones concretas ("¿es queso Chihuahua, Oaxaca o panela?").
- Nunca supongas — si dijo "gelatina", "crema", "queso", "leche", "tortilla", "chile", "cebolla", "tomate", pregunta cuál es antes de guardar.
- Nada de "¡Perfecto!" ni "¡Genial!" — habla como tía cocinera, no como robot.
- Devuelve SOLO el texto de la respuesta. Sin JSON, sin markdown.`;

const REPLY_SYSTEM_PROMPT_EN = `You are a warm, family-style assistant for El Cerito, the family-ranch recipe site.

You are helping someone submit a recipe by voice. After each user message:
1. Briefly acknowledge one specific thing you understood (an ingredient, the servings, or a time — not the whole list).
2. Ask exactly ONE question.

Question priority (highest to lowest):
- If there are open AMBIGUITIES, ask about the FIRST one — use that exact question (or an equally specific rewording) and offer the concrete choices.
- Otherwise, if there are missing fields, ask about the highest-priority gap.
- If nothing is missing, say something like "I think I've got everything — shall I send it to the family?" — do NOT ask another question.

Rules:
- 2-4 sentences max, warm and personal.
- When clarifying an ambiguity, offer 2-4 concrete choices ("Is that cheddar, mozzarella, or Chihuahua?").
- Never assume — if they said "Jell-O", "cream", "cheese", "milk", "tortilla", "chile", "onion", "tomato", ask which kind before saving.
- No "" or "" filler.
- Return ONLY the reply text. No JSON, no markdown.`;

export interface ReplyContext {
  transcript: string;
  recipe: PartialRecipe;
  coverage: { score: number; isComplete: boolean; nextGaps: { label: string; question: string }[]; ambiguities: { label: string; question: string }[] };
  history: { role: 'user' | 'assistant'; text: string }[];
  locale: 'es' | 'en';
}

export async function generateReply(ctx: ReplyContext): Promise<string> {
  const openai = getOpenAI();
  const system = ctx.locale === 'en' ? REPLY_SYSTEM_PROMPT_EN : REPLY_SYSTEM_PROMPT_ES;

  const ambiguitySummary = ctx.coverage.ambiguities.length > 0
    ? `OPEN AMBIGUITIES — resolve the FIRST one before anything else:\n${ctx.coverage.ambiguities
        .map((a, i) => `  ${i + 1}. ${a.label}: ${a.question}`)
        .join('\n')}`
    : 'No open ambiguities.';

  const gapSummary = ctx.coverage.nextGaps.length > 0
    ? `Missing fields (ask about the FIRST one only, and only if there are no ambiguities): ${ctx.coverage.nextGaps.map((g) => g.label).join(', ')}`
    : 'All required fields are filled.';

  const historyContext = ctx.history
    .slice(-4)
    .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
    .join('\n');

  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            historyContext ? `RECENT CONVERSATION:\n${historyContext}\n` : '',
            `USER JUST SAID: "${ctx.transcript}"`,
            `CURRENT RECIPE SUMMARY: ${summariseRecipe(ctx.recipe)}`,
            `COVERAGE: ${ctx.coverage.score}/100 (${ctx.coverage.isComplete ? 'COMPLETE' : 'incomplete'})`,
            ambiguitySummary,
            gapSummary,
          ].filter(Boolean).join('\n'),
        },
      ],
      max_completion_tokens: 200,
      temperature: 0.7,
    });
    const text = resp.choices[0]?.message?.content?.trim();
    if (text) return text;
  } catch {
    // fall through to fallback
  }
  // Scripted fallback if GPT fails.
  // Priority: ambiguity > gap > completion.
  if (ctx.coverage.ambiguities[0]) {
    return ctx.coverage.ambiguities[0].question;
  }
  if (ctx.coverage.isComplete) {
    return ctx.locale === 'en'
      ? "I think I've got everything — shall I send it to the family?"
      : 'Creo que ya tengo todo. ¿Lo mando a la familia?';
  }
  return ctx.coverage.nextGaps[0]?.question ?? (ctx.locale === 'en'
    ? 'Tell me more about the recipe.'
    : 'Cuéntame más de la receta.');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to strip accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return {} as T;
    }
  }
}

function shallowMergeRecipe(a: PartialRecipe, b: PartialRecipe): PartialRecipe {
  return {
    ...a,
    ...b,
    // preserve arrays if the model dropped them
    ingredients: (b.ingredients?.length ? b.ingredients : a.ingredients) ?? [],
    instructions: (b.instructions?.length ? b.instructions : a.instructions) ?? [],
    categories: (b.categories?.length ? b.categories : a.categories) ?? [],
    healthLabels: (b.healthLabels?.length ? b.healthLabels : a.healthLabels) ?? [],
    macros: b.macros ?? a.macros,
    // ambiguities are always the model's fresh list — it prunes resolved
    // ones as the cook answers them. If the model omitted the key entirely
    // (i.e. undefined, not an empty array), fall back to the previous list
    // so we don't lose open questions on a bad turn.
    ambiguities: b.ambiguities !== undefined ? b.ambiguities : a.ambiguities,
  };
}

function summariseRecipe(r: PartialRecipe): string {
  const parts: string[] = [];
  if (r.title) parts.push(`title="${r.title}"`);
  if (r.servings) parts.push(`servings=${r.servings}`);
  if (r.ingredients?.length) parts.push(`${r.ingredients.length} ingredients`);
  if (r.instructions?.length) parts.push(`${r.instructions.length} steps`);
  if (r.categories?.length) parts.push(`categories=[${r.categories.join(',')}]`);
  return parts.join(', ') || '(empty)';
}
