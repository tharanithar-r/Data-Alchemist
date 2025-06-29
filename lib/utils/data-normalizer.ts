/**
 * Data normalization utilities for handling mixed data formats
 * Based on sample data analysis findings
 */

import { QualificationLevel } from '@/lib/types/entities'

/**
 * Normalize QualificationLevel from numeric to string format
 */
export function normalizeQualificationLevel(
  value: string | number
): QualificationLevel {
  if (typeof value === 'number') {
    const levelMap: Record<number, QualificationLevel> = {
      1: 'Junior',
      2: 'Junior',
      3: 'Mid',
      4: 'Senior',
      5: 'Expert',
    }
    return levelMap[value] || 'Mid'
  }
  
  // If already string, validate it's a valid enum value
  const validLevels: QualificationLevel[] = ['Junior', 'Mid', 'Senior', 'Expert']
  return validLevels.includes(value as QualificationLevel) 
    ? (value as QualificationLevel) 
    : 'Mid'
}

/**
 * Normalize PreferredPhases from mixed formats to array
 */
export function normalizePreferredPhases(value: string): number[] {
  if (!value || typeof value !== 'string') return []
  
  const trimmed = value.trim()
  
  // Handle JSON array format: "[1,2,3]"
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'number') : []
    } catch {
      return []
    }
  }
  
  // Handle range format: "1 - 3", "1-3", "1  -  3"
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    if (start <= end && start >= 1 && end <= 10) {
      return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }
  }
  
  // Handle comma-separated: "1,2,3"
  const commaSeparated = trimmed.split(',')
    .map(x => parseInt(x.trim(), 10))
    .filter(x => !isNaN(x) && x >= 1 && x <= 10)
  
  if (commaSeparated.length > 0) {
    return commaSeparated
  }
  
  return []
}

/**
 * Normalize AvailableSlots from mixed formats
 */
export function normalizeAvailableSlots(value: string | number): number[] {
  if (typeof value === 'number') {
    return [value]
  }
  
  if (!value || typeof value !== 'string') return []
  
  const trimmed = value.trim()
  
  // Handle JSON array format: "[1,2,3]"
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'number') : []
    } catch {
      return []
    }
  }
  
  // Handle comma-separated: "1,2,3"
  const commaSeparated = trimmed.split(',')
    .map(x => parseInt(x.trim(), 10))
    .filter(x => !isNaN(x) && x >= 0)
  
  if (commaSeparated.length > 0) {
    return commaSeparated
  }
  
  // Handle single number as string
  const singleNumber = parseInt(trimmed, 10)
  if (!isNaN(singleNumber) && singleNumber >= 0) {
    return [singleNumber]
  }
  
  return []
}

/**
 * Validate and normalize AttributesJSON
 */
export function normalizeAttributesJSON(value: string): string {
  if (!value || typeof value !== 'string') return '{}'
  
  const trimmed = value.trim()
  
  // If already valid JSON, return as-is
  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {
    // If not valid JSON, try to convert plain text to structured format
    return JSON.stringify({
      message: trimmed,
      source: 'auto-converted',
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * Validate TaskID references
 */
export function validateTaskIDs(taskIDs: string, validTaskIDs: Set<string>): {
  valid: string[]
  invalid: string[]
} {
  if (!taskIDs || typeof taskIDs !== 'string') {
    return { valid: [], invalid: [] }
  }
  
  const ids = taskIDs.split(',').map(id => id.trim()).filter(id => id.length > 0)
  const valid: string[] = []
  const invalid: string[] = []
  
  ids.forEach(id => {
    if (validTaskIDs.has(id)) {
      valid.push(id)
    } else {
      invalid.push(id)
    }
  })
  
  return { valid, invalid }
}

/**
 * Normalize skill tags for consistency
 */
export function normalizeSkills(skills: string): string[] {
  if (!skills || typeof skills !== 'string') return []
  
  const skillMap: Record<string, string> = {
    'ui/ux': 'ui-ux',
    'ml': 'machine-learning',
    'ai': 'artificial-intelligence',
    'devops': 'dev-ops',
  }
  
  return skills
    .split(',')
    .map(skill => {
      const normalized = skill.trim().toLowerCase()
      return skillMap[normalized] || normalized
    })
    .filter(skill => skill.length > 0)
}

/**
 * Generate validation errors for data quality issues
 */
export interface DataQualityIssue {
  field: string
  issue: string
  suggestion?: string
  severity: 'error' | 'warning' | 'info'
}

export function validateDataQuality(
  entity: Record<string, unknown>,
  entityType: 'client' | 'worker' | 'task'
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  
  // Check for AttributesJSON quality (if applicable)
  if (entityType === 'client' && entity.AttributesJSON) {
    const attr = entity.AttributesJSON as string
    try {
      JSON.parse(attr)
    } catch {
      issues.push({
        field: 'AttributesJSON',
        issue: 'Invalid JSON format',
        suggestion: 'Convert to valid JSON structure',
        severity: 'warning'
      })
    }
  }
  
  // Check for PreferredPhases format consistency
  if (entityType === 'task' && entity.PreferredPhases) {
    const phases = normalizePreferredPhases(entity.PreferredPhases as string)
    if (phases.length === 0 && entity.PreferredPhases) {
      issues.push({
        field: 'PreferredPhases',
        issue: 'Unrecognized format',
        suggestion: 'Use format like "1-3" or "[1,2,3]"',
        severity: 'warning'
      })
    }
  }
  
  return issues
}