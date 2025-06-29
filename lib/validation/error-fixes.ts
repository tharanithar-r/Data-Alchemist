/**
 * Error Resolution System - Implements automatic fixes for validation errors
 */

import { Client, Worker, Task, ValidationError } from '@/lib/types/entities';

export interface FixResult {
  success: boolean;
  message: string;
  fixedCount: number;
  skippedCount: number;
  details?: string[];
}

export interface FixSuggestion {
  id: string;
  description: string;
  action: string;
  confidence: 'high' | 'medium' | 'low';
  preview?: string;
  canAutoFix: boolean;
}

export class ErrorFixEngine {
  /**
   * Get fix suggestions for a specific error
   */
  static getFixSuggestions(error: ValidationError, allData: {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  }): FixSuggestion[] {
    switch (error.ruleType) {
      case 'duplicate-id':
        return this.getDuplicateIdFixes(error, allData);
      case 'invalid-format':
        return this.getFormatFixes(error);
      case 'reference-integrity':
        return this.getReferenceFixes(error, allData);
      case 'skill-coverage':
        return this.getSkillCoverageFixes(error, allData);
      case 'capacity-planning':
        return this.getCapacityFixes(error, allData);
      case 'priority-distribution':
        return this.getPriorityFixes(error, allData);
      default:
        return this.getGenericFixes(error);
    }
  }

