'use client';

interface CircularProgressProps {
  /** Current value (numerator) */
  value: number;
  /** Total value (denominator) */
  total: number;
  /** Diameter of the chart in pixels */
  size?: number;
  /** Accent color for the progress arc */
  progressColor?: string;
  /** Background color for the track */
  trackColor?: string;
  /** Label text below the fraction */
  label?: string;
  /** Stroke width of the progress ring */
  strokeWidth?: number;
}

export function CircularProgress({
  value,
  total,
  size = 120,
  progressColor = '#22c55e', // Green for progress
  trackColor = '#e5e7eb', // Light gray for background track
  label,
  strokeWidth = 10,
}: CircularProgressProps) {
  // Calculate percentage (capped at 100%)
  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  
  // SVG circle calculations
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dash offset for progress
  // Progress starts from bottom (6 o'clock) and goes clockwise
  const progressOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform rotate-90"
        >
          {/* Background track circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            className="transition-all duration-500 ease-out"
            style={{
              transformOrigin: 'center',
              transform: 'rotate(180deg)', // Start from bottom
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none">
            {value}
            <span className="text-sm font-normal text-muted-foreground">
              /{total}
            </span>
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
      )}
    </div>
  );
}
