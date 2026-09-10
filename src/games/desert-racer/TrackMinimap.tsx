import React, { useMemo } from 'react';
import { Flag, Navigation } from 'lucide-react';

interface TrackMinimapProps {
  trackProgress: number; // 0 to 1
  aiProgressList: { id: number; progress: number; color: string; name?: string }[];
  trackName?: string;
}

// Generates the closed circuit 2D path based on the 1000 track segments
function generateTrackPoints(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const TOTAL_SEGMENTS = 1000;
  
  // Mathematical simulation of the 6 track sectors to compute normalized 2D circuit loop
  let x = 0;
  let y = 0;
  let angle = -Math.PI / 2; // Starting heading facing "North" along the main straight
  
  const rawPoints: { x: number; y: number }[] = [];
  
  for (let i = 0; i < TOTAL_SEGMENTS; i += 5) {
    let curve = 0;
    if (i >= 65 && i <= 145) {
      curve = -Math.sin(((i - 65) / 80) * Math.PI) * 0.045; // Sweeping Left
    } else if (i >= 220 && i <= 290) {
      curve = Math.sin(((i - 220) / 70) * Math.PI) * 0.048; // Sweeping Right
    } else if (i >= 335 && i <= 415) {
      curve = -Math.sin(((i - 335) / 80) * Math.PI) * 0.042; // Technical Left
    } else if (i >= 495 && i <= 600) {
      curve = Math.sin(((i - 495) / 105) * Math.PI) * 0.082; // 180° Technical Right Hairpin
    } else if (i >= 640 && i <= 690) {
      curve = -Math.sin(((i - 640) / 50) * Math.PI) * 0.065; // Chicane Left
    } else if (i >= 690 && i <= 740) {
      curve = Math.sin(((i - 690) / 50) * Math.PI) * 0.065; // Chicane Right
    }
    
    angle += curve;
    const step = 2.4;
    x += Math.cos(angle) * step;
    y += Math.sin(angle) * step;
    rawPoints.push({ x, y });
  }

  // Smooth loop closure to ensure end connects seamlessly to start
  const last = rawPoints[rawPoints.length - 1];
  const count = rawPoints.length;
  
  for (let idx = 0; idx < count; idx++) {
    const factor = idx / count;
    const correctedX = rawPoints[idx].x - last.x * factor;
    const correctedY = rawPoints[idx].y - last.y * factor;
    rawPoints[idx] = { x: correctedX, y: correctedY };
  }

  // Find bounds to normalize into a 150x150 SVG box with 20px padding
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pt of rawPoints) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const targetSize = 110;
  const scale = targetSize / Math.max(width, height);
  const offsetX = 75 - (width * scale) / 2 - minX * scale;
  const offsetY = 75 - (height * scale) / 2 - minY * scale;

  for (const pt of rawPoints) {
    points.push({
      x: Math.round(pt.x * scale + offsetX),
      y: Math.round(pt.y * scale + offsetY)
    });
  }

  return points;
}

