'use client';

interface ServerStatusIndicatorProps {
  status: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A simple component that displays a colored dot to indicate server status
 */
export default function ServerStatusIndicator({ 
  status, 
  disabled = false,
  className = ""
}: ServerStatusIndicatorProps) {
  let color = 'bg-gray-400'; // Default unknown status

  if (disabled) {
    color = 'bg-gray-400';
  } else {
    switch (status?.toLowerCase()) {
      case 'running':
        color = 'bg-green-500';
        break;
      case 'error':
        color = 'bg-red-500';
        break;
      case 'stopped':
        color = 'bg-yellow-500';
        break;
      default:
        color = 'bg-gray-400'; // Unknown
    }
  }

  return (
    <div 
      className={`h-3 w-3 rounded-full ${color} ${className}`} 
      title={disabled ? 'Disabled' : status || 'Unknown'} 
    />
  );
}
