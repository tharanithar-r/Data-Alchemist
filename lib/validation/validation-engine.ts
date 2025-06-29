import { z } from 'zod'

import {
  Client,
  ClientSchema,
  Task,
  TaskSchema,
  ValidationError,
  ValidationResult,
  ValidationSummary,
  Worker,
  WorkerSchema,
} from '@/lib/types/entities'

export class ValidationEngine {
  private static generateErrorId(entityType: string, ruleType: string, index?: number): string {
    return `${entityType}-${ruleType}-${index ?? Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  static async validateAll(
    clients: Client[],
    workers: Worker[],
    tasks: Task[]
  ): Promise<ValidationSummary> {
    const clientResult = await this.validateClients(clients)
    const workerResult = await this.validateWorkers(workers)
    const taskResult = await this.validateTasks(tasks)
    const crossEntityResult = await this.validateCrossEntity(clients, workers, tasks)

    return {
      clients: clientResult,
      workers: workerResult,
      tasks: taskResult,
      crossEntity: crossEntityResult,
      totalErrors: [clientResult, workerResult, taskResult, crossEntityResult]
        .reduce((total, result) => total + result.errors.length, 0),
      totalWarnings: [clientResult, workerResult, taskResult, crossEntityResult]
        .reduce((total, result) => total + result.warnings.length, 0),
    }
  }

  static async validateClients(clients: Client[]): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Schema validation
    clients.forEach((client, index) => {
      try {
        ClientSchema.parse(client)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              id: this.generateErrorId('client', 'schema', index),
              level: 'error',
              message: `${err.path.join('.')}: ${err.message}`,
              field: err.path.join('.'),
              rowIndex: index,
              entityType: 'client',
              ruleType: 'schema',
            })
          })
        }
      }
    })

    // Business rule validation
    this.validateClientDuplicates(clients, errors)
    this.validateClientPriorities(clients, warnings)
    this.validateClientTaskReferences(clients, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static async validateWorkers(workers: Worker[]): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Schema validation
    workers.forEach((worker, index) => {
      try {
        WorkerSchema.parse(worker)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              id: this.generateErrorId('worker', 'schema', index),
              level: 'error',
              message: `${err.path.join('.')}: ${err.message}`,
              field: err.path.join('.'),
              rowIndex: index,
              entityType: 'worker',
              ruleType: 'schema',
            })
          })
        }
      }
    })

    // Business rule validation
    this.validateWorkerDuplicates(workers, errors)
    this.validateWorkerCapacity(workers, warnings)
    this.validateWorkerSkills(workers, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static async validateTasks(tasks: Task[]): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Schema validation
    tasks.forEach((task, index) => {
      try {
        TaskSchema.parse(task)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              id: this.generateErrorId('task', 'schema', index),
              level: 'error',
              message: `${err.path.join('.')}: ${err.message}`,
              field: err.path.join('.'),
              rowIndex: index,
              entityType: 'task',
              ruleType: 'schema',
            })
          })
        }
      }
    })

    // Business rule validation
    this.validateTaskDuplicates(tasks, errors)
    this.validateTaskDuration(tasks, warnings)
    this.validateTaskConcurrency(tasks, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  static async validateCrossEntity(
    clients: Client[],
    workers: Worker[],
    tasks: Task[]
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Reference integrity
    this.validateTaskReferences(clients, tasks, errors)
    this.validateSkillCoverage(workers, tasks, warnings)
    this.validateCapacityPlanning(clients, workers, tasks, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // Client-specific validation rules
  private static validateClientDuplicates(clients: Client[], errors: ValidationError[]) {
    const seen = new Set<string>()
    clients.forEach((client, index) => {
      if (seen.has(client.ClientID)) {
        errors.push({
          id: this.generateErrorId('client', 'duplicate-id', index),
          level: 'error',
          message: `Duplicate client ID: ${client.ClientID}`,
          field: 'ClientID',
          rowIndex: index,
          entityType: 'client',
          ruleType: 'duplicate-detection',
        })
      }
      seen.add(client.ClientID)
    })
  }

  private static validateClientPriorities(clients: Client[], warnings: ValidationError[]) {
    const priorityCounts = new Map<number, number>()
    
    clients.forEach(client => {
      const count = priorityCounts.get(client.PriorityLevel) || 0
      priorityCounts.set(client.PriorityLevel, count + 1)
    })

    // Warn if too many high-priority clients
    const highPriorityCount = (priorityCounts.get(4) || 0) + (priorityCounts.get(5) || 0)
    if (highPriorityCount > clients.length * 0.3) {
      warnings.push({
        id: this.generateErrorId('client', 'priority-distribution'),
        level: 'warning',
        message: `High priority clients (${highPriorityCount}) exceed 30% of total clients. Consider redistributing priorities.`,
        entityType: 'client',
        ruleType: 'priority-distribution',
      })
    }
  }

  private static validateClientTaskReferences(clients: Client[], warnings: ValidationError[]) {
    clients.forEach((client, index) => {
      if (client.RequestedTaskIDs) {
        const taskIds = client.RequestedTaskIDs.split(',').map(id => id.trim())
        if (taskIds.length > 10) {
          warnings.push({
            id: this.generateErrorId('client', 'excessive-tasks', index),
            level: 'warning',
            message: `Client ${client.ClientID} requests ${taskIds.length} tasks. Consider splitting into multiple clients.`,
            field: 'RequestedTaskIDs',
            rowIndex: index,
            entityType: 'client',
            ruleType: 'task-count-limit',
          })
        }
      }
    })
  }

  // Worker-specific validation rules
  private static validateWorkerDuplicates(workers: Worker[], errors: ValidationError[]) {
    const seen = new Set<string>()
    workers.forEach((worker, index) => {
      if (seen.has(worker.WorkerID)) {
        errors.push({
          id: this.generateErrorId('worker', 'duplicate-id', index),
          level: 'error',
          message: `Duplicate worker ID: ${worker.WorkerID}`,
          field: 'WorkerID',
          rowIndex: index,
          entityType: 'worker',
          ruleType: 'duplicate-detection',
        })
      }
      seen.add(worker.WorkerID)
    })
  }

  private static validateWorkerCapacity(workers: Worker[], warnings: ValidationError[]) {
    workers.forEach((worker, index) => {
      if (worker.AvailableSlots === 0) {
        warnings.push({
          id: this.generateErrorId('worker', 'zero-capacity', index),
          level: 'warning',
          message: `Worker ${worker.WorkerID} has 0 available slots`,
          field: 'AvailableSlots',
          rowIndex: index,
          entityType: 'worker',
          ruleType: 'capacity-check',
        })
      }

      const availableSlots = typeof worker.AvailableSlots === 'number' 
        ? worker.AvailableSlots 
        : Array.isArray(worker.AvailableSlots) 
          ? worker.AvailableSlots.length 
          : 0
      
      if (worker.MaxLoadPerPhase > availableSlots * 2) {
        warnings.push({
          id: this.generateErrorId('worker', 'excessive-load', index),
          level: 'warning',
          message: `Worker ${worker.WorkerID} max load per phase (${worker.MaxLoadPerPhase}) is very high compared to available slots (${availableSlots})`,
          field: 'MaxLoadPerPhase',
          rowIndex: index,
          entityType: 'worker',
          ruleType: 'load-balance-check',
        })
      }
    })
  }

  private static validateWorkerSkills(workers: Worker[], warnings: ValidationError[]) {
    workers.forEach((worker, index) => {
      const skills = worker.Skills.split(',').map(s => s.trim()).filter(s => s.length > 0)
      
      if (skills.length === 0) {
        warnings.push({
          id: this.generateErrorId('worker', 'no-skills', index),
          level: 'warning',
          message: `Worker ${worker.WorkerID} has no skills defined`,
          field: 'Skills',
          rowIndex: index,
          entityType: 'worker',
          ruleType: 'skill-validation',
        })
      }

      if (skills.length > 15) {
        warnings.push({
          id: this.generateErrorId('worker', 'too-many-skills', index),
          level: 'warning',
          message: `Worker ${worker.WorkerID} has ${skills.length} skills. Consider consolidating similar skills.`,
          field: 'Skills',
          rowIndex: index,
          entityType: 'worker',
          ruleType: 'skill-validation',
        })
      }
    })
  }

  // Task-specific validation rules
  private static validateTaskDuplicates(tasks: Task[], errors: ValidationError[]) {
    const seen = new Set<string>()
    tasks.forEach((task, index) => {
      if (seen.has(task.TaskID)) {
        errors.push({
          id: this.generateErrorId('task', 'duplicate-id', index),
          level: 'error',
          message: `Duplicate task ID: ${task.TaskID}`,
          field: 'TaskID',
          rowIndex: index,
          entityType: 'task',
          ruleType: 'duplicate-detection',
        })
      }
      seen.add(task.TaskID)
    })
  }

  private static validateTaskDuration(tasks: Task[], warnings: ValidationError[]) {
    tasks.forEach((task, index) => {
      if (task.Duration > 40) {
        warnings.push({
          id: this.generateErrorId('task', 'long-duration', index),
          level: 'warning',
          message: `Task ${task.TaskID} has duration of ${task.Duration} hours. Consider breaking into smaller tasks.`,
          field: 'Duration',
          rowIndex: index,
          entityType: 'task',
          ruleType: 'duration-check',
        })
      }

      if (task.Duration === 0) {
        warnings.push({
          id: this.generateErrorId('task', 'zero-duration', index),
          level: 'warning',
          message: `Task ${task.TaskID} has 0 duration`,
          field: 'Duration',
          rowIndex: index,
          entityType: 'task',
          ruleType: 'duration-check',
        })
      }
    })
  }

  private static validateTaskConcurrency(tasks: Task[], warnings: ValidationError[]) {
    tasks.forEach((task, index) => {
      if (task.MaxConcurrent > 10) {
        warnings.push({
          id: this.generateErrorId('task', 'high-concurrency', index),
          level: 'warning',
          message: `Task ${task.TaskID} allows ${task.MaxConcurrent} concurrent instances. Verify this is intentional.`,
          field: 'MaxConcurrent',
          rowIndex: index,
          entityType: 'task',
          ruleType: 'concurrency-check',
        })
      }
    })
  }

  // Cross-entity validation rules
  private static validateTaskReferences(clients: Client[], tasks: Task[], errors: ValidationError[]) {
    const taskIds = new Set(tasks.map(t => t.TaskID))
    
    clients.forEach((client, index) => {
      if (client.RequestedTaskIDs) {
        const requestedIds = client.RequestedTaskIDs.split(',').map(id => id.trim())
        
        requestedIds.forEach(taskId => {
          if (taskId && !taskIds.has(taskId)) {
            errors.push({
              id: this.generateErrorId('client', 'invalid-task-ref', index),
              level: 'error',
              message: `Client ${client.ClientID} references non-existent task: ${taskId}`,
              field: 'RequestedTaskIDs',
              rowIndex: index,
              entityType: 'client',
              ruleType: 'reference-integrity',
            })
          }
        })
      }
    })
  }

  private static validateSkillCoverage(workers: Worker[], tasks: Task[], warnings: ValidationError[]) {
    const allWorkerSkills = new Set(
      workers.flatMap(worker =>
        worker.Skills.split(',').map(skill => skill.trim().toLowerCase())
      ).filter(skill => skill.length > 0)
    )

    const uncoveredSkills = new Set<string>()
    
    tasks.forEach((task) => {
      const requiredSkills = task.RequiredSkills.split(',')
        .map(skill => skill.trim().toLowerCase())
        .filter(skill => skill.length > 0)
      
      requiredSkills.forEach(skill => {
        if (!allWorkerSkills.has(skill)) {
          uncoveredSkills.add(skill)
        }
      })
    })

    if (uncoveredSkills.size > 0) {
      warnings.push({
        id: this.generateErrorId('cross-entity', 'skill-coverage'),
        level: 'warning',
        message: `These required skills are not covered by any worker: ${Array.from(uncoveredSkills).join(', ')}`,
        entityType: 'worker',
        ruleType: 'skill-coverage',
      })
    }
  }

  private static validateCapacityPlanning(
    clients: Client[],
    workers: Worker[],
    tasks: Task[],
    warnings: ValidationError[]
  ) {
    const totalWorkerSlots = workers.reduce((sum, worker) => {
      const slots = typeof worker.AvailableSlots === 'number' 
        ? worker.AvailableSlots 
        : Array.isArray(worker.AvailableSlots) 
          ? worker.AvailableSlots.length 
          : 0
      return sum + slots
    }, 0)
    const totalTaskDemand = tasks.reduce((sum, task) => sum + task.Duration, 0)
    
    if (totalTaskDemand > totalWorkerSlots * 8) { // Assuming 8-hour work days
      warnings.push({
        id: this.generateErrorId('cross-entity', 'capacity-shortage'),
        level: 'warning',
        message: `Total task demand (${totalTaskDemand} hours) may exceed worker capacity (${totalWorkerSlots} slots). Consider adding more workers or reducing task scope.`,
        entityType: 'worker',
        ruleType: 'capacity-planning',
      })
    }

    // Check for high priority clients vs worker capacity
    const highPriorityClients = clients.filter(c => c.PriorityLevel >= 4).length
    const seniorWorkers = workers.filter(w => 
      w.QualificationLevel === 'Senior' || w.QualificationLevel === 'Expert'
    ).length

    if (highPriorityClients > seniorWorkers) {
      warnings.push({
        id: this.generateErrorId('cross-entity', 'priority-capacity-mismatch'),
        level: 'warning',
        message: `${highPriorityClients} high-priority clients but only ${seniorWorkers} senior/expert workers. Consider adjusting priorities or worker qualifications.`,
        entityType: 'client',
        ruleType: 'priority-capacity-match',
      })
    }
  }
}