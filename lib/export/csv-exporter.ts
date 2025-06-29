/**
 * CSV Export utilities for clean, production-ready data export
 * Applies full normalization and validation filtering for downstream allocation systems
 */

import { Client, Worker, Task } from '@/lib/types/entities'
import { ValidationResult } from '@/lib/types/entities'
import { 
  normalizeQualificationLevel,
  normalizePreferredPhases,
  normalizeAvailableSlots,
  normalizeAttributesJSON,
  normalizeSkills,
  validateTaskIDs
} from '@/lib/utils/data-normalizer'

export interface ExportOptions {
  includeInvalidRows?: boolean
  includeValidationMetadata?: boolean
  applyNormalization?: boolean
}

export interface ExportResult {
  success: boolean
  csvContent: string
  rowCount: number
  skippedRows: number
  warnings: string[]
  error?: string
}

/**
 * Normalize client data for production export
 */
function normalizeClientForExport(
  client: Client, 
  validTaskIDs: Set<string>,
  includeInvalid = false
): Client | null {
  // Validate RequestedTaskIDs and clean up invalid references
  const taskValidation = validateTaskIDs(client.RequestedTaskIDs || '', validTaskIDs)
  
  // Skip clients with no valid task requests if validation is strict
  if (!includeInvalid && taskValidation.valid.length === 0 && client.RequestedTaskIDs) {
    return null
  }

  return {
    ...client,
    // Use only valid task IDs for production export
    RequestedTaskIDs: taskValidation.valid.join(','),
    // Ensure valid JSON format
    AttributesJSON: normalizeAttributesJSON(client.AttributesJSON || ''),
    // Ensure valid priority level range
    PriorityLevel: Math.max(1, Math.min(5, client.PriorityLevel || 1))
  }
}

/**
 * Normalize worker data for production export
 */
function normalizeWorkerForExport(worker: Worker): Worker {
  // Normalize available slots to consistent JSON array format
  const slots = normalizeAvailableSlots(worker.AvailableSlots)
  
  // Normalize skills for consistency
  const normalizedSkills = normalizeSkills(worker.Skills || '')
  
  return {
    ...worker,
    // Convert to production-ready string format
    QualificationLevel: typeof worker.QualificationLevel === 'number' 
      ? normalizeQualificationLevel(worker.QualificationLevel)
      : worker.QualificationLevel,
    // Standardize skills format
    Skills: normalizedSkills.join(','),
    // Ensure JSON array format for available slots
    AvailableSlots: JSON.stringify(slots),
    // Ensure positive load limit
    MaxLoadPerPhase: Math.max(0, worker.MaxLoadPerPhase || 0)
  }
}

/**
 * Normalize task data for production export
 */
function normalizeTaskForExport(task: Task): Task {
  // Normalize preferred phases to consistent array format
  const phases = normalizePreferredPhases(task.PreferredPhases || '')
  
  // Normalize required skills
  const normalizedSkills = normalizeSkills(task.RequiredSkills || '')
  
  return {
    ...task,
    // Standardize skills format
    RequiredSkills: normalizedSkills.join(','),
    // Convert to consistent JSON array format
    PreferredPhases: JSON.stringify(phases),
    // Ensure positive duration
    Duration: Math.max(1, task.Duration || 1),
    // Ensure positive concurrency
    MaxConcurrent: Math.max(1, task.MaxConcurrent || 1)
  }
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  headers: (keyof T)[]
): string {
  // Create header row
  const headerRow = headers.map(header => `"${String(header)}"`).join(',')
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      // Handle null/undefined values
      if (value === null || value === undefined) return '""'
      
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""')
      return `"${stringValue}"`
    }).join(',')
  })
  
  return [headerRow, ...dataRows].join('\n')
}

/**
 * Export clients to clean CSV format
 */
export function exportClientsToCSV(
  clients: Client[],
  validTaskIDs: Set<string>,
  validationResults?: ValidationResult[],
  options: ExportOptions = {}
): ExportResult {
  try {
    const { 
      includeInvalidRows = false, 
      applyNormalization = true 
    } = options

    const warnings: string[] = []
    let skippedRows = 0
    
    // Filter out invalid clients if strict validation is enabled
    const validClients = clients.filter((_, index) => {
      if (!includeInvalidRows && validationResults) {
        const validation = validationResults[index]
        if (validation && !validation.isValid) {
          skippedRows++
          return false
        }
      }
      return true
    })

    // Apply normalization for production export
    const normalizedClients = validClients
      .map(client => applyNormalization 
        ? normalizeClientForExport(client, validTaskIDs, includeInvalidRows)
        : client
      )
      .filter(client => client !== null) as Client[]

    // Track additional skipped rows from normalization
    skippedRows += validClients.length - normalizedClients.length

    // Generate CSV headers in proper order
    const headers: (keyof Client)[] = [
      'ClientID',
      'ClientName', 
      'PriorityLevel',
      'RequestedTaskIDs',
      'GroupTag',
      'AttributesJSON'
    ]

    const csvContent = arrayToCSV(normalizedClients, headers)

    if (skippedRows > 0) {
      warnings.push(`${skippedRows} client rows were skipped due to validation issues`)
    }

    return {
      success: true,
      csvContent,
      rowCount: normalizedClients.length,
      skippedRows,
      warnings
    }

  } catch (error) {
    return {
      success: false,
      csvContent: '',
      rowCount: 0,
      skippedRows: 0,
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown export error'
    }
  }
}