export const TrackMinimap: React.FC<TrackMinimapProps> = ({
  trackProgress,
  aiProgressList,
  trackName = 'CIRCUIT MAP'
}) => {
  const points = useMemo(() => generateTrackPoints(), []);

  // Construct SVG Path string
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    d += ' Z';
    return d;
  }, [points]);

  // Helper to get coordinates given progress (0..1)
  const getPointAtProgress = (progress: number) => {
    if (points.length === 0) return { x: 75, y: 75 };
    const p = Math.max(0, Math.min(0.999, progress % 1));
    const idx = Math.floor(p * points.length);
    const nextIdx = (idx + 1) % points.length;
    const subFrac = (p * points.length) - idx;
    const p1 = points[idx];
    const p2 = points[nextIdx];
    return {
      x: p1.x + (p2.x - p1.x) * subFrac,
      y: p1.y + (p2.y - p1.y) * subFrac
    };
  };

  const playerPos = getPointAtProgress(trackProgress);
  const startFinishPos = getPointAtProgress(0);

  // 10 Checkpoints spaced sequentially along circuit (10% to 92%)
  const CHECKPOINT_FRACTIONS = useMemo(() => [0.10, 0.20, 0.30, 0.40, 0.48, 0.58, 0.66, 0.74, 0.82, 0.92], []);
  const checkpointPositions = useMemo(() => {
    return CHECKPOINT_FRACTIONS.map(frac => getPointAtProgress(frac));
  }, [points, CHECKPOINT_FRACTIONS]);

  return (
    <div className="relative p-2.5 sm:p-3 rounded-2xl bg-neutral-950/90 border border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col items-center select-none pointer-events-auto">
      {/* Top Header Label */}
      <div className="w-full flex items-center justify-between text-[9px] font-mono font-black uppercase tracking-wider text-neutral-400 mb-1 px-1">
        <span className="flex items-center gap-1 text-amber-400">
          <Navigation className="w-2.5 h-2.5" />
          {trackName}
        </span>
        <span className="text-[8px] px-1.5 py-0.2 rounded bg-white/10 text-neutral-300">
          LIVE
        </span>
      </div>

      {/* SVG Circuit Canvas */}
      <div className="relative w-[130px] h-[130px] sm:w-[145px] sm:h-[145px]">
        <svg viewBox="0 0 150 150" className="w-full h-full overflow-visible">
          {/* Subtle Outer Track Glow */}
          <path
            d={pathD}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="8"
            strokeOpacity="0.08"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Track Road Base (Dark Asphalt) */}
          <path
            d={pathD}
            fill="none"
            stroke="#1c1d22"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Track Inner Racing Line (Steel Charcoal) */}
          <path
            d={pathD}
            fill="none"
            stroke="#3f3f46"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Subtle Center Guideline */}
          <path
            d={pathD}
            fill="none"
            stroke="#71717a"
            strokeWidth="1"
            strokeDasharray="2 3"
            strokeOpacity="0.6"
          />

          {/* 10 Real Circuit Checkpoint Markers */}
          {checkpointPositions.map((cp, idx) => (
            <circle
              key={idx}
              cx={cp.x}
              cy={cp.y}
              r="2.5"
              fill="#38bdf8"
              stroke="#09090b"
              strokeWidth="0.9"
            />
          ))}

          {/* Start / Finish Line (Checkered White Bar) */}
          <line
            x1={startFinishPos.x - 3}
            y1={startFinishPos.y - 3}
            x2={startFinishPos.x + 3}
            y2={startFinishPos.y + 3}
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* AI Opponent Markers */}
          {aiProgressList.map(ai => {
            const aiPos = getPointAtProgress(ai.progress);
            return (
              <g key={ai.id}>
                <circle
                  cx={aiPos.x}
                  cy={aiPos.y}
                  r="3.2"
                  fill={ai.color}
                  stroke="#000000"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}

          {/* Player Marker (Pulsing Gold / Amber Halo) */}
          <g>
            {/* Outer radar pulse */}
            <circle
              cx={playerPos.x}
              cy={playerPos.y}
              r="6.5"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.2"
              className="animate-ping"
              opacity="0.75"
            />
            {/* Outer high-contrast black border */}
            <circle
              cx={playerPos.x}
              cy={playerPos.y}
              r="4.5"
              fill="#fbbf24"
              stroke="#09090b"
              strokeWidth="1.8"
            />
            {/* Inner core */}
            <circle
              cx={playerPos.x}
              cy={playerPos.y}
              r="2"
              fill="#ffffff"
            />
          </g>
        </svg>

        {/* Legend Overlay at bottom */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between text-[8px] font-mono text-neutral-400 px-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" />
            YOU
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm" />
            AI
          </span>
          <span className="flex items-center gap-0.5 text-neutral-300">
            <Flag className="w-2.5 h-2.5 text-white" />
            FINISH
          </span>
        </div>
      </div>
    </div>
  );
};
