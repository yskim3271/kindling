/**
 * A small generated emblem for a project, so every game has a face on the
 * board even before it has cover art. It is drawn from the project's id alone:
 * the same id always gives the same emblem. It is decoration, not artwork from
 * the game, and is hidden from screen readers.
 */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SIZE = 9; // cells per side, with a one-cell margin; the left half is mirrored across the middle column

export function Sigil({ id, className = "" }: { id: string; className?: string }) {
  const seed = hash(id);
  const hue = seed % 360;
  let bits = hash(`${id}:cells`);

  const mid = (SIZE - 1) / 2;
  const cells: { x: number; y: number }[] = [];
  for (let y = 1; y < SIZE - 1; y++) {
    for (let x = 1; x <= mid; x++) {
      bits = (Math.imul(bits, 1103515245) + 12345) >>> 0;
      if ((bits >>> 16) % 100 < 48) {
        cells.push({ x, y });
        if (x !== mid) cells.push({ x: SIZE - 1 - x, y });
      }
    }
  }

  return (
    <svg
      className={`sigil ${className}`.trim()}
      style={{ "--sigil-h": hue } as React.CSSProperties}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {cells.map((cell) => (
        <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" />
      ))}
    </svg>
  );
}