/**
 * Export workers to clean CSV format
 */
export function exportWorkersToCSV(
  workers: Worker[],
  validationResults?: ValidationResult[],
  options: ExportOptions = {}
): ExportResult {
  try {
    const { 
      includeInvalidRows = false, 
      applyNormalization = true 
    } = options

    const warnings: string[] = []
    let skippedRows = 0
    
    // Filter out invalid workers if strict validation is enabled
    const validWorkers = workers.filter((_, index) => {
      if (!includeInvalidRows && validationResults) {
        const validation = validationResults[index]
        if (validation && !validation.isValid) {
          skippedRows++
          return false
        }
      }
      return true
    })

    // Apply normalization for production export
    const normalizedWorkers = validWorkers.map(worker => 
      applyNormalization ? normalizeWorkerForExport(worker) : worker
    )

    // Generate CSV headers in proper order
    const headers: (keyof Worker)[] = [
      'WorkerID',
      'WorkerName',
      'Skills',
      'AvailableSlots',
      'MaxLoadPerPhase',
      'WorkerGroup',
      'QualificationLevel'
    ]

    const csvContent = arrayToCSV(normalizedWorkers, headers)

    if (skippedRows > 0) {
      warnings.push(`${skippedRows} worker rows were skipped due to validation issues`)
    }

    return {
      success: true,
      csvContent,
      rowCount: normalizedWorkers.length,
      skippedRows,
      warnings
    }

  } catch (error) {
    return {
      success: false,
      csvContent: '',
      rowCount: 0,
      skippedRows: 0,
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown export error'
    }
  }
}

/**
 * Export tasks to clean CSV format
 */
export function exportTasksToCSV(
  tasks: Task[],
  validationResults?: ValidationResult[],
  options: ExportOptions = {}
): ExportResult {
  try {
    const { 
      includeInvalidRows = false, 
      applyNormalization = true 
    } = options

    const warnings: string[] = []
    let skippedRows = 0
    
    // Filter out invalid tasks if strict validation is enabled
    const validTasks = tasks.filter((_, index) => {
      if (!includeInvalidRows && validationResults) {
        const validation = validationResults[index]
        if (validation && !validation.isValid) {
          skippedRows++
          return false
        }
      }
      return true
    })

    // Apply normalization for production export
    const normalizedTasks = validTasks.map(task => 
      applyNormalization ? normalizeTaskForExport(task) : task
    )

    // Generate CSV headers in proper order
    const headers: (keyof Task)[] = [
      'TaskID',
      'TaskName',
      'Category',
      'Duration',
      'RequiredSkills',
      'PreferredPhases',
      'MaxConcurrent'
    ]

    const csvContent = arrayToCSV(normalizedTasks, headers)

    if (skippedRows > 0) {
      warnings.push(`${skippedRows} task rows were skipped due to validation issues`)
    }

    return {
      success: true,
      csvContent,
      rowCount: normalizedTasks.length,
      skippedRows,
      warnings
    }

  } catch (error) {
    return {
      success: false,
      csvContent: '',
      rowCount: 0,
      skippedRows: 0,
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown export error'
    }
  }
}

/**
 * Export all entities to separate CSV files
 */
export function exportAllEntitiesToCSV(
  clients: Client[],
  workers: Worker[],
  tasks: Task[],
  validationSummary?: {
    clients: ValidationResult,
    workers: ValidationResult,
    tasks: ValidationResult
  },
  options: ExportOptions = {}
): {
  clients: ExportResult,
  workers: ExportResult,
  tasks: ExportResult,
  summary: {
    totalRows: number,
    totalSkipped: number,
    allWarnings: string[]
  }
} {
  // Create set of valid task IDs for cross-reference validation
  const validTaskIDs = new Set(tasks.map(task => task.TaskID))

  // Export each entity type
  const clientsResult = exportClientsToCSV(
    clients, 
    validTaskIDs,
    validationSummary?.clients ? [validationSummary.clients] : undefined,
    options
  )

  const workersResult = exportWorkersToCSV(
    workers,
    validationSummary?.workers ? [validationSummary.workers] : undefined,
    options
  )

  const tasksResult = exportTasksToCSV(
    tasks,
    validationSummary?.tasks ? [validationSummary.tasks] : undefined,
    options
  )

  // Generate summary
  const totalRows = clientsResult.rowCount + workersResult.rowCount + tasksResult.rowCount
  const totalSkipped = clientsResult.skippedRows + workersResult.skippedRows + tasksResult.skippedRows
  const allWarnings = [
    ...clientsResult.warnings,
    ...workersResult.warnings,
    ...tasksResult.warnings
  ]

  return {
    clients: clientsResult,
    workers: workersResult,
    tasks: tasksResult,
    summary: {
      totalRows,
      totalSkipped,
      allWarnings
    }
  }
}

/**
 * Generate downloadable CSV file
 */
export function generateCSVDownload(csvContent: string, filename: string): void {
  // Create blob with proper CSV MIME type
  const blob = new Blob([csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  })
  
  // Create download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
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