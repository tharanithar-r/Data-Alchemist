import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { createRulePreview, RulePreview } from '@/lib/rules/rule-preview';
import { Client, Worker, Task } from '@/lib/types/entities';

// Auto-save configuration
const AUTO_SAVE_DEBOUNCE_MS = 2000; // 2 seconds
const BACKUP_STORAGE_KEY = 'data-alchemist-rules-backup';
const BACKUP_VERSION = '1.0';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Rule type definitions
export interface BaseRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoRunRule extends BaseRule {
  type: 'coRun';
  taskIds: string[];
}

export interface SlotRestrictionRule extends BaseRule {
  type: 'slotRestriction';
  targetType: 'client' | 'worker';
  groupTag: string;
  minCommonSlots: number;
}

export interface LoadLimitRule extends BaseRule {
  type: 'loadLimit';
  workerGroup: string;
  maxSlotsPerPhase: number;
}

export interface PhaseWindowRule extends BaseRule {
  type: 'phaseWindow';
  taskId: string;
  allowedPhases: number[];
}

export interface PatternMatchRule extends BaseRule {
  type: 'patternMatch';
  regex: string;
  template: string;
  parameters: Record<string, any>;
}

export interface PrecedenceOverrideRule extends BaseRule {
  type: 'precedenceOverride';
  overrideType: string;
  targetRuleIds: string[];
  priority: number;
  conditions: Record<string, any>;
}

export type BusinessRule =
  | CoRunRule
  | SlotRestrictionRule
  | LoadLimitRule
  | PhaseWindowRule
  | PatternMatchRule
  | PrecedenceOverrideRule;

// Prioritization types
export interface PriorityWeights {
  fairness: number;
  priorityLevel: number;
  taskFulfillment: number;
  workerUtilization: number;
  constraints: number;
}

export type PriorityMethod = 'sliders' | 'ranking' | 'ahp' | 'presets';
export type PresetProfile =
  | 'maximizeFulfillment'
  | 'fairDistribution'
  | 'minimizeWorkload'
  | 'custom';

// Rule conflicts and validation
export interface RuleConflict {
  id: string;
  ruleIds: string[];
  type: 'circular' | 'contradictory' | 'overlapping';
  severity: 'error' | 'warning';
  message: string;
}

interface BackupData {
  version: string;
  timestamp: number;
  data: {
    rules: BusinessRule[];
    priorityWeights: PriorityWeights;
    priorityMethod: PriorityMethod;
    presetProfile: PresetProfile;
    lastSavedAt: Date | null;
  };
  checksum: string;
}

// Auto-save manager
class RulesAutoSaveManager {
  private debounceTimer: NodeJS.Timeout | null = null;
  private isClient = typeof window !== 'undefined';

  private generateChecksum(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  saveToBackup(
    data: BackupData['data'],
    onStatusChange: (status: AutoSaveStatus) => void
  ): void {
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
      console.error('Failed to save rules backup:', error);
      onStatusChange('error');
    }
  }

  loadFromBackup(): BackupData['data'] | null {
    if (!this.isClient) return null;

    try {
      const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (!stored) return null;

      const backup: BackupData = JSON.parse(stored);

      // Verify backup integrity
      if (backup.version !== BACKUP_VERSION) {
        console.warn('Rules backup version mismatch, ignoring');
        return null;
      }

      const expectedChecksum = this.generateChecksum(backup.data);
      if (backup.checksum !== expectedChecksum) {
        console.warn('Rules backup checksum mismatch, ignoring');
        return null;
      }

      return backup.data;
    } catch (error) {
      console.error('Failed to load rules backup:', error);
      return null;
    }
  }

  scheduleAutoSave(
    data: BackupData['data'],
    onStatusChange: (status: AutoSaveStatus) => void
  ): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.saveToBackup(data, onStatusChange);
    }, AUTO_SAVE_DEBOUNCE_MS);
  }
}

const autoSaveManager = new RulesAutoSaveManager();

// Default values
const defaultPriorityWeights: PriorityWeights = {
  fairness: 0.2,
  priorityLevel: 0.3,
  taskFulfillment: 0.25,
  workerUtilization: 0.15,
  constraints: 0.1,
};

