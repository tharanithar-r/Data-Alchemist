import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { ValidationError, ValidationSummary } from '@/lib/types/entities'

interface ValidationState {
  // Validation results
  validationSummary: ValidationSummary | null
  isValidating: boolean
  lastValidationTime: Date | null
  
  // Real-time validation
  realtimeValidation: boolean
  validationDebounceMs: number
  
  // Error management
  dismissedErrors: Set<string>
  pinnedErrors: Set<string>
  
  // UI state
  showValidationPanel: boolean
  selectedErrorLevel: 'all' | 'error' | 'warning' | 'info'
  
  // Actions
  setValidationSummary: (summary: ValidationSummary) => void
  setIsValidating: (isValidating: boolean) => void
  
  dismissError: (errorId: string) => void
  pinError: (errorId: string) => void
  unpinError: (errorId: string) => void
  clearDismissedErrors: () => void
  
  setShowValidationPanel: (show: boolean) => void
  setSelectedErrorLevel: (level: 'all' | 'error' | 'warning' | 'info') => void
  setRealtimeValidation: (enabled: boolean) => void
  
  // Computed getters
  getVisibleErrors: () => ValidationError[]
  getErrorsByEntity: (entityType: 'client' | 'worker' | 'task') => ValidationError[]
  getErrorStats: () => { errors: number; warnings: number; info: number }
}

const initialValidationSummary: ValidationSummary = {
  clients: { isValid: true, errors: [], warnings: [] },
  workers: { isValid: true, errors: [], warnings: [] },
  tasks: { isValid: true, errors: [], warnings: [] },
  crossEntity: { isValid: true, errors: [], warnings: [] },
  totalErrors: 0,
  totalWarnings: 0,
}

export const useValidationStore = create<ValidationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      validationSummary: initialValidationSummary,
      isValidating: false,
      lastValidationTime: null,
      
      realtimeValidation: true,
      validationDebounceMs: 300,
      
      dismissedErrors: new Set(),
      pinnedErrors: new Set(),
      
      showValidationPanel: false,
      selectedErrorLevel: 'all',
      
      // Actions
      setValidationSummary: (summary) => set(
        {
          validationSummary: summary,
          lastValidationTime: new Date(),
        },
        false,
        'setValidationSummary'
      ),
      
      setIsValidating: (isValidating) => set(
        { isValidating },
        false,
        'setIsValidating'
      ),
      
      dismissError: (errorId) => set(
        (state) => ({
          dismissedErrors: new Set([...state.dismissedErrors, errorId]),
        }),
        false,
        'dismissError'
      ),
      
      pinError: (errorId) => set(
        (state) => ({
          pinnedErrors: new Set([...state.pinnedErrors, errorId]),
          dismissedErrors: new Set([...state.dismissedErrors].filter(id => id !== errorId)),
        }),
        false,
        'pinError'
      ),
      
      unpinError: (errorId) => set(
        (state) => ({
          pinnedErrors: new Set([...state.pinnedErrors].filter(id => id !== errorId)),
        }),
        false,
        'unpinError'
      ),
      
      clearDismissedErrors: () => set(
        { dismissedErrors: new Set() },
        false,
        'clearDismissedErrors'
      ),
      
      setShowValidationPanel: (show) => set(
        { showValidationPanel: show },
        false,
        'setShowValidationPanel'
      ),
      
      setSelectedErrorLevel: (level) => set(
        { selectedErrorLevel: level },
        false,
        'setSelectedErrorLevel'
      ),
      
      setRealtimeValidation: (enabled) => set(
        { realtimeValidation: enabled },
        false,
        'setRealtimeValidation'
      ),
      
      // Computed getters
      getVisibleErrors: () => {
        const state = get()
        if (!state.validationSummary) return []
        
        const allErrors: ValidationError[] = [
          ...state.validationSummary.clients.errors,
          ...state.validationSummary.clients.warnings,
          ...state.validationSummary.workers.errors,
          ...state.validationSummary.workers.warnings,
          ...state.validationSummary.tasks.errors,
          ...state.validationSummary.tasks.warnings,
          ...state.validationSummary.crossEntity.errors,
          ...state.validationSummary.crossEntity.warnings,
        ]
        
        return allErrors.filter(error => {
          // Filter by dismissed/pinned status
          const isDismissed = state.dismissedErrors.has(error.id)
          const isPinned = state.pinnedErrors.has(error.id)
          
          if (isPinned) return true
          if (isDismissed) return false
          
          // Filter by error level
          if (state.selectedErrorLevel !== 'all') {
            return error.level === state.selectedErrorLevel
          }
          
          return true
        })
      },
      
      getErrorsByEntity: (entityType) => {
        const state = get()
        if (!state.validationSummary) return []
        
        const entityResult = entityType === 'client' ? state.validationSummary.clients : 
                            entityType === 'worker' ? state.validationSummary.workers : 
                            state.validationSummary.tasks
        const allErrors = [...entityResult.errors, ...entityResult.warnings]
        
        return allErrors.filter(error => {
          const isDismissed = state.dismissedErrors.has(error.id)
          const isPinned = state.pinnedErrors.has(error.id)
          
          if (isPinned) return true
          if (isDismissed) return false
          
          if (state.selectedErrorLevel !== 'all') {
            return error.level === state.selectedErrorLevel
          }
          
          return true
        })
      },
      
      getErrorStats: () => {
        const visibleErrors = get().getVisibleErrors()
        
        return {
          errors: visibleErrors.filter(e => e.level === 'error').length,
          warnings: visibleErrors.filter(e => e.level === 'warning').length,
          info: visibleErrors.filter(e => e.level === 'info').length,
        }
      },
    }),
    {
      name: 'validation-store',
    }
  )
)

// Utility hooks for common validation operations
export const useValidationActions = () => {
  const store = useValidationStore()
  
  return {
    // Quick validation status
    hasErrors: () => {
      const summary = store.validationSummary
      return summary ? summary.totalErrors > 0 : false
    },
    
    hasWarnings: () => {
      const summary = store.validationSummary
      return summary ? summary.totalWarnings > 0 : false
    },
    
    isValidationClean: () => {
      const summary = store.validationSummary
      return summary ? summary.totalErrors === 0 && summary.totalWarnings === 0 : true
    },
    
    // Bulk error actions
    dismissAllErrors: () => {
      const allErrors = store.getVisibleErrors()
      allErrors.forEach(error => store.dismissError(error.id))
    },
    
    pinAllErrors: () => {
      const allErrors = store.getVisibleErrors()
      allErrors.forEach(error => store.pinError(error.id))
    },
    
    // Validation triggers
    triggerValidation: () => {
      store.setIsValidating(true)
      // Validation logic would be triggered here
      // This is handled by the validation engine
    },
    
    // Entity-specific validation status
    getEntityValidationStatus: (entityType: 'client' | 'worker' | 'task') => {
      const summary = store.validationSummary
      if (!summary) return { isValid: true, errorCount: 0, warningCount: 0 }
      
      const entityResult = entityType === 'client' ? summary.clients : 
                          entityType === 'worker' ? summary.workers : 
                          summary.tasks
      return {
        isValid: entityResult.isValid,
        errorCount: entityResult.errors.length,
        warningCount: entityResult.warnings.length,
      }
    },
  }
}