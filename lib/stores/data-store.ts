import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import {
  Client,
  Worker,
  Task,
  FileUploadState,
  ImportResult,
  HeaderMappingResult,
} from '@/lib/types/entities';

// Auto-save configuration
const AUTO_SAVE_DEBOUNCE_MS = 2000; // 2 seconds
const PERIODIC_SAVE_INTERVAL_MS = 30000; // 30 seconds
const BACKUP_STORAGE_KEY = 'data-alchemist-backup';
const BACKUP_VERSION = '1.0';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface BackupData {
  version: string;
  timestamp: number;
  data: {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
    lastSavedAt: Date | null;
  };
  checksum: string;
}

// Auto-save utilities
class AutoSaveManager {
  private debounceTimer: NodeJS.Timeout | null = null;
  private periodicTimer: NodeJS.Timeout | null = null;
  private isClient = typeof window !== 'undefined';

  private generateChecksum(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  saveToBackup(data: BackupData['data'], onStatusChange: (status: AutoSaveStatus) => void): void {
    if (!this.isClient) return;

    try {
      onStatusChange('saving');
      const backup: BackupData = {
        version: BACKUP_VERSION,
        timestamp: Date.now(),
        data,
        checksum: this.generateChecksum(data),
      };
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
      onStatusChange('saved');
    } catch (error) {
      console.error('Auto-save backup failed:', error);
      onStatusChange('error');
    }
  }

  loadFromBackup(): BackupData | null {
    if (!this.isClient) return null;

    try {
      const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (!stored) return null;

      const backup: BackupData = JSON.parse(stored);
      
      // Verify checksum
      const expectedChecksum = this.generateChecksum(backup.data);
      if (backup.checksum !== expectedChecksum) {
        console.warn('Backup checksum mismatch, data may be corrupted');
        return null;
      }

      return backup;
    } catch (error) {
      console.error('Failed to load backup:', error);
      return null;
    }
  }

  debouncedSave(saveFunction: () => void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(saveFunction, AUTO_SAVE_DEBOUNCE_MS);
  }

  startPeriodicSave(saveFunction: () => void): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
    }
    this.periodicTimer = setInterval(saveFunction, PERIODIC_SAVE_INTERVAL_MS);
  }

  stopPeriodicSave(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  cleanup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.stopPeriodicSave();
  }
}

const autoSaveManager = new AutoSaveManager();

interface DataState {
  // Entity data
  clients: Client[];
  workers: Worker[];
  tasks: Task[];

  // File upload state
  uploadState: FileUploadState;

  // Import and mapping
  lastImportResult: ImportResult | null;
  headerMappings: HeaderMappingResult | null;

  // UI state
  selectedEntityType: 'client' | 'worker' | 'task';
  isDataModified: boolean;
  lastSavedAt: Date | null;

  // Auto-save state
  autoSaveStatus: AutoSaveStatus;
  autoSaveEnabled: boolean;
  lastAutoSaveAt: Date | null;
  autoSaveError: string | null;

  // Actions
  setClients: (clients: Client[]) => void;
  setWorkers: (workers: Worker[]) => void;
  setTasks: (tasks: Task[]) => void;

  updateClient: (id: string, updates: Partial<Client>) => void;
  updateWorker: (id: string, updates: Partial<Worker>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;

  addClient: (client: Client) => void;
  addWorker: (worker: Worker) => void;
  addTask: (task: Task) => void;

  deleteClient: (id: string) => void;
  deleteWorker: (id: string) => void;
  deleteTask: (id: string) => void;

  setUploadState: (state: Partial<FileUploadState>) => void;
  setImportResult: (result: ImportResult) => void;
  setHeaderMappings: (mappings: HeaderMappingResult) => void;

  setSelectedEntityType: (type: 'client' | 'worker' | 'task') => void;
  markAsModified: () => void;
  markAsSaved: () => void;

  // Auto-save actions
  triggerAutoSave: () => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
  setAutoSaveError: (error: string | null) => void;
  recoverFromBackup: () => boolean;

  clearAllData: () => void;
  resetUploadState: () => void;
}

export const useDataStore = create<DataState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        clients: [],
        workers: [],
        tasks: [],

        uploadState: {
          isUploading: false,
          progress: 0,
        },

        lastImportResult: null,
        headerMappings: null,
        selectedEntityType: 'client',
        isDataModified: false,
        lastSavedAt: null,

        // Auto-save initial state
        autoSaveStatus: 'idle',
        autoSaveEnabled: true,
        lastAutoSaveAt: null,
        autoSaveError: null,

