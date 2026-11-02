import type { User } from '@supabase/supabase-js';

interface UserBadgeProps {
  user: User;
  onSignOut: () => void;
}

export function UserBadge({ user, onSignOut }: UserBadgeProps) {
  const meta = user.user_metadata ?? {};
  const name: string = meta.full_name ?? meta.name ?? user.email ?? 'Player';
  const avatarUrl: string | undefined = meta.avatar_url ?? meta.picture;

  return (
    <div className="flex items-center gap-2">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-6 w-6 rounded-full border-2 border-[var(--color-border)]" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] text-[10px]">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="max-w-[8rem] truncate text-[10px] text-[var(--color-muted)]">{name}</span>
      <button
        type="button"
        onClick={onSignOut}
        className="font-retro rounded-sm border-2 border-[var(--color-border)] px-2 py-1.5 text-[9px] text-[var(--color-muted)]"
      >
        Sign out
      </button>
    </div>
  );
}
