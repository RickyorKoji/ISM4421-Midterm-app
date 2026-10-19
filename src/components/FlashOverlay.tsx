interface FlashOverlayProps {
  flashId: number;
  color: string | null;
}

export function FlashOverlay({ flashId, color }: FlashOverlayProps) {
  if (!color || flashId === 0) return null;
  return (
    <div
      key={flashId}
      className="flash-overlay"
      style={{ background: `radial-gradient(ellipse at center, ${color}55 0%, transparent 70%)` }}
      aria-hidden="true"
    />
  );
}
