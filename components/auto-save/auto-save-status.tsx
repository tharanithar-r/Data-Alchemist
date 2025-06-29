'use client';

import { CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDataStore } from '@/lib/stores/data-store';

export function AutoSaveStatus() {
  const {
    autoSaveStatus,
    autoSaveEnabled,
    lastAutoSaveAt,
    autoSaveError,
    isDataModified,
    setAutoSaveEnabled,
    triggerAutoSave,
  } = useDataStore();

  const [timeAgo, setTimeAgo] = useState<string>('');

  // Update time ago display
  useEffect(() => {
    if (!lastAutoSaveAt) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const saveTime = new Date(lastAutoSaveAt);
      const diff = now.getTime() - saveTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setTimeAgo(`${minutes}m ago`);
      } else if (seconds > 0) {
        setTimeAgo(`${seconds}s ago`);
      } else {
        setTimeAgo('just now');
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [lastAutoSaveAt]);

  const getStatusIcon = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'saved':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      case 'idle':
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (!autoSaveEnabled) return 'Auto-save disabled';
    
    switch (autoSaveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastAutoSaveAt ? `Saved ${timeAgo}` : 'Saved';
      case 'error':
        return 'Save failed';
      case 'idle':
      default:
        return isDataModified ? 'Pending changes' : 'No changes';
    }
  };

  const getStatusVariant = () => {
    if (!autoSaveEnabled) return 'secondary';
    
    switch (autoSaveStatus) {
      case 'saving':
        return 'outline';
      case 'saved':
        return 'default';
      case 'error':
        return 'destructive';
      case 'idle':
      default:
        return isDataModified ? 'outline' : 'secondary';
    }
  };

  const getTooltipContent = () => {
    if (!autoSaveEnabled) {
      return (
        <div className="text-sm">
          <p className="font-medium">Auto-save is disabled</p>
          <p className="text-xs text-gray-400 mt-1">
            Click to enable automatic saving
          </p>
        </div>
      );
    }

    if (autoSaveError) {
      return (
        <div className="text-sm">
          <p className="font-medium text-red-400">Auto-save failed</p>
          <p className="text-xs text-gray-400 mt-1">{autoSaveError}</p>
          <p className="text-xs text-gray-400 mt-1">
            Click to retry manually
          </p>
        </div>
      );
    }

    return (
      <div className="text-sm">
        <p className="font-medium">Auto-save active</p>
        <p className="text-xs text-gray-400 mt-1">
          Changes are automatically saved every 2 seconds
        </p>
        {lastAutoSaveAt && (
          <p className="text-xs text-gray-400">
            Last saved: {new Date(lastAutoSaveAt).toLocaleTimeString()}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Click to toggle auto-save
        </p>
      </div>
    );
  };

  const handleClick = () => {
    if (!autoSaveEnabled) {
      setAutoSaveEnabled(true);
    } else if (autoSaveStatus === 'error' || isDataModified) {
      triggerAutoSave();
    } else {
      setAutoSaveEnabled(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            className="h-auto p-1"
          >
            <Badge 
              variant={getStatusVariant()}
              className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
            >
              {getStatusIcon()}
              {getStatusText()}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AutoSaveStatus;