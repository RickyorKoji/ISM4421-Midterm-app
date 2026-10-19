export type SuggestionStatus = 'duplicate' | 'verified' | 'off-topic' | 'unverified' | 'rejected';

export interface SuggestionRecord {
  id: string;
  term: string;
  status: SuggestionStatus;
  note: string;
  matchedEntryName?: string;
  wikiTitle?: string;
  wikiSnippet?: string;
  wikiUrl?: string;
  wikiCategories?: string[];
  timestamp: number;
}

const KEY = 'pixel-guess:suggestion-log';
const MAX_RECORDS = 30;

export function getSuggestionLog(): SuggestionRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SuggestionRecord[];
  } catch {
    return [];
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function addSuggestionRecord(record: Omit<SuggestionRecord, 'id' | 'timestamp'>): SuggestionRecord {
  const full: SuggestionRecord = { ...record, id: makeId(), timestamp: Date.now() };
  const log = [full, ...getSuggestionLog()].slice(0, MAX_RECORDS);
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* storage unavailable (private browsing, quota) — submission still shown this session */
  }
  return full;
}
