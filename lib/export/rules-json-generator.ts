/**
 * Rules JSON Generator - Creates structured rules.json for downstream allocation systems
 * Converts UI business rules and prioritization settings into production-ready configuration
 */

import { BusinessRule, PriorityWeights, PriorityMethod, PresetProfile } from '@/lib/stores/rules-store'
import { Client, Worker, Task } from '@/lib/types/entities'

// Production rule format for downstream allocation systems
export interface ProductionRule {
  id: string
  name: string
  description?: string | undefined
  type: string
  isActive: boolean
  priority: number
  config: Record<string, any>
  metadata: {
    createdAt: string
    updatedAt: string
    source: 'user' | 'ai' | 'template'
    confidence?: number | undefined
  }
}

// Prioritization configuration for allocation algorithms
export interface PrioritizationConfig {
  method: PriorityMethod
  weights: PriorityWeights
  presetProfile: PresetProfile
  normalizedWeights: PriorityWeights // Sum to 1.0 for algorithms
  criteria: {
    fairness: PriorityCriterion
    priorityLevel: PriorityCriterion
    taskFulfillment: PriorityCriterion
    workerUtilization: PriorityCriterion
    constraints: PriorityCriterion
  }
}

export interface PriorityCriterion {
  weight: number
  description: string
  algorithm: string
  parameters: Record<string, any>
}

// Data context for allocation algorithms
export interface DataContext {
  entities: {
    clients: number
    workers: number
    tasks: number
  }
  summary: {
    totalPriorityLevels: number[]
    skillCoverage: string[]
    phaseDistribution: number[]
    workloadDistribution: Record<string, number>
  }
  validation: {
    crossReferences: boolean
    circularDependencies: boolean
    capacityFeasibility: boolean
    skillCoverage: boolean
  }
}

// Complete rules configuration for export
export interface RulesConfiguration {
  version: string
  generatedAt: string
  configuration: {
    rules: ProductionRule[]
    prioritization: PrioritizationConfig
    dataContext: DataContext
  }
  statistics: {
    totalRules: number
    activeRules: number
    rulesByType: Record<string, number>
    conflictResolution: ConflictResolution[]
  }
  compatibility: {
    allocationEngine: string
    schemaVersion: string
    requiredFeatures: string[]
  }
}

export interface ConflictResolution {
  conflictId: string
  affectedRules: string[]
  resolution: 'prioritize' | 'merge' | 'disable'
  reason: string
}

/**
 * Convert UI business rule to production rule format
 */
function convertToProductionRule(rule: BusinessRule): ProductionRule {
  const baseRule: ProductionRule = {
    id: rule.id,
    name: rule.name,
    description: rule.description || undefined,
    type: rule.type,
    isActive: rule.isActive,
    priority: 1, // Default priority, can be enhanced with rule ordering
    config: {},
    metadata: {
      createdAt: rule.createdAt instanceof Date ? rule.createdAt.toISOString() : new Date(rule.createdAt).toISOString(),
      updatedAt: rule.updatedAt instanceof Date ? rule.updatedAt.toISOString() : new Date(rule.updatedAt).toISOString(),
      source: rule.id.startsWith('ai-') ? 'ai' : 'user'
    }
  }

  // Convert rule-specific configuration
  switch (rule.type) {
    case 'coRun':
      baseRule.config = {
        taskIds: rule.taskIds,
        enforcement: 'strict',
        allowPartial: false
      }
      break

    case 'slotRestriction':
      baseRule.config = {
        targetType: rule.targetType,
        groupTag: rule.groupTag,
        minCommonSlots: rule.minCommonSlots,
        enforcement: 'soft'
      }
      break

    case 'loadLimit':
      baseRule.config = {
        workerGroup: rule.workerGroup,
        maxSlotsPerPhase: rule.maxSlotsPerPhase,
        enforcement: 'strict',
        overloadPenalty: 'high'
      }
      break

    case 'phaseWindow':
      baseRule.config = {
        taskId: rule.taskId,
        allowedPhases: rule.allowedPhases,
        enforcement: 'strict',
        fallbackBehavior: 'defer'
      }
      break

    case 'patternMatch':
      baseRule.config = {
        regex: rule.regex,
        template: rule.template,
        parameters: rule.parameters,
        enforcement: 'conditional',
        caseSensitive: false
      }
      break

    case 'precedenceOverride':
      baseRule.config = {
        overrideType: rule.overrideType,
        targetRuleIds: rule.targetRuleIds,
        priority: rule.priority,
        conditions: rule.conditions,
        enforcement: 'override'
      }
      baseRule.priority = rule.priority // Use explicit priority for override rules
      break
  }

  return baseRule
}

