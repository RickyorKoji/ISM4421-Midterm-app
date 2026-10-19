import { normalize, suggest } from './match';

export interface FormatCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Cheap, local sanity checks that reject obvious junk before we spend a
 * network call on it: empty/too-short/too-long input, keyboard mashing
 * (no vowels in a long run), and repeated-character spam.
 */
export function validateFormat(raw: string): FormatCheck {
  const trimmed = raw.trim();
  if (trimmed.length < 2) {
    return { ok: false, reason: 'Too short to be a real title.' };
  }
  if (trimmed.length > 80) {
    return { ok: false, reason: 'Too long — titles are usually under 80 characters.' };
  }
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 2) {
    return { ok: false, reason: "Doesn't look like it contains a real word." };
  }
  const collapsedNoSpace = trimmed.replace(/\s/g, '');
  if (/^(.)\1{3,}$/.test(collapsedNoSpace)) {
    return { ok: false, reason: 'Looks like repeated characters, not a title.' };
  }
  const alphaOnly = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  if (alphaOnly.length >= 6 && !/[aeiouy]/.test(alphaOnly)) {
    return { ok: false, reason: 'No vowels found — looks like random keystrokes.' };
  }
  return { ok: true };
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  matchedName?: string;
}

/** Checks the submission against the game's own dataset before anything else. */
export function checkDuplicate(raw: string): DuplicateCheck {
  const norm = normalize(raw);
  if (!norm) return { isDuplicate: false };
  const hits = suggest(raw, 5);
  const close = hits.find((h) => h.normalized === norm || h.normalized.includes(norm) || norm.includes(h.normalized));
  if (close) return { isDuplicate: true, matchedName: close.label };
  return { isDuplicate: false };
}

export interface WikiResult {
  found: boolean;
  title?: string;
  snippet?: string;
  url?: string;
  error?: string;
}

/**
 * Confirms the submission is "an actual thing" by checking for a matching
 * Wikipedia article (public, keyless, CORS-enabled API — no backend needed).
 * A network failure or no-match doesn't reject the submission outright; it
 * comes back unverified so a human can still review it.
 */
/**
 * `externalSignal` lets a caller (e.g. a debounced live-typing check) cancel
 * an in-flight lookup early when the input changes again, on top of this
 * function's own timeout.
 */
export async function verifyExists(raw: string, externalSignal?: AbortSignal): Promise<WikiResult> {
  const query = raw.trim();
  const endpoint = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&limit=1&search=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort);
  }
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) {
      return { found: false, error: `Lookup failed (HTTP ${res.status}).` };
    }
    const data = (await res.json()) as [string, string[], string[], string[]];
    const titles = data[1] ?? [];
    const descriptions = data[2] ?? [];
    const urls = data[3] ?? [];
    if (titles.length > 0) {
      return { found: true, title: titles[0], snippet: descriptions[0] || '', url: urls[0] };
    }
    return { found: false };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'AbortError';
    return { found: false, error: timedOut ? 'Lookup timed out.' : 'Could not reach the lookup service.' };
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
