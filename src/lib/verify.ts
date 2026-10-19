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

// ---------------------------------------------------------------------------
// Wikipedia-backed existence + category classification.
//
// Wikipedia's `opensearch` endpoint (used previously) is an autocomplete/
// prefix matcher: it returns *something* for almost any text that shares
// words with an article title, which let unrelated phrases get marked
// "verified". This replaces it with a stricter two-step check:
//
//  1. Full-text search (`list=search`), then require the candidate's own
//     TITLE to actually resemble the query (not just the article body) —
//     see titleMatchesQuery. A result that merely mentions the query
//     somewhere in its text no longer counts.
//  2. For whichever candidate passes that gate, fetch its Wikipedia
//     categories and short description, and classify them as a video game,
//     an animated/TV series, both, or neither. Only "video game" or
//     "animated/TV series" counts as a match for this site — a real
//     Wikipedia article about something else (a fruit, a person, a city)
//     is correctly reported as *not* a game or show, instead of as
//     "verified" just because a page exists.
// ---------------------------------------------------------------------------

export type MediaKind = 'game' | 'show' | 'both' | 'unknown';

export interface WikiClassification {
  /** A title-similar candidate was found on Wikipedia at all. */
  found: boolean;
  /** found, AND it's categorized as a video game or animated/TV series. */
  isGameOrShow: boolean;
  kind: MediaKind;
  title?: string;
  snippet?: string;
  url?: string;
  /** A couple of the actual matched category names, for transparency. */
  matchedCategories?: string[];
  error?: string;
}

function stripDisambiguator(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function similarityRatio(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

function wordSetOverlap(a: string, b: string): number {
  const wa = new Set(a.split(' ').filter(Boolean));
  const wb = new Set(b.split(' ').filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.max(wa.size, wb.size);
}

/** Does this Wikipedia result's own TITLE actually resemble what was typed? */
export function titleMatchesQuery(query: string, candidateTitle: string): boolean {
  const normQuery = normalize(query);
  const normTitle = normalize(stripDisambiguator(candidateTitle));
  if (!normQuery || !normTitle) return false;
  if (normQuery === normTitle) return true;
  if (normTitle.startsWith(normQuery) && normQuery.length / normTitle.length >= 0.6) return true;
  if (normQuery.startsWith(normTitle) && normTitle.length / normQuery.length >= 0.6) return true;
  if (similarityRatio(normQuery, normTitle) >= 0.78) return true;
  if (wordSetOverlap(normQuery, normTitle) >= 0.7) return true;
  return false;
}

const GAME_PATTERN = /\bvideo games?\b|\bvideo game (series|franchises?)\b/i;
const SHOW_PATTERN = /\btelevision series\b|\btelevision program(me)?s?\b|\banimated (television )?(series|franchises?|sitcoms?|films?)\b|\banime (television )?series\b|\btv series\b/i;

function classifyFromText(text: string): MediaKind {
  const isGame = GAME_PATTERN.test(text);
  const isShow = SHOW_PATTERN.test(text);
  if (isGame && isShow) return 'both';
  if (isGame) return 'game';
  if (isShow) return 'show';
  return 'unknown';
}

interface SearchHit {
  pageid: number;
  title: string;
  snippet: string;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

/**
 * `externalSignal` lets a caller (e.g. a debounced live-typing check) cancel
 * an in-flight lookup early when the input changes again, on top of this
 * function's own timeout.
 */
export async function classifyTitle(raw: string, externalSignal?: AbortSignal): Promise<WikiClassification> {
  const query = raw.trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort);
  }

  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=6&srsearch=${encodeURIComponent(query)}`;
    const searchData = (await fetchJson(searchUrl, controller.signal)) as {
      query?: { search?: { pageid: number; title: string; snippet: string }[] };
    };
    const hits: SearchHit[] = (searchData.query?.search ?? []).map((h) => ({
      pageid: h.pageid,
      title: h.title,
      snippet: stripHtml(h.snippet ?? ''),
    }));

    const passing = hits.filter((h) => titleMatchesQuery(query, h.title));
    if (passing.length === 0) {
      return { found: false, isGameOrShow: false, kind: 'unknown' };
    }
    const exact = passing.find((h) => normalize(stripDisambiguator(h.title)) === normalize(query));
    const best = exact ?? passing[0];

    const propsUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&pageids=${best.pageid}&prop=categories|pageprops&cllimit=500&clshow=!hidden`;
    const propsData = (await fetchJson(propsUrl, controller.signal)) as {
      query?: {
        pages?: Record<
          string,
          {
            title: string;
            categories?: { title: string }[];
            pageprops?: { disambiguation?: string; 'wikibase-shortdesc'?: string };
            fullurl?: string;
          }
        >;
      };
    };
    const page = propsData.query?.pages?.[String(best.pageid)];
    const categories = (page?.categories ?? []).map((c) => c.title.replace(/^Category:/, ''));
    const shortdesc = page?.pageprops?.['wikibase-shortdesc'] ?? '';
    const isDisambiguation = page?.pageprops?.disambiguation !== undefined;

    if (isDisambiguation) {
      return {
        found: true,
        isGameOrShow: false,
        kind: 'unknown',
        title: best.title,
        snippet: 'Multiple unrelated topics share this name on Wikipedia.',
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, '_'))}`,
      };
    }

    const classifyText = `${categories.join(' | ')} ${shortdesc}`;
    const kind = classifyFromText(classifyText);
    const matchedCategories = categories.filter((c) => GAME_PATTERN.test(c) || SHOW_PATTERN.test(c)).slice(0, 3);

    return {
      found: true,
      isGameOrShow: kind !== 'unknown',
      kind,
      title: best.title,
      snippet: shortdesc || best.snippet,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, '_'))}`,
      matchedCategories,
    };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'AbortError';
    return {
      found: false,
      isGameOrShow: false,
      kind: 'unknown',
      error: timedOut ? 'Lookup timed out.' : 'Could not reach the lookup service.',
    };
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
