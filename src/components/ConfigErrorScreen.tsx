export function ConfigErrorScreen() {
  return (
    <div className="crt-bg flex min-h-[100dvh] items-center justify-center px-4">
      <div className="pixel-border w-full max-w-sm bg-[var(--color-surface)] p-6 text-center">
        <h1 className="font-retro mb-3 text-sm text-[var(--color-partial)]">⚠ Setup needed</h1>
        <p className="text-xs text-[var(--color-muted)]">
          This deploy is missing <code className="text-[var(--color-text)]">VITE_SUPABASE_URL</code> and/or{' '}
          <code className="text-[var(--color-text)]">VITE_SUPABASE_ANON_KEY</code>. Add them in your host's site
          environment variables and redeploy.
        </p>
      </div>
    </div>
  );
}