        // Entity setters with auto-save
        setClients: clients => {
          set({ clients, isDataModified: true }, false, 'setClients');
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        setWorkers: workers => {
          set({ workers, isDataModified: true }, false, 'setWorkers');
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        setTasks: tasks => {
          set({ tasks, isDataModified: true }, false, 'setTasks');
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        // Entity updaters with auto-save
        updateClient: (id, updates) => {
          set(
            state => ({
              clients: state.clients.map(client =>
                client.ClientID === id ? { ...client, ...updates } : client
              ),
              isDataModified: true,
            }),
            false,
            'updateClient'
          );
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        updateWorker: (id, updates) => {
          set(
            state => ({
              workers: state.workers.map(worker =>
                worker.WorkerID === id ? { ...worker, ...updates } : worker
              ),
              isDataModified: true,
            }),
            false,
            'updateWorker'
          );
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        updateTask: (id, updates) => {
          set(
            state => ({
              tasks: state.tasks.map(task =>
                task.TaskID === id ? { ...task, ...updates } : task
              ),
              isDataModified: true,
            }),
            false,
            'updateTask'
          );
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        // Entity adders with auto-save
        addClient: client => {
          set(
            state => ({
              clients: [...state.clients, client],
              isDataModified: true,
            }),
            false,
            'addClient'
          );
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        addWorker: worker => {
          set(
            state => ({
              workers: [...state.workers, worker],
              isDataModified: true,
            }),
            false,
            'addWorker'
          );
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        addTask: task => {
          set(
            state => ({
              tasks: [...state.tasks, task],
              isDataModified: true,
            }),
            false,
            'addTask'
          );
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        // Entity deleters with auto-save
        deleteClient: id => {
          set(
            state => ({
              clients: state.clients.filter(client => client.ClientID !== id),
              isDataModified: true,
            }),
            false,
            'deleteClient'
          );
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        deleteWorker: id => {
          set(
            state => ({
              workers: state.workers.filter(worker => worker.WorkerID !== id),
              isDataModified: true,
            }),
            false,
            'deleteWorker'
          );
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        deleteTask: id => {
          set(
            state => ({
              tasks: state.tasks.filter(task => task.TaskID !== id),
              isDataModified: true,
            }),
            false,
            'deleteTask'
          );
          const state = useDataStore.getState();
          if (state.autoSaveEnabled) {
            state.triggerAutoSave();
          }
        },

        // Upload and import
        setUploadState: state =>
          set(
            currentState => ({
              uploadState: { ...currentState.uploadState, ...state },
            }),
            false,
            'setUploadState'
          ),

        setImportResult: result =>
          set(
            {
              lastImportResult: result,
              clients: result.clients,
              workers: result.workers,
              tasks: result.tasks,
              isDataModified: true,
            },
            false,
            'setImportResult'
          ),

        setHeaderMappings: mappings =>
          set({ headerMappings: mappings }, false, 'setHeaderMappings'),

        // UI state
        setSelectedEntityType: type =>
          set({ selectedEntityType: type }, false, 'setSelectedEntityType'),

        markAsModified: () =>
          set({ isDataModified: true }, false, 'markAsModified'),

        markAsSaved: () =>
          set(
            { 
              isDataModified: false, 
              lastSavedAt: new Date(),
              lastAutoSaveAt: new Date(),
              autoSaveStatus: 'saved',
              autoSaveError: null
            },
            false,
            'markAsSaved'
          ),

        // Auto-save actions
        triggerAutoSave: () => {
          const state = useDataStore.getState();
          if (!state.autoSaveEnabled || !state.isDataModified) return;

          autoSaveManager.debouncedSave(() => {
            const currentState = useDataStore.getState();
            const dataToSave = {
              clients: currentState.clients,
              workers: currentState.workers,
              tasks: currentState.tasks,
              lastSavedAt: currentState.lastSavedAt,
            };

            autoSaveManager.saveToBackup(dataToSave, (status) => {
              set({ autoSaveStatus: status }, false, 'autoSaveStatus');
              if (status === 'saved') {
                set({
                  lastAutoSaveAt: new Date(),
                  autoSaveError: null,
                }, false, 'autoSaveSuccess');
              } else if (status === 'error') {
                set({
                  autoSaveError: 'Failed to auto-save data',
                }, false, 'autoSaveError');
              }
            });
          });
        },

        setAutoSaveEnabled: (enabled) =>
          set({ autoSaveEnabled: enabled }, false, 'setAutoSaveEnabled'),

        setAutoSaveStatus: (status) =>
          set({ autoSaveStatus: status }, false, 'setAutoSaveStatus'),

        setAutoSaveError: (error) =>
          set({ autoSaveError: error }, false, 'setAutoSaveError'),

        recoverFromBackup: () => {
          const backup = autoSaveManager.loadFromBackup();
          if (!backup) return false;

          const currentState = useDataStore.getState();
          const currentTimestamp = currentState.lastSavedAt?.getTime() || 0;

          // Use backup if it's newer or if current data is empty
          if (backup.timestamp > currentTimestamp || 
              (currentState.clients.length === 0 && 
               currentState.workers.length === 0 && 
               currentState.tasks.length === 0)) {
            set({
              clients: backup.data.clients,
              workers: backup.data.workers,
              tasks: backup.data.tasks,
              lastSavedAt: backup.data.lastSavedAt ? new Date(backup.data.lastSavedAt) : null,
              isDataModified: false,
            }, false, 'recoverFromBackup');
            return true;
          }

          return false;
        },

        // Cleanup
        clearAllData: () => {
          set(
            {
              clients: [],
              workers: [],
              tasks: [],
              lastImportResult: null,
              headerMappings: null,
              isDataModified: false,
              lastSavedAt: null,
              lastAutoSaveAt: null,
              autoSaveStatus: 'idle',
              autoSaveError: null,
            },
            false,
            'clearAllData'
          );
          // Clear backup as well
          if (typeof window !== 'undefined') {
            localStorage.removeItem(BACKUP_STORAGE_KEY);
          }
        },

        resetUploadState: () =>
          set(
            {
              uploadState: {
                isUploading: false,
                progress: 0,
              },
            },
            false,
            'resetUploadState'
          ),
      }),
      {
        name: 'data-alchemist-data',
        // Only persist essential data, not UI state
        partialize: state => ({
          clients: state.clients,
          workers: state.workers,
          tasks: state.tasks,
          lastSavedAt: state.lastSavedAt,
          autoSaveEnabled: state.autoSaveEnabled,
          lastAutoSaveAt: state.lastAutoSaveAt,
        }),
      }
    ),
    {
      name: 'data-store',
    }
  )
);

// Computed selectors
// Initialize auto-save system
if (typeof window !== 'undefined') {
  // Start periodic auto-save
  const startPeriodicSave = () => {
    autoSaveManager.startPeriodicSave(() => {
      const state = useDataStore.getState();
      if (state.autoSaveEnabled && state.isDataModified) {
        state.triggerAutoSave();
      }
    });
  };

  // Recovery on app start
  const initializeRecovery = () => {
    const state = useDataStore.getState();
    const recovered = state.recoverFromBackup();
    if (recovered) {
      console.log('Data recovered from backup');
    }
  };

  // Start auto-save system when store is ready
  setTimeout(() => {
    initializeRecovery();
    startPeriodicSave();
  }, 100);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    autoSaveManager.cleanup();
  });
}

export const useDataStoreSelectors = () => {
  const store = useDataStore();

  return {
    ...store,

    // Computed values
    totalEntities:
      store.clients.length + store.workers.length + store.tasks.length,

    hasData:
      store.clients.length > 0 ||
      store.workers.length > 0 ||
      store.tasks.length > 0,

    // Entity getters
    getClientById: (id: string) => store.clients.find(c => c.ClientID === id),
    getWorkerById: (id: string) => store.workers.find(w => w.WorkerID === id),
    getTaskById: (id: string) => store.tasks.find(t => t.TaskID === id),

    // Validation helpers
    hasValidClientReferences: () => {
      const taskIds = new Set(store.tasks.map(t => t.TaskID));
      return store.clients.every(client => {
        if (!client.RequestedTaskIDs) return true;
        const requestedIds = client.RequestedTaskIDs.split(',').map(id =>
          id.trim()
        );
        return requestedIds.every(id => taskIds.has(id));
      });
    },

    hasValidWorkerSkills: () => {
      const allRequiredSkills = new Set(
        store.tasks.flatMap(task =>
          task.RequiredSkills.split(',').map(skill =>
            skill.trim().toLowerCase()
          )
        )
      );
      const allWorkerSkills = new Set(
        store.workers.flatMap(worker =>
          worker.Skills.split(',').map(skill => skill.trim().toLowerCase())
        )
      );

      // Check if all required skills are covered by at least one worker
      return Array.from(allRequiredSkills).every(skill =>
        allWorkerSkills.has(skill)
      );
    },
  };
};
