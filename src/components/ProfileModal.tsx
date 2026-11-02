import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../lib/profile';

interface ProfileModalProps {
  user: User;
  profile: Profile | null;
  onSave: (fields: { display_name: string; avatar_url: string }) => Promise<void>;
  onClose: () => void;
}

export function ProfileModal({ user, profile, onSave, onClose }: ProfileModalProps) {
  const meta = user.user_metadata ?? {};
  const [displayName, setDisplayName] = useState(profile?.display_name ?? meta.full_name ?? meta.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? meta.avatar_url ?? meta.picture ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    const trimmedName = displayName.trim();
    if (!trimmedName) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ display_name: trimmedName, avatar_url: avatarUrl.trim() });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pixel-border w-full max-w-sm bg-[var(--color-surface)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-retro text-xs text-[var(--color-brand)]">EDIT PROFILE</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-retro rounded-sm border-2 border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-muted)]"
          >
            X
          </button>
        </div>

        <div className="mb-4 flex justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar preview"
              className="h-16 w-16 rounded-full border-2 border-[var(--color-border)] object-cover"
            />
          ) : (
            <span className="font-retro flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] text-xl text-[var(--color-muted)]">
              {(displayName || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <label htmlFor="profile-display-name" className="mb-1 block text-[10px] text-[var(--color-muted)]">
          Display name
        </label>
        <input
          id="profile-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          maxLength={40}
          autoFocus
          className="mb-3 w-full rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-brand-2)]"
        />

        <label htmlFor="profile-avatar-url" className="mb-1 block text-[10px] text-[var(--color-muted)]">
          Avatar URL
        </label>
        <input
          id="profile-avatar-url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="https://…"
          className="mb-3 w-full rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-brand-2)]"
        />

        {error && <p className="mb-3 text-xs text-[#ff3b57]">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="font-retro rounded-sm border-2 border-[var(--color-border)] px-3 py-2 text-[10px] text-[var(--color-muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="font-retro rounded-sm border-2 border-[var(--color-border)] bg-[var(--color-brand)] px-3 py-2 text-[10px] text-[var(--color-ink)] disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
