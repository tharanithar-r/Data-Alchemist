'use client';

import { AlertTriangle, Clock, Database } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/lib/stores/data-store';

interface BackupData {
  version: string;
  timestamp: number;
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
    lastSavedAt: Date | null;
  };
  checksum: string;
}

export function RecoveryDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [backupInfo, setBackupInfo] = useState<BackupData | null>(null);
  const { recoverFromBackup, clients, workers, tasks } = useDataStore();

  useEffect(() => {
    // Check for backup data on component mount
    const checkForBackup = () => {
      try {
        const stored = localStorage.getItem('data-alchemist-backup');
        if (!stored) return;

        const backup: BackupData = JSON.parse(stored);
        const hasCurrentData = clients.length > 0 || workers.length > 0 || tasks.length > 0;
        
        // Show dialog if backup exists and either:
        // 1. No current data exists, or
        // 2. Backup is significantly newer (more than 5 minutes)
        const timeDiff = Date.now() - backup.timestamp;
        const isSignificantlyNewer = timeDiff < 5 * 60 * 1000; // 5 minutes

        if (!hasCurrentData || isSignificantlyNewer) {
          setBackupInfo(backup);
          setShowDialog(true);
        }
      } catch (error) {
        console.error('Failed to check backup:', error);
      }
    };

    // Small delay to ensure store is initialized
    const timer = setTimeout(checkForBackup, 500);
    return () => clearTimeout(timer);
  }, [clients.length, workers.length, tasks.length]);

  const handleRecover = () => {
    const recovered = recoverFromBackup();
    if (recovered) {
      console.log('Data successfully recovered from backup');
    }
    setShowDialog(false);
  };

  const handleSkip = () => {
    setShowDialog(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getDataSummary = () => {
    if (!backupInfo) return null;

    const { clients, workers, tasks } = backupInfo.data;
    const total = clients.length + workers.length + tasks.length;

    return (
      <div className="flex gap-2 mt-2">
        {clients.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {clients.length} clients
          </Badge>
        )}
        {workers.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {workers.length} workers
          </Badge>
        )}
        {tasks.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {tasks.length} tasks
          </Badge>
        )}
        {total === 0 && (
          <Badge variant="secondary" className="text-xs">
            No data
          </Badge>
        )}
      </div>
    );
  };

  if (!showDialog || !backupInfo) return null;

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Data Recovery Available
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                We found a recent backup of your data that might contain unsaved changes.
              </p>
              
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Backup created:</span>
                  <span>{formatDate(backupInfo.timestamp)}</span>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium">Contains:</span>
                  {getDataSummary()}
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Recovering will replace any current data. Make sure you want to proceed.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkip}>
            Skip Recovery
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleRecover}>
            Recover Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default RecoveryDialog;