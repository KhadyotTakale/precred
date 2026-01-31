import { cn } from "@/lib/utils";

export type PortHandle = 'default' | 'yes' | 'no';

interface ConnectionPortProps {
  type: 'input' | 'output';
  nodeId: string;
  handle?: PortHandle;
  label?: string;
  position?: 'center' | 'left' | 'right';
  isConnecting?: boolean;
  isValidTarget?: boolean;
  onStartConnect?: (nodeId: string, portType: 'output', handle: PortHandle) => void;
  onEndConnect?: (nodeId: string, portType: 'input') => void;
  onPortHover?: (nodeId: string | null, portType: 'input' | 'output' | null, handle?: PortHandle) => void;
}

export function ConnectionPort({ 
  type, 
  nodeId, 
  handle = 'default',
  label,
  position = 'center',
  isConnecting,
  isValidTarget,
  onStartConnect, 
  onEndConnect,
  onPortHover 
}: ConnectionPortProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (type === 'output' && onStartConnect) {
      e.stopPropagation();
      e.preventDefault();
      onStartConnect(nodeId, 'output', handle);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (type === 'input' && onEndConnect && isConnecting) {
      e.stopPropagation();
      e.preventDefault();
      onEndConnect(nodeId, 'input');
    }
  };

  const handleMouseEnter = () => {
    onPortHover?.(nodeId, type, handle);
  };

  const handleMouseLeave = () => {
    onPortHover?.(null, null);
  };

  const positionClasses = {
    center: 'left-1/2 -translate-x-1/2',
    left: 'left-4',
    right: 'right-4',
  };

  const handleColors = {
    default: 'border-current',
    yes: 'border-green-500 bg-green-500/20',
    no: 'border-red-500 bg-red-500/20',
  };

  return (
    <div
      className={cn(
        "absolute flex flex-col items-center gap-0.5 z-10",
        type === 'output' ? "-bottom-2" : "-top-2",
        positionClasses[position]
      )}
    >
      {type === 'output' && label && (
        <span className={cn(
          "text-[10px] font-medium -mt-4 mb-0.5",
          handle === 'yes' && "text-green-600 dark:text-green-400",
          handle === 'no' && "text-red-600 dark:text-red-400"
        )}>
          {label}
        </span>
      )}
      <div
        className={cn(
          "h-4 w-4 rounded-full border-2 transition-all cursor-crosshair",
          "bg-background",
          handleColors[handle],
          isConnecting && type === 'input' && "scale-125",
          isValidTarget && "ring-2 ring-primary ring-offset-1 bg-primary/20",
          !isConnecting && "hover:scale-110 hover:bg-primary/20"
        )}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}