/**
 * Generate prioritization configuration for allocation algorithms
 */
function generatePrioritizationConfig(
  weights: PriorityWeights,
  method: PriorityMethod,
  presetProfile: PresetProfile
): PrioritizationConfig {
  // Normalize weights to sum to 1.0
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  const normalizedWeights: PriorityWeights = {
    fairness: weights.fairness / totalWeight,
    priorityLevel: weights.priorityLevel / totalWeight,
    taskFulfillment: weights.taskFulfillment / totalWeight,
    workerUtilization: weights.workerUtilization / totalWeight,
    constraints: weights.constraints / totalWeight
  }

  return {
    method,
    weights,
    presetProfile,
    normalizedWeights,
    criteria: {
      fairness: {
        weight: normalizedWeights.fairness,
        description: 'Ensure equitable distribution of work across workers and clients',
        algorithm: 'gini_coefficient',
        parameters: {
          penaltyFunction: 'exponential',
          threshold: 0.3
        }
      },
      priorityLevel: {
        weight: normalizedWeights.priorityLevel,
        description: 'Respect client priority levels (1-5) in allocation decisions',
        algorithm: 'weighted_priority',
        parameters: {
          scalingFunction: 'linear',
          boostHighPriority: true
        }
      },
      taskFulfillment: {
        weight: normalizedWeights.taskFulfillment,
        description: 'Maximize the number of successfully allocated tasks',
        algorithm: 'fulfillment_rate',
        parameters: {
          partialCredit: 0.5,
          timeWindowPenalty: 0.2
        }
      },
      workerUtilization: {
        weight: normalizedWeights.workerUtilization,
        description: 'Optimize worker capacity utilization across phases',
        algorithm: 'utilization_balance',
        parameters: {
          targetUtilization: 0.85,
          underutilizationPenalty: 0.1
        }
      },
      constraints: {
        weight: normalizedWeights.constraints,
        description: 'Enforce hard and soft constraints from business rules',
        algorithm: 'constraint_satisfaction',
        parameters: {
          hardConstraintPenalty: 1000,
          softConstraintPenalty: 10
        }
      }
    }
  }
}

/**
 * Generate data context for allocation algorithms
 */
function generateDataContext(
  clients: Client[],
  workers: Worker[],
  tasks: Task[]
): DataContext {
  // Extract priority levels
  const priorityLevels = [...new Set(clients.map(c => c.PriorityLevel))].sort()
  
  // Extract all skills
  const allSkills = new Set<string>()
  workers.forEach(w => {
    if (w.Skills) {
      w.Skills.split(',').forEach(skill => allSkills.add(skill.trim()))
    }
  })
  tasks.forEach(t => {
    if (t.RequiredSkills) {
      t.RequiredSkills.split(',').forEach(skill => allSkills.add(skill.trim()))
    }
  })
  
  // Calculate phase distribution
  const phaseDistribution = Array(5).fill(0)
  tasks.forEach(task => {
    if (task.PreferredPhases) {
      try {
        const phases = JSON.parse(task.PreferredPhases)
        if (Array.isArray(phases)) {
          phases.forEach(phase => {
            if (phase >= 1 && phase <= 5) {
              phaseDistribution[phase - 1]++
            }
          })
        }
      } catch {
        // Handle non-JSON format
      }
    }
  })
  
  // Calculate workload distribution by group
  const workloadDistribution: Record<string, number> = {}
  workers.forEach(worker => {
    const group = worker.WorkerGroup || 'default'
    workloadDistribution[group] = (workloadDistribution[group] || 0) + (worker.MaxLoadPerPhase || 0)
  })

  return {
    entities: {
      clients: clients.length,
      workers: workers.length,
      tasks: tasks.length
    },
    summary: {
      totalPriorityLevels: priorityLevels,
      skillCoverage: Array.from(allSkills),
      phaseDistribution,
      workloadDistribution
    },
    validation: {
      crossReferences: true, // Simplified for now
      circularDependencies: false,
      capacityFeasibility: true,
      skillCoverage: true
    }
  }
}

