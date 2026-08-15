interface SparklineProps {
  values: number[];
  /** Stroke color. Defaults to `currentColor` so the parent can theme it. */
  stroke?: string;
  className?: string;
}

/**
 * Minimal filled sparkline. Scales to the container via `preserveAspectRatio`
 * and keeps stroke width constant with `vectorEffect`, so the same component
 * reads correctly in a 60px tile and a full-width card.
 */
export function Sparkline({ values, stroke = "currentColor", className = "" }: SparklineProps) {
  const W = 100;
  const H = 28;

  if (values.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={className}
        aria-hidden="true"
      >
        <line
          x1="0"
          y1={H - 1}
          x2={W}
          y2={H - 1}
          stroke={stroke}
          strokeOpacity={0.25}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = W / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = H - 2 - ((v - min) / span) * (H - 4);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path d={area} fill={stroke} fillOpacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
