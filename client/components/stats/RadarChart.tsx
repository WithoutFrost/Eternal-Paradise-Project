import React from "react";

export interface RadarValues {
  speed: number;
  offense: number;
  defense: number;
  shoot: number;
  pass: number;
  dribble: number;
}

const keys: (keyof RadarValues)[] = [
  "speed",
  "offense",
  "defense",
  "shoot",
  "pass",
  "dribble",
];

function toPoint(index: number, value: number, size: number) {
  const angle = (Math.PI * 2 * index) / keys.length - Math.PI / 2;
  const r = (value / 100) * (size / 2 - 12);
  return {
    x: size / 2 + r * Math.cos(angle),
    y: size / 2 + r * Math.sin(angle),
  };
}

export default function RadarChart({ values, size = 220 }: { values: RadarValues; size?: number }) {
  const points = keys.map((k, i) => toPoint(i, values[k], size));
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid */}
      {[1, 0.75, 0.5, 0.25].map((f, idx) => (
        <polygon
          key={idx}
          points={keys
            .map((_, i) => {
              const p = toPoint(i, f * 100, size);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.3)"
          strokeWidth={1}
        />
      ))}

      {/* Spokes */}
      {keys.map((_, i) => {
        const a = toPoint(i, 100, size);
        return (
          <line
            key={i}
            x1={size / 2}
            y1={size / 2}
            x2={a.x}
            y2={a.y}
            stroke="hsl(var(--muted-foreground) / 0.25)"
            strokeWidth={1}
          />
        );
      })}

      {/* Data area */}
      <polygon
        points={path}
        fill="rgba(0, 200, 255, 0.25)"
        stroke="rgba(0, 200, 255, 0.9)"
        strokeWidth={2}
      />
    </svg>
  );
}