  /**
   * Apply automatic fix for an error
   */
  static async applyFix(
    error: ValidationError,
    fixId: string,
    allData: {
      clients: Client[];
      workers: Worker[];
      tasks: Task[];
    }
  ): Promise<{
    success: boolean;
    newData: { clients: Client[]; workers: Worker[]; tasks: Task[] };
    message: string;
  }> {
    const newData = {
      clients: [...allData.clients],
      workers: [...allData.workers],
      tasks: [...allData.tasks],
    };

    try {
      switch (error.ruleType) {
        case 'duplicate-id':
          return await this.fixDuplicateId(error, fixId, newData);
        case 'invalid-format':
          return await this.fixInvalidFormat(error, fixId, newData);
        case 'reference-integrity':
          return await this.fixInvalidReference(error, fixId, newData);
        case 'skill-coverage':
          return await this.fixSkillCoverage(error, fixId, newData);
        default:
          return {
            success: false,
            newData: allData,
            message: `No auto-fix available for ${error.ruleType}`,
          };
      }
    } catch (err) {
      return {
        success: false,
        newData: allData,
        message: `Fix failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Apply bulk fixes for multiple errors
   */
  static async applyBulkFix(
    errors: ValidationError[],
    allData: {
      clients: Client[];
      workers: Worker[];
      tasks: Task[];
    }
  ): Promise<FixResult & { newData?: { clients: Client[]; workers: Worker[]; tasks: Task[] } }> {
    let fixedCount = 0;
    let skippedCount = 0;
    const details: string[] = [];
    let currentData = {
      clients: [...allData.clients],
      workers: [...allData.workers],
      tasks: [...allData.tasks],
    };

    for (const error of errors) {
      const suggestions = this.getFixSuggestions(error, currentData);
      const autoFixable = suggestions.find(s => s.canAutoFix && s.confidence === 'high');

      if (autoFixable) {
        const result = await this.applyFix(error, autoFixable.id, currentData);
        if (result.success) {
          currentData = result.newData;
          fixedCount++;
          details.push(`✅ Fixed: ${error.message}`);
        } else {
          skippedCount++;
          details.push(`❌ Skipped: ${error.message} - ${result.message}`);
        }
      } else {
        skippedCount++;
        details.push(`⚠️ Manual fix required: ${error.message}`);
      }
    }

    return {
      success: fixedCount > 0,
      message: `Fixed ${fixedCount} errors, ${skippedCount} require manual attention`,
      fixedCount,
      skippedCount,
      details,
      newData: currentData,
    };
  }

  // ========== SPECIFIC FIX IMPLEMENTATIONS ==========

  private static getDuplicateIdFixes(
    error: ValidationError,
    _allData: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Auto-generate new unique ID
    suggestions.push({
      id: 'generate-new-id',
      description: 'Generate a new unique ID',
      action: 'Replace duplicate ID with auto-generated unique ID',
      confidence: 'high',
      preview: `New ID: ${error.entityType.toUpperCase()}-${Date.now()}`,
      canAutoFix: true,
    });

    // Add suffix to existing ID
    suggestions.push({
      id: 'add-suffix',
      description: 'Add suffix to make ID unique',
      action: 'Append a number suffix to the duplicate ID',
      confidence: 'medium',
      preview: 'Example: CLIENT-001 → CLIENT-001-2',
      canAutoFix: true,
    });

    return suggestions;
  }

  private static getFormatFixes(error: ValidationError): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (error.field?.includes('JSON')) {
      suggestions.push({
        id: 'fix-json',
        description: 'Fix JSON format',
        action: 'Convert invalid JSON to valid format or empty object',
        confidence: 'high',
        preview: 'Convert to: {}',
        canAutoFix: true,
      });
    }

    if (error.field?.includes('Priority')) {
      suggestions.push({
        id: 'fix-priority',
        description: 'Fix priority level',
        action: 'Set priority to valid range (1-5)',
        confidence: 'high',
        preview: 'Set to: 3 (Medium priority)',
        canAutoFix: true,
      });
    }

    return suggestions;
  }

  private static getReferenceFixes(
    error: ValidationError,
    _allData: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Remove invalid reference
    suggestions.push({
      id: 'remove-invalid-ref',
      description: 'Remove invalid reference',
      action: 'Remove the non-existent task ID from the list',
      confidence: 'high',
      preview: 'Remove invalid task reference',
      canAutoFix: true,
    });

    // Create missing task (if applicable)
    if (error.field === 'RequestedTaskIDs') {
      suggestions.push({
        id: 'create-missing-task',
        description: 'Create missing task',
        action: 'Create a placeholder task with the referenced ID',
        confidence: 'medium',
        preview: 'Create new task with basic properties',
        canAutoFix: false, // Requires user input for task details
      });
    }

    return suggestions;
  }

  private static getSkillCoverageFixes(
    error: ValidationError,
    _allData: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Extract missing skills from error message
    const match = error.message.match(/These required skills are not covered by any worker: (.+)/);
    if (match) {
      const missingSkills = match[1].split(', ');

      suggestions.push({
        id: 'add-skills-to-workers',
        description: 'Add missing skills to existing workers',
        action: 'Add the required skills to workers with similar qualifications',
        confidence: 'medium',
        preview: `Add skills: ${missingSkills.join(', ')} to qualified workers`,
        canAutoFix: false, // Requires decision on which workers
      });

      suggestions.push({
        id: 'create-skilled-worker',
        description: 'Create new worker with required skills',
        action: 'Create a new worker that has all the missing skills',
        confidence: 'low',
        preview: 'Create new worker with missing skills',
        canAutoFix: false, // Requires user input
      });
    }

    return suggestions;
  }

  private static getCapacityFixes(
    _error: ValidationError,
    _allData: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: 'increase-worker-capacity',
      description: 'Increase worker capacity',
      action: 'Increase MaxLoadPerPhase or AvailableSlots for workers',
      confidence: 'medium',
      preview: 'Increase capacity by 20% across all workers',
      canAutoFix: false, // Requires business decision
    });

    suggestions.push({
      id: 'reduce-task-duration',
      description: 'Optimize task durations',
      action: 'Reduce duration of non-critical tasks',
      confidence: 'low',
      preview: 'Reduce task durations by 10%',
      canAutoFix: false, // Requires business decision
    });

    return suggestions;
  }

  private static getPriorityFixes(
    _error: ValidationError,
    _allData: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: 'rebalance-priorities',
      description: 'Rebalance client priorities',
      action: 'Automatically distribute priorities more evenly',
      confidence: 'medium',
      preview: 'Redistribute to: 20% high, 60% medium, 20% low priority',
      canAutoFix: true,
    });

    return suggestions;
  }

  private static getGenericFixes(_error: ValidationError): FixSuggestion[] {
    return [
      {
        id: 'manual-review',
        description: 'Manual review required',
        action: 'This error requires manual attention and business context',
        confidence: 'low',
        preview: 'Review and fix manually',
        canAutoFix: false,
      },
    ];
  }

  // ========== FIX IMPLEMENTATIONS ==========

  private static async fixDuplicateId(
    error: ValidationError,
    fixId: string,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): Promise<{
    success: boolean;
    newData: { clients: Client[]; workers: Worker[]; tasks: Task[] };
    message: string;
  }> {
    if (error.rowIndex === undefined) {
      return {
        success: false,
        newData: data,
        message: 'Cannot fix: row index not available',
      };
    }

    let newId: string;
    const timestamp = Date.now();

    switch (fixId) {
      case 'generate-new-id':
        newId = `${error.entityType.toUpperCase()}-${timestamp}`;
        break;
      case 'add-suffix':
        const currentId = this.getCurrentId(error, data);
        newId = `${currentId}-${Math.floor(Math.random() * 1000)}`;
        break;
      default:
        return {
          success: false,
          newData: data,
          message: 'Unknown fix type',
        };
    }

    // Apply the fix
    const newData = { ...data };
    switch (error.entityType) {
      case 'client':
        newData.clients[error.rowIndex] = {
          ...newData.clients[error.rowIndex],
          ClientID: newId,
        };
        break;
      case 'worker':
        newData.workers[error.rowIndex] = {
          ...newData.workers[error.rowIndex],
          WorkerID: newId,
        };
        break;
      case 'task':
        newData.tasks[error.rowIndex] = {
          ...newData.tasks[error.rowIndex],
          TaskID: newId,
        };
        break;
    }

    return {
      success: true,
      newData,
      message: `Fixed duplicate ID: changed to ${newId}`,
    };
  }

  private static async fixInvalidFormat(
    error: ValidationError,
    fixId: string,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): Promise<{
    success: boolean;
    newData: { clients: Client[]; workers: Worker[]; tasks: Task[] };
    message: string;
  }> {
    if (error.rowIndex === undefined || !error.field) {
      return {
        success: false,
        newData: data,
        message: 'Cannot fix: insufficient error information',
      };
    }

    const newData = { ...data };
    let fixedValue: any;
    let message: string;

    switch (fixId) {
      case 'fix-json':
        fixedValue = '{}';
        message = 'Fixed invalid JSON format';
        break;
      case 'fix-priority':
        fixedValue = 3;
        message = 'Set priority to default value (3)';
        break;
      default:
        return {
          success: false,
          newData: data,
          message: 'Unknown fix type',
        };
    }

    // Apply the fix based on entity type
    switch (error.entityType) {
      case 'client':
        newData.clients[error.rowIndex] = {
          ...newData.clients[error.rowIndex],
          [error.field]: fixedValue,
        };
        break;
      case 'worker':
        newData.workers[error.rowIndex] = {
          ...newData.workers[error.rowIndex],
          [error.field]: fixedValue,
        };
        break;
      case 'task':
        newData.tasks[error.rowIndex] = {
          ...newData.tasks[error.rowIndex],
          [error.field]: fixedValue,
        };
        break;
    }

    return {
      success: true,
      newData,
      message,
    };
  }

  private static async fixInvalidReference(
    error: ValidationError,
    fixId: string,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): Promise<{
    success: boolean;
    newData: { clients: Client[]; workers: Worker[]; tasks: Task[] };
    message: string;
  }> {
    if (error.rowIndex === undefined || error.entityType !== 'client') {
      return {
        success: false,
        newData: data,
        message: 'Cannot fix: only client task references supported',
      };
    }

    const newData = { ...data };
    const client = newData.clients[error.rowIndex];
    
    if (fixId === 'remove-invalid-ref') {
      // Extract the invalid task ID from the error message
      const match = error.message.match(/references non-existent task: (.+)/);
      if (match) {
        const invalidTaskId = match[1];
        const currentTaskIds = client.RequestedTaskIDs?.split(',').map(id => id.trim()) || [];
        const validTaskIds = currentTaskIds.filter(id => id !== invalidTaskId);
        
        newData.clients[error.rowIndex] = {
          ...client,
          RequestedTaskIDs: validTaskIds.join(','),
        };

        return {
          success: true,
          newData,
          message: `Removed invalid task reference: ${invalidTaskId}`,
        };
      }
    }

    return {
      success: false,
      newData: data,
      message: 'Could not identify invalid reference to remove',
    };
  }

  private static async fixSkillCoverage(
    _error: ValidationError,
    _fixId: string,
    data: { clients: Client[]; workers: Worker[]; tasks: Task[] }
  ): Promise<{
    success: boolean;
    newData: { clients: Client[]; workers: Worker[]; tasks: Task[] };
    message: string;
  }> {
    // Skill coverage fixes typically require manual intervention
    // as they involve business decisions about worker assignments
    return {
      success: false,
      newData: data,
      message: 'Skill coverage fixes require manual intervention',
    };
  }

  private static getCurrentId(error: ValidationError, data: { clients: Client[]; workers: Worker[]; tasks: Task[] }): string {
    if (error.rowIndex === undefined) return '';
    
    switch (error.entityType) {
      case 'client':
        return data.clients[error.rowIndex]?.ClientID || '';
      case 'worker':
        return data.workers[error.rowIndex]?.WorkerID || '';
      case 'task':
        return data.tasks[error.rowIndex]?.TaskID || '';
      default:
        return '';
    }
  }
}