// Rules store interface
interface RulesState {
  // Core rule data
  rules: BusinessRule[];

  // Prioritization system
  priorityWeights: PriorityWeights;
  priorityMethod: PriorityMethod;
  presetProfile: PresetProfile;

  // State management
  isModified: boolean;
  lastSavedAt: Date | null;
  autoSaveStatus: AutoSaveStatus;

  // Rule management actions
  addRule: (
    rule: Omit<BusinessRule, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;
  updateRule: (
    id: string,
    updates: Partial<Omit<BusinessRule, 'id' | 'createdAt'>>
  ) => void;
  deleteRule: (id: string) => void;
  toggleRuleActive: (id: string) => void;
  duplicateRule: (id: string) => string;

  // Prioritization actions
  setPriorityWeights: (weights: PriorityWeights) => void;
  setPriorityMethod: (method: PriorityMethod) => void;
  setPresetProfile: (profile: PresetProfile) => void;
  resetPriorityWeights: () => void;

  // Auto-save actions
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
  triggerAutoSave: () => void;
  loadFromBackup: () => boolean;

  // Computed getters
  getRulesByType: (type: BusinessRule['type']) => BusinessRule[];
  getActiveRules: () => BusinessRule[];
  getRuleConflicts: () => RuleConflict[];
  getRule: (id: string) => BusinessRule | undefined;

  // Validation
  validateRule: (rule: BusinessRule) => { isValid: boolean; errors: string[] };
  hasUnsavedChanges: () => boolean;

  // Rule preview
  previewRule: (
    rule: BusinessRule,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ) => RulePreview;

  // Export helpers
  exportRulesConfig: () => {
    rules: BusinessRule[];
    priorityWeights: PriorityWeights;
    priorityMethod: PriorityMethod;
    presetProfile: PresetProfile;
    exportedAt: Date;
  };
}

// Generate UUID v4
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Create the rules store
export const useRulesStore = create<RulesState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        rules: [],
        priorityWeights: defaultPriorityWeights,
        priorityMethod: 'sliders',
        presetProfile: 'custom',
        isModified: false,
        lastSavedAt: null,
        autoSaveStatus: 'idle',

        // Rule management actions
        addRule: ruleData => {
          const id = generateId();
          const now = new Date();
          const newRule = {
            ...ruleData,
            id,
            createdAt: now,
            updatedAt: now,
          } as BusinessRule;

          set(state => ({
            ...state,
            rules: [...state.rules, newRule],
            isModified: true,
            lastSavedAt: now,
          }));

          get().triggerAutoSave();
          return id;
        },

        updateRule: (id, updates) => {
          set(state => ({
            ...state,
            rules: state.rules.map(rule =>
              rule.id === id
                ? ({
                    ...rule,
                    ...updates,
                    updatedAt: new Date(),
                  } as BusinessRule)
                : rule
            ),
            isModified: true,
          }));

          get().triggerAutoSave();
        },

        deleteRule: id => {
          set(state => ({
            ...state,
            rules: state.rules.filter(rule => rule.id !== id),
            isModified: true,
          }));

          get().triggerAutoSave();
        },

        toggleRuleActive: id => {
          set(state => ({
            ...state,
            rules: state.rules.map(rule =>
              rule.id === id
                ? { ...rule, isActive: !rule.isActive, updatedAt: new Date() }
                : rule
            ),
            isModified: true,
          }));

          get().triggerAutoSave();
        },

        duplicateRule: id => {
          const rule = get().getRule(id);
          if (!rule) return '';

          const newId = generateId();
          const now = new Date();
          const duplicatedRule: BusinessRule = {
            ...rule,
            id: newId,
            name: `${rule.name} (Copy)`,
            createdAt: now,
            updatedAt: now,
          };

          set(state => ({
            ...state,
            rules: [...state.rules, duplicatedRule],
            isModified: true,
          }));

          get().triggerAutoSave();
          return newId;
        },

        // Prioritization actions
        setPriorityWeights: weights => {
          set({
            priorityWeights: weights,
            isModified: true,
            presetProfile: 'custom',
          });
          get().triggerAutoSave();
        },