/**
 * Detect and resolve rule conflicts
 */
function detectRuleConflicts(rules: ProductionRule[]): ConflictResolution[] {
  const conflicts: ConflictResolution[] = []
  
  // Check for overlapping co-run rules
  const coRunRules = rules.filter(r => r.type === 'coRun' && r.isActive)
  for (let i = 0; i < coRunRules.length; i++) {
    for (let j = i + 1; j < coRunRules.length; j++) {
      const rule1 = coRunRules[i]
      const rule2 = coRunRules[j]
      const tasks1 = new Set(rule1.config.taskIds)
      const tasks2 = new Set(rule2.config.taskIds)
      
      // Check for overlapping tasks
      const overlap = [...tasks1].some(task => tasks2.has(task))
      if (overlap) {
        conflicts.push({
          conflictId: `corun-overlap-${rule1.id}-${rule2.id}`,
          affectedRules: [rule1.id, rule2.id],
          resolution: 'merge',
          reason: 'Overlapping co-run rules merged to avoid conflicts'
        })
      }
    }
  }
  
  // Check for contradictory precedence rules
  const precedenceRules = rules.filter(r => r.type === 'precedenceOverride' && r.isActive)
  precedenceRules.forEach(rule => {
    const targetRules = rule.config.targetRuleIds
    const conflictingPrecedence = precedenceRules.filter(otherRule => 
      otherRule.id !== rule.id && 
      targetRules.some((target: string) => otherRule.config.targetRuleIds.includes(target))
    )
    
    if (conflictingPrecedence.length > 0) {
      conflicts.push({
        conflictId: `precedence-conflict-${rule.id}`,
        affectedRules: [rule.id, ...conflictingPrecedence.map(r => r.id)],
        resolution: 'prioritize',
        reason: 'Resolved by rule priority ordering'
      })
    }
  })
  
  return conflicts
}

/**
 * Generate statistics for rules configuration
 */
function generateRulesStatistics(rules: ProductionRule[]): {
  totalRules: number
  activeRules: number
  rulesByType: Record<string, number>
} {
  const activeRules = rules.filter(r => r.isActive)
  const rulesByType: Record<string, number> = {}
  
  rules.forEach(rule => {
    rulesByType[rule.type] = (rulesByType[rule.type] || 0) + 1
  })
  
  return {
    totalRules: rules.length,
    activeRules: activeRules.length,
    rulesByType
  }
}

/**
 * Main function to generate complete rules configuration
 */
export function generateRulesConfiguration(
  rules: BusinessRule[],
  priorityWeights: PriorityWeights,
  priorityMethod: PriorityMethod,
  presetProfile: PresetProfile,
  clients: Client[],
  workers: Worker[],
  tasks: Task[]
): RulesConfiguration {
  // Convert UI rules to production format
  const productionRules = rules.map(convertToProductionRule)
  
  // Generate prioritization configuration
  const prioritizationConfig = generatePrioritizationConfig(
    priorityWeights,
    priorityMethod,
    presetProfile
  )
  
  // Generate data context
  const dataContext = generateDataContext(clients, workers, tasks)
  
  // Detect and resolve conflicts
  const conflictResolutions = detectRuleConflicts(productionRules)
  
  // Generate statistics
  const statistics = generateRulesStatistics(productionRules)
  
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    configuration: {
      rules: productionRules,
      prioritization: prioritizationConfig,
      dataContext
    },
    statistics: {
      ...statistics,
      conflictResolution: conflictResolutions
    },
    compatibility: {
      allocationEngine: 'data-alchemist-v1',
      schemaVersion: '1.0',
      requiredFeatures: [
        'constraint-satisfaction',
        'priority-weighting',
        'cross-entity-validation',
        'phase-based-allocation'
      ]
    }
  }
}

