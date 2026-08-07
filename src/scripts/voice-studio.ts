/**
 * Voice Recipe Studio — client-side controller for /agregar-receta and
 * /en/add-recipe. Handles MediaRecorder, chat UI, live preview, download,
 * and text corrections.
 *
 * Reads its config from `data-*` attributes on `#voice-studio`:
 *   data-locale         — "es" | "en"
 *   data-api            — API endpoint (default /api/voice/recipe-chat)
 *   data-intro-message  — first assistant message shown in the log
 *
 * See: data/specs/el-cerito-voice-recipe-v1.md
 */

interface Turn { role: 'user' | 'assistant'; text: string; }
interface PartialRecipe {
  title?: string;
  description?: string;
  servings?: number;
  servingLabel?: string;
  ingredients?: Array<{ name: string; amount: number; unit: string; note?: string; optional?: boolean }>;
  macros?: { calories: number; protein: number; carbs: number; fat: number; fiber?: number };
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  categories?: string[];
  healthLabels?: string[];
  difficulty?: string;
  ranchOriginal?: boolean;
}
interface ChatResponse {
  transcript: string;
  recipe: PartialRecipe;
  coverage: { score: number; isComplete: boolean; nextGaps: Array<{ label: string; question: string }> };
  message: string;
  locale?: 'es' | 'en';
  isComplete: boolean;
}