        setPriorityMethod: method => {
          set({ priorityMethod: method, isModified: true });
          get().triggerAutoSave();
        },

        setPresetProfile: profile => {
          let weights = defaultPriorityWeights;

          switch (profile) {
            case 'maximizeFulfillment':
              weights = {
                fairness: 0.1,
                priorityLevel: 0.4,
                taskFulfillment: 0.4,
                workerUtilization: 0.05,
                constraints: 0.05,
              };
              break;
            case 'fairDistribution':
              weights = {
                fairness: 0.5,
                priorityLevel: 0.15,
                taskFulfillment: 0.15,
                workerUtilization: 0.15,
                constraints: 0.05,
              };
              break;
            case 'minimizeWorkload':
              weights = {
                fairness: 0.2,
                priorityLevel: 0.1,
                taskFulfillment: 0.2,
                workerUtilization: 0.4,
                constraints: 0.1,
              };
              break;
          }

          set({
            presetProfile: profile,
            priorityWeights: weights,
            isModified: true,
          });

          get().triggerAutoSave();
        },

        resetPriorityWeights: () => {
          set({
            priorityWeights: defaultPriorityWeights,
            presetProfile: 'custom',
            isModified: true,
          });

          get().triggerAutoSave();
        },

        // Auto-save actions
        setAutoSaveStatus: status => set({ autoSaveStatus: status }),

        triggerAutoSave: () => {
          const state = get();
          const data = {
            rules: state.rules,
            priorityWeights: state.priorityWeights,
            priorityMethod: state.priorityMethod,
            presetProfile: state.presetProfile,
            lastSavedAt: new Date(),
          };

          autoSaveManager.scheduleAutoSave(data, get().setAutoSaveStatus);
        },

        loadFromBackup: () => {
          const backup = autoSaveManager.loadFromBackup();
          if (backup) {
            // Restore Date objects that may have been serialized as strings
            const restoredRules = backup.rules.map(rule => ({
              ...rule,
              createdAt: rule.createdAt instanceof Date ? rule.createdAt : new Date(rule.createdAt),
              updatedAt: rule.updatedAt instanceof Date ? rule.updatedAt : new Date(rule.updatedAt),
            }));

            set({
              rules: restoredRules,
              priorityWeights: backup.priorityWeights,
              priorityMethod: backup.priorityMethod,
              presetProfile: backup.presetProfile,
              lastSavedAt: backup.lastSavedAt instanceof Date ? backup.lastSavedAt : (backup.lastSavedAt ? new Date(backup.lastSavedAt) : null),
              isModified: false,
              autoSaveStatus: 'saved',
            });
            return true;
          }
          return false;
        },

        // Computed getters
        getRulesByType: type => {
          return get().rules.filter(rule => rule.type === type);
        },

        getActiveRules: () => {
          return get().rules.filter(rule => rule.isActive);
        },

        getRule: id => {
          return get().rules.find(rule => rule.id === id);
        },

