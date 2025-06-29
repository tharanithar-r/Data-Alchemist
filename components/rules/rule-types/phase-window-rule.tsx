'use client'

import { Plus, Clock, AlertCircle, Search } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select' // Not used in this component
import { useDataStoreSelectors } from '@/lib/stores/data-store'
import { useRulesStore } from '@/lib/stores/rules-store'
import { PhaseWindowRule } from '@/lib/stores/rules-store'

interface PhaseWindowRuleFormProps {
  existingRule?: PhaseWindowRule
  onSave: (rule: Omit<PhaseWindowRule, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

const AVAILABLE_PHASES = [1, 2, 3, 4, 5]

export function PhaseWindowRuleForm({ existingRule, onSave, onCancel }: PhaseWindowRuleFormProps) {
  const { tasks } = useDataStoreSelectors()
  
  const [formData, setFormData] = useState({
    name: existingRule?.name || '',
    description: existingRule?.description || '',
    isActive: existingRule?.isActive ?? true,
    taskId: existingRule?.taskId || '',
    allowedPhases: existingRule?.allowedPhases || [] as number[]
  })
  
  const [taskSearchTerm, setTaskSearchTerm] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Filter tasks based on search term
  const filteredTasks = useMemo(() => {
    if (!taskSearchTerm.trim()) return tasks.slice(0, 20) // Show first 20 if no search
    
    const searchLower = taskSearchTerm.toLowerCase()
    return tasks.filter(task => 
      task.TaskID.toLowerCase().includes(searchLower) ||
      task.TaskName?.toLowerCase().includes(searchLower) ||
      task.Category?.toLowerCase().includes(searchLower)
    ).slice(0, 20)
  }, [tasks, taskSearchTerm])

  // Get selected task details
  const selectedTask = useMemo(() => {
    return tasks.find(task => task.TaskID === formData.taskId)
  }, [tasks, formData.taskId])

  // Parse task's preferred phases for comparison
  const taskPreferredPhases = useMemo(() => {
    if (!selectedTask?.PreferredPhases) return []
    
    try {
      // Try JSON array format first
      const parsed = JSON.parse(selectedTask.PreferredPhases)
      if (Array.isArray(parsed)) {
        return parsed.filter(p => typeof p === 'number' && p >= 1 && p <= 5)
      }
    } catch {
      // Try range format like "1-3"
      const rangeMatch = selectedTask.PreferredPhases.match(/(\d+)\s*-\s*(\d+)/)
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1])
        const end = parseInt(rangeMatch[2])
        if (start >= 1 && end <= 5 && start <= end) {
          return Array.from({ length: end - start + 1 }, (_, i) => start + i)
        }
      }
      
      // Try comma-separated format like "1,3,5"
      const commaSeparated = selectedTask.PreferredPhases.split(',')
        .map(p => parseInt(p.trim()))
        .filter(p => !isNaN(p) && p >= 1 && p <= 5)
      if (commaSeparated.length > 0) {
        return commaSeparated
      }
    }
    
    return []
  }, [selectedTask])

  // Analyze phase conflicts
  const phaseAnalysis = useMemo(() => {
    if (formData.allowedPhases.length === 0 || taskPreferredPhases.length === 0) {
      return { conflicts: [], matches: [], hasConflicts: false }
    }

    const conflicts = taskPreferredPhases.filter(phase => !formData.allowedPhases.includes(phase))
    const matches = taskPreferredPhases.filter(phase => formData.allowedPhases.includes(phase))
    
    return {
      conflicts,
      matches,
      hasConflicts: conflicts.length > 0
    }
  }, [formData.allowedPhases, taskPreferredPhases])

  // Validation
  const validateForm = (): boolean => {
    const newErrors: string[] = []
    
    if (!formData.name.trim()) {
      newErrors.push('Rule name is required')
    }
    
    if (!formData.taskId) {
      newErrors.push('Task selection is required')
    }
    
    if (formData.allowedPhases.length === 0) {
      newErrors.push('At least one allowed phase must be selected')
    }
    
    if (!selectedTask) {
      newErrors.push('Selected task not found in data')
    }
    
    // Check task duration vs allowed phases
    if (selectedTask?.Duration && formData.allowedPhases.length > 0) {
      if (selectedTask.Duration > formData.allowedPhases.length) {
        newErrors.push(`Task duration (${selectedTask.Duration} phases) exceeds allowed phase window (${formData.allowedPhases.length} phases)`)
      }
    }
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handlePhaseToggle = (phase: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      allowedPhases: checked 
        ? [...prev.allowedPhases, phase].sort()
        : prev.allowedPhases.filter(p => p !== phase)
    }))
  }

  const handleTaskSelect = (taskId: string) => {
    setFormData(prev => ({ ...prev, taskId }))
    setTaskSearchTerm('') // Clear search when task is selected
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const rule: Omit<PhaseWindowRule, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'phaseWindow',
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      isActive: formData.isActive,
      taskId: formData.taskId,
      allowedPhases: formData.allowedPhases
    }
    
    onSave(rule)
  }

  const handlePreview = () => {
    if (!validateForm()) return
    setShowPreview(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {existingRule ? 'Edit Phase Window Rule' : 'Create Phase Window Rule'}
        </CardTitle>
        <CardDescription>
          Restrict a task to specific phases during allocation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="ruleName">Rule Name *</Label>
            <Input
              id="ruleName"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Data Analysis Phase Restriction"
              className={errors.some(e => e.includes('name')) ? 'border-red-500' : ''}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ruleDescription">Description</Label>
            <Textarea
              id="ruleDescription"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description of why this phase restriction is needed"
              rows={2}
            />
          </div>

          {/* Task Selection */}
          <div className="space-y-3">
            <Label>Select Task *</Label>
            
            {!formData.taskId ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search tasks by ID, name, or category..."
                    value={taskSearchTerm}
                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {tasks.length === 0 ? 'No tasks available' : 'No tasks match your search'}
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredTasks.map(task => (
                        <div
                          key={task.TaskID}
                          className="p-3 hover:bg-gray-50 rounded cursor-pointer border"
                          onClick={() => handleTaskSelect(task.TaskID)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium">{task.TaskID}</div>
                              {task.TaskName && (
                                <div className="text-sm text-gray-600">{task.TaskName}</div>
                              )}
                              <div className="flex gap-2 mt-1">
                                {task.Category && (
                                  <Badge variant="outline" className="text-xs">
                                    {task.Category}
                                  </Badge>
                                )}
                                {task.Duration && (
                                  <Badge variant="outline" className="text-xs">
                                    {task.Duration} phases
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 border rounded-lg bg-blue-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-blue-900">{formData.taskId}</div>
                    {selectedTask?.TaskName && (
                      <div className="text-sm text-blue-700">{selectedTask.TaskName}</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      {selectedTask?.Category && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                          {selectedTask.Category}
                        </Badge>
                      )}
                      {selectedTask?.Duration && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                          Duration: {selectedTask.Duration} phases
                        </Badge>
                      )}
                      {taskPreferredPhases.length > 0 && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                          Prefers: [{taskPreferredPhases.join(', ')}]
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, taskId: '' }))}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Phase Selection */}
          {formData.taskId && (
            <div className="space-y-3">
              <Label>Allowed Phases *</Label>
              <p className="text-sm text-gray-600">
                Select which phases this task is allowed to be scheduled in
              </p>
              
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-3">
                  {AVAILABLE_PHASES.map(phase => {
                    const isSelected = formData.allowedPhases.includes(phase)
                    const isPreferred = taskPreferredPhases.includes(phase)
                    // const isConflict = taskPreferredPhases.length > 0 && isPreferred && !isSelected // Future use for styling
                    
                    return (
                      <div
                        key={phase}
                        className={`relative p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePhaseToggle(phase, !isSelected)}
                      >
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}} // Handled by parent click
                            className="mr-2"
                          />
                          <span className="font-medium">Phase {phase}</span>
                        </div>
                        
                        {isPreferred && (
                          <div className="absolute -top-1 -right-1">
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              Pref
                            </Badge>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Phase Analysis */}
                {taskPreferredPhases.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium mb-2">Phase Compatibility Analysis:</div>
                    <div className="space-y-1 text-sm">
                      {phaseAnalysis.matches.length > 0 && (
                        <div className="text-green-600">
                          ✓ Matches task preferences: [{phaseAnalysis.matches.join(', ')}]
                        </div>
                      )}
                      {phaseAnalysis.conflicts.length > 0 && (
                        <div className="text-amber-600">
                          ⚠ Conflicts with task preferences: [{phaseAnalysis.conflicts.join(', ')}]
                        </div>
                      )}
                      {formData.allowedPhases.length > 0 && taskPreferredPhases.length === 0 && (
                        <div className="text-gray-600">
                          ℹ Task has no specified phase preferences
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Select Options */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, allowedPhases: AVAILABLE_PHASES }))}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, allowedPhases: [] }))}
                  >
                    Clear All
                  </Button>
                  {taskPreferredPhases.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, allowedPhases: taskPreferredPhases }))}
                    >
                      Use Task Preferences
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rule Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isActive: checked as boolean }))
              }
            />
            <Label htmlFor="isActive">Rule is active</Label>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {phaseAnalysis.hasConflicts && formData.allowedPhases.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Note:</strong> This phase window conflicts with the task's preferred phases. 
                The task will be restricted to your selected phases regardless of its preferences.
              </AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={!formData.taskId || formData.allowedPhases.length === 0}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Preview Rule Effect
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                {existingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </form>

        {/* Preview Section */}
        {showPreview && formData.taskId && formData.allowedPhases.length > 0 && (
          <div className="border-t pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Rule Preview</h4>
              <p className="text-sm text-amber-700 mb-3">
                This rule will enforce the following phase restriction:
              </p>
              <div className="bg-white p-3 rounded border">
                <code className="text-sm">
                  {`{ type: "phaseWindow", taskId: "${formData.taskId}", allowedPhases: [${formData.allowedPhases.join(', ')}] }`}
                </code>
              </div>
              <div className="mt-3 text-xs text-amber-600">
                <p>• Task "{formData.taskId}" will only be scheduled in phases [{formData.allowedPhases.join(', ')}]</p>
                {selectedTask?.Duration && (
                  <p>• Task duration: {selectedTask.Duration} phases (fits in {formData.allowedPhases.length} allowed phases)</p>
                )}
                {taskPreferredPhases.length > 0 && (
                  <p>• Task preferred phases: [{taskPreferredPhases.join(', ')}] {phaseAnalysis.hasConflicts ? '(conflicts detected)' : '(compatible)'}</p>
                )}
                <p>• This constraint will be enforced during allocation optimization</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick create component for the main interface
interface QuickPhaseWindowRuleProps {
  onRuleCreated: () => void
}

export function QuickPhaseWindowRule({ onRuleCreated }: QuickPhaseWindowRuleProps) {
  const { tasks } = useDataStoreSelectors()
  const { addRule } = useRulesStore()
  const [showForm, setShowForm] = useState(false)

  const handleSave = (ruleData: Omit<PhaseWindowRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    addRule(ruleData)
    setShowForm(false)
    onRuleCreated()
  }

  if (!showForm) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Phase Window Rule
        </h3>
        <p className="text-gray-600 mb-4">
          Pick TaskID + allowed phase list/range
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Example: {`{ taskId: "T1", allowedPhases: [1, 2, 3] }`}
        </p>
        <Button 
          onClick={() => setShowForm(true)}
          disabled={tasks.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Phase Window
        </Button>
        {tasks.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            Need tasks to create phase window rules
          </p>
        )}
      </div>
    )
  }

  return (
    <PhaseWindowRuleForm
      onSave={handleSave}
      onCancel={() => setShowForm(false)}
    />
  )
}