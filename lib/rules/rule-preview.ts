import { 
  BusinessRule, 
  CoRunRule, 
  SlotRestrictionRule, 
  LoadLimitRule, 
  PhaseWindowRule, 
  PatternMatchRule, 
  PrecedenceOverrideRule,
  RuleConflict 
} from '@/lib/stores/rules-store';
import { Client, Worker, Task } from '@/lib/types/entities';

// Preview result interfaces
export interface RulePreview {
  ruleId: string;
  ruleName: string;
  ruleType: BusinessRule['type'];
  isValid: boolean;
  errors: string[];
  warnings: string[];
  impact: RuleImpact;
  affectedEntities: AffectedEntities;
  conflicts: RuleConflict[];
  previewData: PreviewData;
}

export interface RuleImpact {
  severity: 'low' | 'medium' | 'high';
  description: string;
  quantifiedEffect: string;
  recommendations: string[];
}

export interface AffectedEntities {
  clients: string[];
  workers: string[];
  tasks: string[];
  totalAffected: number;
}

export interface PreviewData {
  beforeState: EntityState;
  afterState: EntityState;
  changes: ChangeDescription[];
}

export interface EntityState {
  taskGroupings?: { [groupId: string]: string[] };
  workerCapacities?: { [workerId: string]: number };
  phaseRestrictions?: { [taskId: string]: number[] };
  allocations?: { [entityId: string]: any };
}

export interface ChangeDescription {
  type: 'grouping' | 'capacity' | 'restriction' | 'allocation';
  entityId: string;
  entityType: 'client' | 'worker' | 'task';
  before: string;
  after: string;
  description: string;
}

// Main Rule Preview Engine
export class RulePreviewEngine {
  private clients: Client[];
  private workers: Worker[];
  private tasks: Task[];
  private existingRules: BusinessRule[];

  constructor(
    clients: Client[],
    workers: Worker[],
    tasks: Task[],
    existingRules: BusinessRule[] = []
  ) {
    this.clients = clients;
    this.workers = workers;
    this.tasks = tasks;
    this.existingRules = existingRules;
  }

  /**
   * Generate comprehensive preview for a rule
   */
  generatePreview(rule: BusinessRule): RulePreview {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts: RuleConflict[] = [];

    // Basic rule validation
    const validation = this.validateRule(rule);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);

    // Check for conflicts with existing rules
    const ruleConflicts = this.detectConflicts(rule);
    conflicts.push(...ruleConflicts);