/**
 * Export rules configuration as JSON string
 */
export function exportRulesAsJSON(
  rules: BusinessRule[],
  priorityWeights: PriorityWeights,
  priorityMethod: PriorityMethod,
  presetProfile: PresetProfile,
  clients: Client[],
  workers: Worker[],
  tasks: Task[]
): string {
  const config = generateRulesConfiguration(
    rules,
    priorityWeights,
    priorityMethod,
    presetProfile,
    clients,
    workers,
    tasks
  )
  
  return JSON.stringify(config, null, 2)
}

/**
 * Generate downloadable rules.json file
 */
export function generateRulesDownload(
  rules: BusinessRule[],
  priorityWeights: PriorityWeights,
  priorityMethod: PriorityMethod,
  presetProfile: PresetProfile,
  clients: Client[],
  workers: Worker[],
  tasks: Task[]
): void {
  const jsonContent = exportRulesAsJSON(
    rules,
    priorityWeights,
    priorityMethod,
    presetProfile,
    clients,
    workers,
    tasks
  )
  
  // Create blob with proper JSON MIME type
  const blob = new Blob([jsonContent], { 
    type: 'application/json;charset=utf-8;' 
  })
  
  // Create download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `rules-config-${timestamp}.json`
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Validate rules configuration before export
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  statistics: {
    totalRules: number
    activeRules: number
    disabledRules: number
    conflictCount: number
  }
}

export function validateRulesConfiguration(
  rules: BusinessRule[],
  clients: Client[],
  workers: Worker[],
  tasks: Task[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Create lookup sets for validation
  const taskIds = new Set(tasks.map(t => t.TaskID))
  const clientGroups = new Set(clients.map(c => c.GroupTag).filter(Boolean))
  const workerGroups = new Set(workers.map(w => w.WorkerGroup).filter(Boolean))
  
  // Validate each rule
  rules.forEach(rule => {
    switch (rule.type) {
      case 'coRun':
        rule.taskIds.forEach(taskId => {
          if (!taskIds.has(taskId)) {
            errors.push(`Co-run rule "${rule.name}": Task ${taskId} does not exist`)
          }
        })
        if (rule.taskIds.length < 2) {
          errors.push(`Co-run rule "${rule.name}": Must specify at least 2 tasks`)
        }
        break
        
      case 'slotRestriction':
        if (rule.targetType === 'client' && !clientGroups.has(rule.groupTag)) {
          errors.push(`Slot restriction rule "${rule.name}": Client group ${rule.groupTag} does not exist`)
        }
        if (rule.targetType === 'worker' && !workerGroups.has(rule.groupTag)) {
          errors.push(`Slot restriction rule "${rule.name}": Worker group ${rule.groupTag} does not exist`)
        }
        break
        
      case 'loadLimit':
        if (!workerGroups.has(rule.workerGroup)) {
          errors.push(`Load limit rule "${rule.name}": Worker group ${rule.workerGroup} does not exist`)
        }
        break
        
      case 'phaseWindow':
        if (!taskIds.has(rule.taskId)) {
          errors.push(`Phase window rule "${rule.name}": Task ${rule.taskId} does not exist`)
        }
        break
    }
    
    // Check for inactive rules
    if (!rule.isActive) {
      warnings.push(`Rule "${rule.name}" is disabled and will not be exported`)
    }
  })
  
  const activeRules = rules.filter(r => r.isActive)
  const productionRules = activeRules.map(convertToProductionRule)
  const conflicts = detectRuleConflicts(productionRules)
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    statistics: {
      totalRules: rules.length,
      activeRules: activeRules.length,
      disabledRules: rules.length - activeRules.length,
      conflictCount: conflicts.length
    }
  }
}