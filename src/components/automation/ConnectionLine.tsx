import { cn } from "@/lib/utils";

export type BranchType = 'yes' | 'no';

interface ConnectionLineProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isTemp?: boolean;
  isSelected?: boolean;
  isBranch?: boolean;
  branchType?: BranchType;
  onClick?: () => void;
}

export function ConnectionLine({ 
  startX, 
  startY, 
  endX, 
  endY, 
  isTemp = false,
  isSelected = false,
  isBranch = false,
  branchType,
  onClick 
}: ConnectionLineProps) {
  // Calculate control points for a smooth bezier curve
  const deltaY = endY - startY;
  const controlOffset = Math.max(Math.abs(deltaY) * 0.5, 50);
  
  const path = `M ${startX} ${startY} C ${startX} ${startY + controlOffset}, ${endX} ${endY - controlOffset}, ${endX} ${endY}`;

  // Determine stroke color based on branch type
  const getStrokeColor = () => {
    if (isTemp) {
      if (branchType === 'yes') return "hsl(142 76% 36% / 0.5)"; // green
      if (branchType === 'no') return "hsl(0 84% 60% / 0.5)"; // red
      return "hsl(var(--primary) / 0.5)";
    }
    if (isSelected) return "hsl(var(--primary))";
    if (branchType === 'yes') return "hsl(142 76% 36%)"; // green
    if (branchType === 'no') return "hsl(0 84% 60%)"; // red
    return "hsl(var(--border))";
  };

  const getFillColor = () => {
    if (isSelected) return "hsl(var(--primary))";
    if (branchType === 'yes') return "hsl(142 76% 36%)";
    if (branchType === 'no') return "hsl(0 84% 60%)";
    return "hsl(var(--border))";
  };

  return (
    <g className={cn("cursor-pointer", isTemp && "pointer-events-none")}>
      {/* Invisible wider path for easier clicking */}
      {!isTemp && (
        <path
          d={path}
          stroke="transparent"
          strokeWidth="20"
          fill="none"
          onClick={onClick}
        />
      )}
      {/* Visible path */}
      <path
        d={path}
        stroke={getStrokeColor()}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={isTemp ? "5,5" : undefined}
        fill="none"
        className="transition-all"
        onClick={onClick}
      />
      {/* Arrow at end */}
      {!isTemp && (
        <polygon
          points={`${endX},${endY} ${endX - 6},${endY - 10} ${endX + 6},${endY - 10}`}
          fill={getFillColor()}
          className="transition-all"
        />
      )}
      {/* Branch label */}
      {!isTemp && isBranch && branchType && (
        <text
          x={(startX + endX) / 2}
          y={(startY + endY) / 2 - 8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="500"
          fill={branchType === 'yes' ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)"}
          className="select-none pointer-events-none"
        >
          {branchType === 'yes' ? 'Yes' : 'No'}
        </text>
      )}
    </g>
  );
}