    // Generate type-specific preview
    const impact = this.calculateImpact(rule);
    const affectedEntities = this.getAffectedEntities(rule);
    const previewData = this.generatePreviewData(rule);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      isValid: errors.length === 0,
      errors,
      warnings,
      impact,
      affectedEntities,
      conflicts,
      previewData,
    };
  }

  /**
   * Validate rule against current data
   */
  private validateRule(rule: BusinessRule): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (rule.type) {
      case 'coRun':
        return this.validateCoRunRule(rule);
      case 'slotRestriction':
        return this.validateSlotRestrictionRule(rule);
      case 'loadLimit':
        return this.validateLoadLimitRule(rule);
      case 'phaseWindow':
        return this.validatePhaseWindowRule(rule);
      case 'patternMatch':
        return this.validatePatternMatchRule(rule);
      case 'precedenceOverride':
        return this.validatePrecedenceOverrideRule(rule);
      default:
        errors.push('Unknown rule type');
    }

    return { errors, warnings };
  }

  /**
   * Co-run rule validation
   */
  private validateCoRunRule(rule: CoRunRule): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if all tasks exist
    const validTaskIds = new Set(this.tasks.map(t => t.TaskID));
    const invalidTasks = rule.taskIds.filter(id => !validTaskIds.has(id));
    
    if (invalidTasks.length > 0) {
      errors.push(`Invalid task IDs: ${invalidTasks.join(', ')}`);
    }

    // Check for skill compatibility
    const validTasks = rule.taskIds.filter(id => validTaskIds.has(id));
    const tasksData = this.tasks.filter(t => validTasks.includes(t.TaskID));
    
    if (tasksData.length > 1) {
      const allRequiredSkills = new Set<string>();
      tasksData.forEach(task => {
        const skills = task.RequiredSkills?.split(',').map(s => s.trim()) || [];
        skills.forEach(skill => allRequiredSkills.add(skill));
      });

      // Check if there are workers who can handle all skills
      const capableWorkers = this.workers.filter(worker => {
        const workerSkills = worker.Skills?.split(',').map(s => s.trim().toLowerCase()) || [];
        return Array.from(allRequiredSkills).every(skill => 
          workerSkills.some(ws => ws.includes(skill.toLowerCase()))
        );
      });

      if (capableWorkers.length === 0) {
        warnings.push('No workers have all required skills for co-run tasks');
      } else if (capableWorkers.length < 3) {
        warnings.push(`Only ${capableWorkers.length} worker(s) can handle all co-run tasks`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Slot restriction rule validation
   */
  private validateSlotRestrictionRule(rule: SlotRestrictionRule): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rule.targetType === 'worker') {
      const affectedWorkers = this.workers.filter(w => w.WorkerGroup === rule.groupTag);
      if (affectedWorkers.length === 0) {
        errors.push(`No workers found in group: ${rule.groupTag}`);
      } else {
        // Check if workers have enough common slots
        const commonSlots = this.findCommonSlots(affectedWorkers);
        if (commonSlots.length < rule.minCommonSlots) {
          warnings.push(`Workers in ${rule.groupTag} only have ${commonSlots.length} common slots, but rule requires ${rule.minCommonSlots}`);
        }
      }
    } else {
      const affectedClients = this.clients.filter(c => c.GroupTag === rule.groupTag);
      if (affectedClients.length === 0) {
        errors.push(`No clients found in group: ${rule.groupTag}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Load limit rule validation
   */
  private validateLoadLimitRule(rule: LoadLimitRule): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const affectedWorkers = this.workers.filter(w => w.WorkerGroup === rule.workerGroup);
    if (affectedWorkers.length === 0) {
      errors.push(`No workers found in group: ${rule.workerGroup}`);
    } else {
      // Check if any workers currently exceed the limit
      const overloadedWorkers = affectedWorkers.filter(w => 
        w.MaxLoadPerPhase && w.MaxLoadPerPhase > rule.maxSlotsPerPhase
      );
      
      if (overloadedWorkers.length > 0) {
        warnings.push(`${overloadedWorkers.length} worker(s) currently exceed the new limit of ${rule.maxSlotsPerPhase}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Phase window rule validation
   */
  private validatePhaseWindowRule(rule: PhaseWindowRule): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const task = this.tasks.find(t => t.TaskID === rule.taskId);
    if (!task) {
      errors.push(`Task not found: ${rule.taskId}`);
    } else {
      // Check if preferred phases conflict with allowed phases
      if (task.PreferredPhases) {
        const preferredPhases = this.parsePhases(task.PreferredPhases);
        const conflictingPhases = preferredPhases.filter(p => !rule.allowedPhases.includes(p));
        
        if (conflictingPhases.length > 0) {
          warnings.push(`Task's preferred phases [${preferredPhases.join(',')}] conflict with allowed phases [${rule.allowedPhases.join(',')}]`);
        }
      }

      // Check if task duration fits in allowed phases
      const taskDuration = task.Duration || 1;
      if (taskDuration > rule.allowedPhases.length) {
        errors.push(`Task duration (${taskDuration}) exceeds number of allowed phases (${rule.allowedPhases.length})`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Pattern match rule validation
   */
  private validatePatternMatchRule(rule: PatternMatchRule): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      new RegExp(rule.regex);
    } catch {
      errors.push('Invalid regular expression pattern');
    }

    // Test pattern against entity names
    if (errors.length === 0) {
      const regex = new RegExp(rule.regex);
      const matchingTasks = this.tasks.filter(t => regex.test(t.TaskName || ''));
      const matchingWorkers = this.workers.filter(w => regex.test(w.WorkerName || ''));
      const matchingClients = this.clients.filter(c => regex.test(c.ClientName || ''));
      
      const totalMatches = matchingTasks.length + matchingWorkers.length + matchingClients.length;
      if (totalMatches === 0) {
        warnings.push('Pattern does not match any entity names');
      } else if (totalMatches > 20) {
        warnings.push(`Pattern matches many entities (${totalMatches}), consider making it more specific`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Precedence override rule validation
   */
  private validatePrecedenceOverrideRule(rule: PrecedenceOverrideRule): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for conflicts with other precedence rules
    const otherPrecedenceRules = this.existingRules.filter(r => 
      r.type === 'precedenceOverride' && r.id !== rule.id
    ) as PrecedenceOverrideRule[];

    const samePriorityRules = otherPrecedenceRules.filter(r => r.priority === rule.priority);
    if (samePriorityRules.length > 0) {
      warnings.push(`${samePriorityRules.length} other rule(s) have the same priority level`);
    }

    return { errors, warnings };
  }

  /**
   * Detect conflicts with existing rules
   */
  private detectConflicts(newRule: BusinessRule): RuleConflict[] {
    const conflicts: RuleConflict[] = [];

    this.existingRules.forEach(existingRule => {
      const conflict = this.checkRuleConflict(newRule, existingRule);
      if (conflict) {
        conflicts.push(conflict);
      }
    });

    return conflicts;
  }

  /**
   * Check conflict between two rules
   */
  private checkRuleConflict(rule1: BusinessRule, rule2: BusinessRule): RuleConflict | null {
    // Co-run circular dependencies
    if (rule1.type === 'coRun' && rule2.type === 'coRun') {
      const rule1Tasks = new Set((rule1 as CoRunRule).taskIds);
      const rule2Tasks = new Set((rule2 as CoRunRule).taskIds);
      const overlap = Array.from(rule1Tasks).filter(t => rule2Tasks.has(t));
      
      if (overlap.length > 0) {
        return {
          id: `conflict-${rule1.id}-${rule2.id}`,
          ruleIds: [rule1.id, rule2.id],
          type: 'overlapping',
          severity: 'warning',
          message: `Co-run rules overlap on tasks: ${overlap.join(', ')}`,
        };
      }
    }

    // Load limit conflicts
    if (rule1.type === 'loadLimit' && rule2.type === 'loadLimit') {
      const limit1 = rule1 as LoadLimitRule;
      const limit2 = rule2 as LoadLimitRule;
      
      if (limit1.workerGroup === limit2.workerGroup && limit1.maxSlotsPerPhase !== limit2.maxSlotsPerPhase) {
        return {
          id: `conflict-${rule1.id}-${rule2.id}`,
          ruleIds: [rule1.id, rule2.id],
          type: 'contradictory',
          severity: 'error',
          message: `Conflicting load limits for group ${limit1.workerGroup}: ${limit1.maxSlotsPerPhase} vs ${limit2.maxSlotsPerPhase}`,
        };
      }
    }

    return null;
  }

  /**
   * Calculate rule impact
   */
  private calculateImpact(rule: BusinessRule): RuleImpact {
    const affectedEntities = this.getAffectedEntities(rule);
    const totalAffected = affectedEntities.totalAffected;

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (totalAffected > 20) severity = 'high';
    else if (totalAffected > 10) severity = 'medium';

    switch (rule.type) {
      case 'coRun':
        return {
          severity,
          description: `Groups ${(rule as CoRunRule).taskIds.length} tasks to run together`,
          quantifiedEffect: `${affectedEntities.tasks.length} tasks grouped, affecting ${affectedEntities.workers.length} potential workers`,
          recommendations: severity === 'high' ? ['Consider splitting into smaller co-run groups'] : [],
        };
        
      case 'loadLimit':
        const loadRule = rule as LoadLimitRule;
        return {
          severity,
          description: `Limits worker group ${loadRule.workerGroup} to ${loadRule.maxSlotsPerPhase} slots per phase`,
          quantifiedEffect: `${affectedEntities.workers.length} workers affected`,
          recommendations: severity === 'high' ? ['Monitor for potential capacity bottlenecks'] : [],
        };
        
      case 'phaseWindow':
        const phaseRule = rule as PhaseWindowRule;
        return {
          severity,
          description: `Restricts task ${phaseRule.taskId} to phases [${phaseRule.allowedPhases.join(',')}]`,
          quantifiedEffect: `1 task constrained to ${phaseRule.allowedPhases.length} phases`,
          recommendations: phaseRule.allowedPhases.length < 3 ? ['Ensure sufficient scheduling flexibility'] : [],
        };
        
      default:
        return {
          severity,
          description: 'Rule will modify allocation behavior',
          quantifiedEffect: `${totalAffected} entities potentially affected`,
          recommendations: [],
        };
    }
  }

  /**
   * Get affected entities for a rule
   */
  private getAffectedEntities(rule: BusinessRule): AffectedEntities {
    const affected: AffectedEntities = {
      clients: [],
      workers: [],
      tasks: [],
      totalAffected: 0,
    };

    switch (rule.type) {
      case 'coRun':
        const coRunRule = rule as CoRunRule;
        affected.tasks = coRunRule.taskIds.filter(id => 
          this.tasks.some(t => t.TaskID === id)
        );
        
        // Find workers who can perform these tasks
        const requiredSkills = new Set<string>();
        affected.tasks.forEach(taskId => {
          const task = this.tasks.find(t => t.TaskID === taskId);
          if (task?.RequiredSkills) {
            task.RequiredSkills.split(',').forEach(skill => 
              requiredSkills.add(skill.trim().toLowerCase())
            );
          }
        });
        
        affected.workers = this.workers
          .filter(worker => {
            const workerSkills = worker.Skills?.split(',').map(s => s.trim().toLowerCase()) || [];
            return Array.from(requiredSkills).some(skill => 
              workerSkills.some(ws => ws.includes(skill))
            );
          })
          .map(w => w.WorkerID);
        break;
        
      case 'slotRestriction':
        const slotRule = rule as SlotRestrictionRule;
        if (slotRule.targetType === 'worker') {
          affected.workers = this.workers
            .filter(w => w.WorkerGroup === slotRule.groupTag)
            .map(w => w.WorkerID);
        } else {
          affected.clients = this.clients
            .filter(c => c.GroupTag === slotRule.groupTag)
            .map(c => c.ClientID);
        }
        break;
        
      case 'loadLimit':
        const loadRule = rule as LoadLimitRule;
        affected.workers = this.workers
          .filter(w => w.WorkerGroup === loadRule.workerGroup)
          .map(w => w.WorkerID);
        break;
        
      case 'phaseWindow':
        const phaseRule = rule as PhaseWindowRule;
        affected.tasks = [phaseRule.taskId];
        break;
    }

    affected.totalAffected = affected.clients.length + affected.workers.length + affected.tasks.length;
    return affected;
  }

  /**
   * Generate before/after preview data
   */
  private generatePreviewData(rule: BusinessRule): PreviewData {
    const beforeState: EntityState = this.getCurrentState();
    const afterState: EntityState = this.simulateRuleApplication(rule, beforeState);
    const changes: ChangeDescription[] = this.calculateChanges(beforeState, afterState, rule);

    return {
      beforeState,
      afterState,
      changes,
    };
  }

  /**
   * Get current state of entities
   */
  private getCurrentState(): EntityState {
    return {
      taskGroupings: {},
      workerCapacities: this.workers.reduce((acc, worker) => {
        acc[worker.WorkerID] = worker.MaxLoadPerPhase || 0;
        return acc;
      }, {} as { [workerId: string]: number }),
      phaseRestrictions: {},
      allocations: {},
    };
  }

  /**
   * Simulate rule application
   */
  private simulateRuleApplication(rule: BusinessRule, currentState: EntityState): EntityState {
    const newState = { ...currentState };

    switch (rule.type) {
      case 'coRun':
        const coRunRule = rule as CoRunRule;
        newState.taskGroupings = {
          ...newState.taskGroupings,
          [rule.id]: coRunRule.taskIds,
        };
        break;
        
      case 'loadLimit':
        const loadRule = rule as LoadLimitRule;
        const affectedWorkers = this.workers.filter(w => w.WorkerGroup === loadRule.workerGroup);
        affectedWorkers.forEach(worker => {
          newState.workerCapacities![worker.WorkerID] = Math.min(
            newState.workerCapacities![worker.WorkerID] || 0,
            loadRule.maxSlotsPerPhase
          );
        });
        break;
        
      case 'phaseWindow':
        const phaseRule = rule as PhaseWindowRule;
        newState.phaseRestrictions = {
          ...newState.phaseRestrictions,
          [phaseRule.taskId]: phaseRule.allowedPhases,
        };
        break;
    }

    return newState;
  }

  /**
   * Calculate changes between states
   */
  private calculateChanges(
    beforeState: EntityState, 
    afterState: EntityState, 
    rule: BusinessRule
  ): ChangeDescription[] {
    const changes: ChangeDescription[] = [];

    // Task grouping changes
    if (rule.type === 'coRun') {
      const coRunRule = rule as CoRunRule;
      changes.push({
        type: 'grouping',
        entityId: rule.id,
        entityType: 'task',
        before: 'Tasks run independently',
        after: `Tasks ${coRunRule.taskIds.join(', ')} run together`,
        description: `Created co-run group with ${coRunRule.taskIds.length} tasks`,
      });
    }

    // Capacity changes
    Object.keys(afterState.workerCapacities || {}).forEach(workerId => {
      const before = beforeState.workerCapacities?.[workerId] || 0;
      const after = afterState.workerCapacities?.[workerId] || 0;
      
      if (before !== after) {
        changes.push({
          type: 'capacity',
          entityId: workerId,
          entityType: 'worker',
          before: `${before} slots per phase`,
          after: `${after} slots per phase`,
          description: `Worker capacity reduced by load limit rule`,
        });
      }
    });

    // Phase restriction changes
    Object.keys(afterState.phaseRestrictions || {}).forEach(taskId => {
      const after = afterState.phaseRestrictions?.[taskId] || [];
      changes.push({
        type: 'restriction',
        entityId: taskId,
        entityType: 'task',
        before: 'No phase restrictions',
        after: `Restricted to phases [${after.join(',')}]`,
        description: `Task scheduling restricted to specific phases`,
      });
    });

    return changes;
  }

  /**
   * Utility: Find common available slots among workers
   */
  private findCommonSlots(workers: Worker[]): number[] {
    if (workers.length === 0) return [];

    const allSlots = workers.map(worker => {
      try {
        const slots = worker.AvailableSlots;
        if (typeof slots === 'number') {
          return [slots];
        }
        return JSON.parse(slots || '[]') as number[];
      } catch {
        return [];
      }
    });

    if (allSlots.length === 0) return [];

    return allSlots[0].filter(slot => 
      allSlots.every(workerSlots => workerSlots.includes(slot))
    );
  }

  /**
   * Utility: Parse phase specification
   */
  private parsePhases(phaseSpec: string): number[] {
    try {
      // Try JSON array format first
      const parsed = JSON.parse(phaseSpec);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => typeof p === 'number');
      }
    } catch {
      // Try range format like "1-3" or "1 - 3"
      const rangeMatch = phaseSpec.match(/(\d+)\s*-\s*(\d+)/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }
    }

    return [];
  }
}

/**
 * Factory function to create rule preview
 */
export function createRulePreview(
  rule: BusinessRule,
  clients: Client[],
  workers: Worker[],
  tasks: Task[],
  existingRules: BusinessRule[] = []
): RulePreview {
  const engine = new RulePreviewEngine(clients, workers, tasks, existingRules);
  return engine.generatePreview(rule);
}

/**
 * Batch preview for multiple rules
 */
export function createBatchRulePreview(
  rules: BusinessRule[],
  clients: Client[],
  workers: Worker[],
  tasks: Task[]
): RulePreview[] {
  return rules.map((rule, index) => {
    const existingRules = rules.slice(0, index); // Rules processed before this one
    return createRulePreview(rule, clients, workers, tasks, existingRules);
  });
}