function init() {
  const root = document.getElementById('voice-studio');
  if (!root) return;

  const initialLocale = (root.dataset.locale ?? 'es') as 'es' | 'en';
  const api = root.dataset.api ?? '/api/voice/recipe-chat';
  const introMessage = root.dataset.introMessage ?? '';

  // Active locale — starts as page locale but can be overridden by the
  // server based on Whisper's language detection.
  let locale: 'es' | 'en' = initialLocale;

  const log = document.getElementById('vs-log')!;
  const micBtn = document.getElementById('vs-mic') as HTMLButtonElement;
  const micIcon = document.getElementById('vs-mic-icon')!;
  const textForm = document.getElementById('vs-text-form') as HTMLFormElement;
  const textInput = document.getElementById('vs-text-input') as HTMLInputElement;
  const status = document.getElementById('vs-status')!;
  const preview = document.getElementById('vs-preview')!;
  const downloadBtn = document.getElementById('vs-download') as HTMLButtonElement;
  const copyJsonBtn = document.getElementById('vs-copy-json') as HTMLButtonElement;
  const submitBtn = document.getElementById('vs-submit') as HTMLButtonElement | null;
  const resetBtn = document.getElementById('vs-reset') as HTMLButtonElement;

  let recipe: PartialRecipe = {};
  let history: Turn[] = [];
  let isRecording = false;
  let isBusy = false;
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let autoSubmitted = false;

  const t = (es: string, en: string) => (locale === 'en' ? en : es);
  const isSupported = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices
    && typeof MediaRecorder !== 'undefined';

  if (!isSupported) {
    micBtn.disabled = true;
    setStatus(t(
      'Tu navegador no soporta grabación de voz. Escribe la receta en el campo de texto.',
      "Your browser doesn't support voice recording. Type your recipe in the text field instead.",
    ));
  }

  if (introMessage) addAssistant(introMessage);

  // ── Recording ──────────────────────────────────────────────────────────────
  micBtn.addEventListener('click', async () => {
    if (isBusy) return;
    if (isRecording) stopRecording();
    else await startRecording();
  });

  async function startRecording() {
    try {
      setStatus(t('Pidiendo permiso del micrófono…', 'Requesting microphone permission…'));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType });
        stream.getTracks().forEach((tr) => tr.stop());
        void submitAudio(blob);
      };
      rec.start(250);
      mediaRecorder = rec;
      isRecording = true;
      micIcon.textContent = '⏹';
      micBtn.setAttribute('aria-label', t('Detener grabación', 'Stop recording'));
      micBtn.classList.remove('bg-terracotta');
      micBtn.classList.add('bg-red-600', 'animate-pulse');
      setStatus(t('Grabando… toca de nuevo para terminar.', 'Recording… tap again to finish.'));
    } catch (err) {
      setStatus(t(
        'No pude acceder al micrófono. Revisa los permisos.',
        "Couldn't access the microphone. Check permissions.",
      ));
      console.error(err);
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) mediaRecorder.stop();
    isRecording = false;
    micIcon.textContent = '🎤';
    micBtn.setAttribute('aria-label', t('Grabar receta con voz', 'Record recipe by voice'));
    micBtn.classList.add('bg-terracotta');
    micBtn.classList.remove('bg-red-600', 'animate-pulse');
  }

  async function submitAudio(blob: Blob) {
    isBusy = true;
    micBtn.disabled = true;
    setStatus(t('Transcribiendo y organizando la receta…', 'Transcribing and organising the recipe…'));
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'audio.webm');
      fd.append('recipe', JSON.stringify(recipe));
      fd.append('history', JSON.stringify(history));
      fd.append('locale', locale);
      const res = await fetch(api, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ChatResponse;
      handleResponse(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(t('Ups: ', 'Oops: ') + msg);
    } finally {
      isBusy = false;
      micBtn.disabled = !isSupported;
    }
  }

  // ── Text corrections ───────────────────────────────────────────────────────
  textForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text || isBusy) return;
    textInput.value = '';
    isBusy = true;
    addUser(text);
    history.push({ role: 'user', text });
    setStatus(t('Aplicando la corrección…', 'Applying correction…'));
    try {
      const fd = new FormData();
      fd.append('text', text);
      fd.append('recipe', JSON.stringify(recipe));
      fd.append('history', JSON.stringify(history));
      fd.append('locale', locale);
      const res = await fetch(api, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ChatResponse;
      handleResponse(data, /*skipUserBubble*/ true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(t('Ups: ', 'Oops: ') + msg);
    } finally {
      isBusy = false;
    }
  });

  function handleResponse(data: ChatResponse, skipUserBubble = false) {
    // Server may have overridden locale via Whisper language detection.
    if (data.locale && (data.locale === 'es' || data.locale === 'en')) {
      locale = data.locale;
    }
    if (!skipUserBubble && data.transcript) {
      addUser(data.transcript);
      history.push({ role: 'user', text: data.transcript });
    }
    if (data.recipe) {
      recipe = data.recipe;
      renderPreview();
    }
    if (data.message) {
      addAssistant(data.message);
      history.push({ role: 'assistant', text: data.message });
    }
    const enableSave = !!recipe.title || (recipe.ingredients ?? []).length > 0;
    downloadBtn.disabled = !enableSave;
    copyJsonBtn.disabled = !enableSave;
    const canSubmit = !!recipe.title && (recipe.ingredients ?? []).length > 0;
    if (submitBtn) {
      // Submitting to GitHub requires at least a title + one ingredient (server validates too)
      submitBtn.disabled = !canSubmit;
    }
    if (data.coverage) {
      setStatus(
        t(
          `Cobertura: ${data.coverage.score}/100${data.isComplete ? ' · ¡lista para guardar!' : ''}`,
          `Coverage: ${data.coverage.score}/100${data.isComplete ? ' · ready to save!' : ''}`,
        ),
      );
    } else {
      setStatus('');
    }
    // Auto-submit once the recipe is complete. Guard with autoSubmitted so
    // follow-up corrections after send don't re-fire.
    if (data.isComplete && canSubmit && !autoSubmitted && submitBtn) {
      autoSubmitted = true;
      addAssistant(t(
        'Se ve completa — la estoy enviando a la familia…',
        'Looks complete — sending it to the family…',
      ));
      // Small delay so the user sees the "ready" state before the send fires.
      setTimeout(() => { void doSubmit(); }, 900);
    }
  }

  function renderPreview() {
    const parts: string[] = [];
    if (recipe.title) parts.push(`<h3 class="text-2xl font-heading text-earth mb-1">${esc(recipe.title)}</h3>`);
    if (recipe.description) parts.push(`<p class="text-earth-soft italic mb-3">${esc(recipe.description)}</p>`);
    const meta: string[] = [];
    if (recipe.servings) meta.push(`${recipe.servings} ${esc(recipe.servingLabel ?? (locale === 'en' ? 'servings' : 'porciones'))}`);
    if (recipe.prepTime) meta.push(`${recipe.prepTime} min ${t('prep', 'prep')}`);
    if (recipe.cookTime) meta.push(`${recipe.cookTime} min ${t('cocción', 'cook')}`);
    if (recipe.difficulty) meta.push(esc(recipe.difficulty));
    if (meta.length) parts.push(`<p class="text-sm text-earth-soft mb-3">${meta.join(' · ')}</p>`);

    if ((recipe.ingredients ?? []).length > 0) {
      parts.push(`<h4 class="font-semibold mt-4 mb-2 text-earth">${t('Ingredientes', 'Ingredients')}</h4><ul class="list-disc pl-5 space-y-1">`);
      for (const ing of recipe.ingredients!) {
        const amt = ing.unit === 'to taste' ? t('al gusto', 'to taste') : `${ing.amount} ${ing.unit}`;
        const opt = ing.optional ? ` <span class="text-xs text-earth-soft">(${t('opcional', 'optional')})</span>` : '';
        const note = ing.note ? ` — ${esc(ing.note)}` : '';
        parts.push(`<li><strong>${amt}</strong> ${esc(ing.name)}${note}${opt}</li>`);
      }
      parts.push('</ul>');
    }

    if ((recipe.instructions ?? []).length > 0) {
      parts.push(`<h4 class="font-semibold mt-4 mb-2 text-earth">${t('Preparación', 'Steps')}</h4><ol class="list-decimal pl-5 space-y-1">`);
      for (const step of recipe.instructions!) parts.push(`<li>${esc(step)}</li>`);
      parts.push('</ol>');
    }

    if (recipe.macros && recipe.macros.calories > 0) {
      parts.push(`<p class="text-sm text-earth-soft mt-4">${t('Macros (por porción)', 'Macros (per serving)')}: ${recipe.macros.calories} kcal · P ${recipe.macros.protein}g · C ${recipe.macros.carbs}g · ${t('G', 'F')} ${recipe.macros.fat}g</p>`);
    }

    preview.innerHTML = parts.join('')
      || `<p class="text-earth-soft italic">${t('Aún no hay nada — empieza grabando arriba.', 'Nothing yet — start recording above.')}</p>`;
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  downloadBtn.addEventListener('click', () => {
    try {
      const md = buildMarkdown(recipe);
      const slug = slugify(recipe.title ?? 'nueva-receta');
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatus(t('No pude generar el archivo.', "Couldn't generate the file."));
      console.error(err);
    }
  });

  copyJsonBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
      setStatus(t('JSON copiado al portapapeles ✅', 'JSON copied to clipboard ✅'));
    } catch {
      setStatus(t('No pude copiar. Intenta seleccionar manualmente.', "Couldn't copy — select manually."));
    }
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm(t('¿Empezar de nuevo? Se perderá la receta actual.', 'Start over? Current recipe will be lost.'))) return;
    recipe = {};
    history = [];
    autoSubmitted = false;
    log.innerHTML = '';
    preview.innerHTML = `<p class="text-earth-soft italic">${t('Aún no hay nada — empieza grabando arriba.', 'Nothing yet — start recording above.')}</p>`;
    downloadBtn.disabled = true;
    copyJsonBtn.disabled = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      delete submitBtn.dataset.sent;
      submitBtn.textContent = t('Enviar receta a la familia', 'Send recipe to the family');
    }
    setStatus('');
    if (introMessage) addAssistant(introMessage);
  });

  // ── Submit → GitHub Issue ──────────────────────────────────────────────────
  async function doSubmit() {
    if (!submitBtn) return;
    if (submitBtn.dataset.sent === '1') return;
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = t('Enviando…', 'Sending…');
    setStatus(t('Abriendo issue en GitHub…', 'Opening GitHub issue…'));
    try {
      const transcript = history.filter((h) => h.role === 'user').map((h) => h.text).join('\n\n');
      const res = await fetch('/api/recipe/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe, transcript, locale }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const url = data.issue?.url ?? '#';
      const num = data.issue?.number;
      addAssistant(data.message ?? t('Receta enviada.', 'Recipe sent.'));
      setStatus('');
      preview.insertAdjacentHTML(
        'afterbegin',
        `<div class="mb-4 p-3 rounded-xl bg-sage/10 border border-sage/30 text-earth">
           ${t('✅ Receta enviada como', '✅ Recipe sent as')} <a class="underline font-semibold" href="${url}" target="_blank" rel="noopener">issue #${num}</a>.
         </div>`,
      );
      submitBtn.textContent = t('Enviada ✓', 'Sent ✓');
      submitBtn.dataset.sent = '1';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(t('No pude enviar: ', 'Couldn\'t send: ') + msg);
      submitBtn.textContent = originalLabel;
      submitBtn.disabled = false;
      // Allow the auto-submit path to retry on a subsequent complete signal.
      autoSubmitted = false;
    }
  }
  submitBtn?.addEventListener('click', () => { void doSubmit(); });

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function addUser(text: string) {
    const el = document.createElement('div');
    el.className = 'flex justify-end';
    el.innerHTML = `<div class="max-w-[80%] bg-terracotta text-cream px-4 py-2 rounded-2xl rounded-br-sm">${esc(text)}</div>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function addAssistant(text: string) {
    const el = document.createElement('div');
    el.className = 'flex justify-start';
    el.innerHTML = `<div class="max-w-[80%] bg-cream text-earth border border-clay px-4 py-2 rounded-2xl rounded-bl-sm">${esc(text)}</div>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function setStatus(text: string) { status.textContent = text; }
  function esc(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
  }
  async function safeJson(res: Response): Promise<any> {
    try { return await res.json(); } catch { return null; }
  }

  // ── Client-side markdown builder ──────────────────────────────────────────
  function slugify(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'nueva-receta';
  }
  function buildMarkdown(r: PartialRecipe): string {
    const title = r.title ?? 'Nueva receta';
    const slug = slugify(title);
    const pubDate = new Date().toISOString().slice(0, 10);
    const lines: string[] = ['---'];
    const push = (k: string, v: unknown) => { if (v !== undefined) lines.push(`${k}: ${yamlScalar(v)}`); };
    push('title', title);
    push('description', r.description ?? '');
    push('coverImage', `/images/recipes/${slug}.jpg`);
    push('coverImageAlt', title);
    push('servings', r.servings ?? 4);
    push('servingLabel', r.servingLabel ?? 'porciones');
    lines.push('ingredients:');
    for (const ing of r.ingredients ?? []) {
      lines.push(`  - name: ${yamlScalar(ing.name)}`);
      lines.push(`    amount: ${ing.amount}`);
      lines.push(`    unit: ${yamlScalar(ing.unit)}`);
      if (ing.note) lines.push(`    note: ${yamlScalar(ing.note)}`);
      if (ing.optional) lines.push(`    optional: true`);
    }
    lines.push('macros:');
    const m = r.macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    lines.push(`  calories: ${m.calories}`);
    lines.push(`  protein: ${m.protein}`);
    lines.push(`  carbs: ${m.carbs}`);
    lines.push(`  fat: ${m.fat}`);
    lines.push(`  fiber: ${m.fiber ?? 0}`);
    lines.push('instructions:');
    for (const step of r.instructions ?? []) lines.push(`  - ${yamlScalar(step)}`);
    push('prepTime', r.prepTime ?? 0);
    push('cookTime', r.cookTime ?? 0);
    lines.push('categories:');
    for (const c of r.categories ?? ['comida']) lines.push(`  - ${c}`);
    lines.push('healthLabels:');
    for (const h of r.healthLabels ?? []) lines.push(`  - ${h}`);
    push('difficulty', r.difficulty ?? 'facil');
    push('ranchOriginal', r.ranchOriginal ?? false);
    push('pubDate', pubDate);
    push('author', 'El Cerito');
    push('featured', false);
    push('draft', true);
    lines.push('---', '', r.description ?? '', '');
    return lines.join('\n');
  }
  function yamlScalar(v: unknown): string {
    if (v === null || v === undefined) return '""';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    const s = String(v);
    if (/[:#\n\[\]{}&*!|>'"%@`,]/.test(s) || /^\s|\s$/.test(s) || s === '') {
      return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return s;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