        getRuleConflicts: () => {
          const rules = get().getActiveRules();
          const conflicts: RuleConflict[] = [];

          // Check for Co-run circular dependencies
          const coRunRules = rules.filter(
            rule => rule.type === 'coRun'
          ) as CoRunRule[];
          const taskConnections = new Map<string, Set<string>>();

          coRunRules.forEach(rule => {
            rule.taskIds.forEach(taskId => {
              if (!taskConnections.has(taskId)) {
                taskConnections.set(taskId, new Set());
              }
              rule.taskIds.forEach(otherTaskId => {
                if (taskId !== otherTaskId) {
                  taskConnections.get(taskId)!.add(otherTaskId);
                }
              });
            });
          });

          // Detect circular dependencies (simplified)
          taskConnections.forEach((connections, taskId) => {
            connections.forEach(connectedTaskId => {
              const reverseConnections = taskConnections.get(connectedTaskId);
              if (reverseConnections?.has(taskId)) {
                const conflictingRules = coRunRules.filter(
                  rule =>
                    rule.taskIds.includes(taskId) &&
                    rule.taskIds.includes(connectedTaskId)
                );

                if (conflictingRules.length > 0) {
                  conflicts.push({
                    id: generateId(),
                    ruleIds: conflictingRules.map(rule => rule.id),
                    type: 'circular',
                    severity: 'error',
                    message: `Circular co-run dependency detected between tasks ${taskId} and ${connectedTaskId}`,
                  });
                }
              }
            });
          });

          // Check for contradictory Load-limit rules
          const loadLimitRules = rules.filter(
            rule => rule.type === 'loadLimit'
          ) as LoadLimitRule[];
          const workerGroupLimits = new Map<string, LoadLimitRule[]>();

          loadLimitRules.forEach(rule => {
            if (!workerGroupLimits.has(rule.workerGroup)) {
              workerGroupLimits.set(rule.workerGroup, []);
            }
            workerGroupLimits.get(rule.workerGroup)!.push(rule);
          });

          workerGroupLimits.forEach((rules, workerGroup) => {
            if (rules.length > 1) {
              const limits = rules.map(rule => rule.maxSlotsPerPhase);
              const hasConflict = new Set(limits).size > 1;

              if (hasConflict) {
                conflicts.push({
                  id: generateId(),
                  ruleIds: rules.map(rule => rule.id),
                  type: 'contradictory',
                  severity: 'warning',
                  message: `Multiple different load limits for worker group ${workerGroup}`,
                });
              }
            }
          });

          return conflicts;
        },

        validateRule: rule => {
          const errors: string[] = [];

          // Basic validation
          if (!rule.name?.trim()) {
            errors.push('Rule name is required');
          }

          // Type-specific validation
          switch (rule.type) {
            case 'coRun':
              if (rule.taskIds.length < 2) {
                errors.push('Co-run rule must include at least 2 tasks');
              }
              break;
            case 'slotRestriction':
              if (rule.minCommonSlots < 1) {
                errors.push('Minimum common slots must be at least 1');
              }
              break;
            case 'loadLimit':
              if (rule.maxSlotsPerPhase < 1) {
                errors.push('Maximum slots per phase must be at least 1');
              }
              break;
            case 'phaseWindow':
              if (rule.allowedPhases.length === 0) {
                errors.push(
                  'Phase window must specify at least one allowed phase'
                );
              }
              break;
            case 'patternMatch':
              try {
                new RegExp(rule.regex);
              } catch {
                errors.push('Invalid regular expression');
              }
              break;
            case 'precedenceOverride':
              if (rule.priority < 1 || rule.priority > 10) {
                errors.push('Priority must be between 1 and 10');
              }
              if (!rule.overrideType) {
                errors.push('Override type is required');
              }
              if (!rule.targetRuleIds || rule.targetRuleIds.length === 0) {
                errors.push('At least one target rule must be specified');
              }
              break;
          }

          return {
            isValid: errors.length === 0,
            errors,
          };
        },

        hasUnsavedChanges: () => {
          return get().isModified;
        },

        previewRule: (rule, data) => {
          const state = get();
          return createRulePreview(
            rule,
            data.clients,
            data.workers,
            data.tasks,
            state.rules
          );
        },

        exportRulesConfig: () => {
          const state = get();
          return {
            rules: state.getActiveRules(),
            priorityWeights: state.priorityWeights,
            priorityMethod: state.priorityMethod,
            presetProfile: state.presetProfile,
            exportedAt: new Date(),
          };
        },
      }),
      {
        name: 'data-alchemist-rules-store',
        version: 1,
        onRehydrateStorage: () => (state) => {
          if (state?.rules) {
            // Restore Date objects that may have been serialized as strings
            state.rules = state.rules.map(rule => ({
              ...rule,
              createdAt: rule.createdAt instanceof Date ? rule.createdAt : new Date(rule.createdAt),
              updatedAt: rule.updatedAt instanceof Date ? rule.updatedAt : new Date(rule.updatedAt),
            }));
          }
          if (state?.lastSavedAt && !(state.lastSavedAt instanceof Date)) {
            state.lastSavedAt = new Date(state.lastSavedAt);
          }
        },
      }
    ),
    {
      name: 'rules-store',
    }
  )
);
