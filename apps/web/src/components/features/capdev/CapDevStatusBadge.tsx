'use client';

import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface CapDevStatusBadgeProps {
  status: string;
  className?: string;
}

export function CapDevStatusBadge({ status, className }: CapDevStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          label: 'Ready',
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
        };
      case 'generating':
        return {
          label: 'Generating...',
          variant: 'secondary' as const,
          icon: Loader2,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
          animate: true,
        };
      case 'pending':
        return {
          label: 'Pending',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        };
      case 'failed':
        return {
          label: 'Failed',
          variant: 'destructive' as const,
          icon: XCircle,
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
        };
      default:
        return {
          label: 'Not Generated',
          variant: 'outline' as const,
          icon: AlertCircle,
          className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ''}`}>
      <Icon className={`w-3 h-3 mr-1 ${config.animate ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}
