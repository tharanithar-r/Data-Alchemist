import { z } from 'zod'

// Priority levels for clients
export const PriorityLevels = [1, 2, 3, 4, 5] as const
export type PriorityLevel = typeof PriorityLevels[number]

// Qualification levels for workers (supports both numeric and string formats)
export const QualificationLevels = ['Junior', 'Mid', 'Senior', 'Expert'] as const
export const QualificationLevelNumbers = [1, 2, 3, 4, 5] as const
export type QualificationLevel = typeof QualificationLevels[number]
export type QualificationLevelNumber = typeof QualificationLevelNumbers[number]

// Task categories (expanded based on sample data analysis)
export const TaskCategories = [
  'Development',
  'Design', 
  'Testing',
  'Analysis',
  'Management',
  'Support',
  'ETL',
  'Analytics',
  'ML',
  'QA',
  'Research',
  'Infrastructure'
] as const
export type TaskCategory = typeof TaskCategories[number]

// Client entity schema
export const ClientSchema = z.object({
  ClientID: z.string().min(1, 'Client ID is required'),
  ClientName: z.string().min(1, 'Client name is required'),
  PriorityLevel: z.number().min(1).max(5),
  RequestedTaskIDs: z.string(), // Comma-separated task IDs
  GroupTag: z.string().optional(),
  AttributesJSON: z.string().optional(), // JSON string for additional attributes
})

export type Client = z.infer<typeof ClientSchema>

// Worker entity schema
export const WorkerSchema = z.object({
  WorkerID: z.string().min(1, 'Worker ID is required'),
  WorkerName: z.string().min(1, 'Worker name is required'),
  Skills: z.string(), // Comma-separated skills
  AvailableSlots: z.union([z.number().min(0), z.string()]), // Support both number and JSON array string
  MaxLoadPerPhase: z.number().min(0),
  WorkerGroup: z.string().optional(),
  QualificationLevel: z.union([
    z.enum(QualificationLevels),
    z.number().min(1).max(5) // Support numeric qualification levels from sample data
  ]),
})

export type Worker = z.infer<typeof WorkerSchema>

// Task entity schema
export const TaskSchema = z.object({
  TaskID: z.string().min(1, 'Task ID is required'),
  TaskName: z.string().min(1, 'Task name is required'),
  Category: z.enum(TaskCategories),
  Duration: z.number().min(0),
  RequiredSkills: z.string(), // Comma-separated required skills
  PreferredPhases: z.string().optional(), // Comma-separated phase numbers
  MaxConcurrent: z.number().min(1).default(1),
})

export type Task = z.infer<typeof TaskSchema>

// Validation error types
export type ValidationErrorLevel = 'error' | 'warning' | 'info'

export interface ValidationError {
  id: string
  level: ValidationErrorLevel
  message: string
  field?: string
  rowIndex?: number
  entityType: 'client' | 'worker' | 'task'
  ruleType: string
}

// Validation result for an entity
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

// Overall validation summary
export interface ValidationSummary {
  clients: ValidationResult
  workers: ValidationResult
  tasks: ValidationResult
  crossEntity: ValidationResult
  totalErrors: number
  totalWarnings: number
}

// File upload types
export interface FileUploadState {
  isUploading: boolean
  progress: number
  error?: string
  fileName?: string
}

// Data import result
export interface ImportResult {
  clients: Client[]
  workers: Worker[]
  tasks: Task[]
  errors: string[]
  warnings: string[]
  metadata?: {
    formatInfo?: any
    processingTime?: number
    totalErrors?: number
    totalWarnings?: number
    [key: string]: any
  }
}

// Rule types for business logic
export type RuleType = 
  | 'co-run'
  | 'slot-restriction'
  | 'load-limit'
  | 'phase-window'
  | 'pattern-match'
  | 'precedence-override'

export interface BusinessRule {
  id: string
  type: RuleType
  name: string
  description: string
  isActive: boolean
  parameters: Record<string, unknown>
  priority: number
}

// Search and filter types
export interface SearchFilters {
  entityType?: 'client' | 'worker' | 'task'
  searchTerm?: string
  priorityLevel?: PriorityLevel
  category?: TaskCategory
  qualificationLevel?: QualificationLevel
  skills?: string[]
}

export interface SearchResult {
  entity: Client | Worker | Task
  entityType: 'client' | 'worker' | 'task'
  score: number
  highlights: string[]
}

// Export configuration
export interface ExportConfig {
  includeValidationSummary: boolean
  includeBusinessRules: boolean
  format: 'csv' | 'xlsx'
  separateFiles: boolean
}

// AI processing types
export interface AIProcessingState {
  isProcessing: boolean
  operation: 'header-mapping' | 'validation' | 'search' | 'rule-generation'
  progress: number
  confidence?: number
  suggestions?: string[]
}

// Column mapping for file import
export interface ColumnMapping {
  sourceColumn: string
  targetField: string
  confidence: number
  isConfirmed: boolean
}

export interface HeaderMappingResult {
  clientMappings: ColumnMapping[]
  workerMappings: ColumnMapping[]
  taskMappings: ColumnMapping[]
  unmappedColumns: string[]
}