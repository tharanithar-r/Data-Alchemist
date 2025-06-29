'use client'

import { Plus, Trash2, AlertCircle, Play } from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useDataStoreSelectors } from '@/lib/stores/data-store'
import { useRulesStore } from '@/lib/stores/rules-store'
import { CoRunRule } from '@/lib/stores/rules-store'

interface CoRunRuleFormProps {
  existingRule?: CoRunRule
  onSave: (rule: Omit<CoRunRule, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

export function CoRunRuleForm({ existingRule, onSave, onCancel }: CoRunRuleFormProps) {
  const { tasks } = useDataStoreSelectors()
  // const { previewRule } = useRulesStore() // TODO: Implement preview functionality
  
  const [formData, setFormData] = useState({
    name: existingRule?.name || '',
    description: existingRule?.description || '',
    isActive: existingRule?.isActive ?? true,
    taskIds: existingRule?.taskIds || [] as string[]
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Validation
  const validateForm = (): boolean => {
    const newErrors: string[] = []
    
    if (!formData.name.trim()) {
      newErrors.push('Rule name is required')
    }
    
    if (formData.taskIds.length < 2) {
      newErrors.push('Co-run rule must include at least 2 tasks')
    }
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleTaskToggle = (taskId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      taskIds: checked 
        ? [...prev.taskIds, taskId]
        : prev.taskIds.filter(id => id !== taskId)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const rule: Omit<CoRunRule, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'coRun',
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      isActive: formData.isActive,
      taskIds: formData.taskIds
    }
    
    onSave(rule)
  }

  const handlePreview = () => {
    if (!validateForm()) return
    
    // TODO: Implement rule preview functionality
    // const tempRule: CoRunRule = {
    //   type: 'coRun',
    //   id: 'preview',
    //   name: formData.name,
    //   description: formData.description,
    //   isActive: formData.isActive,
    //   taskIds: formData.taskIds,
    //   createdAt: new Date(),
    //   updatedAt: new Date()
    // }
    
    // This would show preview data in a modal or expanded section
    setShowPreview(true)
  }

  const selectedTasks = tasks.filter(task => formData.taskIds.includes(task.TaskID))
  
  // Get skill compatibility analysis
  const allRequiredSkills = new Set<string>()
  selectedTasks.forEach(task => {
    const skills = task.RequiredSkills?.split(',').map(s => s.trim()) || []
    skills.forEach(skill => allRequiredSkills.add(skill))
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          {existingRule ? 'Edit Co-run Rule' : 'Create Co-run Rule'}
        </CardTitle>
        <CardDescription>
          Select multiple tasks that should always run together as a group
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
              placeholder="e.g., Data Processing Co-run Group"
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
              placeholder="Optional description of why these tasks should run together"
              rows={2}
            />
          </div>

          {/* Task Selection */}
          <div className="space-y-3">
            <Label>Select Tasks to Group *</Label>
            <p className="text-sm text-gray-600">
              Choose at least 2 tasks that should always be assigned together
            </p>
            
            <ScrollArea className="h-64 border rounded-lg p-3">
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    No tasks available. Please upload task data first.
                  </p>
                ) : (
                  tasks.map(task => (
                    <div
                      key={task.TaskID}
                      className="flex items-start space-x-3 p-2 border rounded hover:bg-gray-50"
                    >
                      <Checkbox
                        id={`task-${task.TaskID}`}
                        checked={formData.taskIds.includes(task.TaskID)}
                        onCheckedChange={(checked) => 
                          handleTaskToggle(task.TaskID, checked as boolean)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label 
                            htmlFor={`task-${task.TaskID}`}
                            className="font-medium cursor-pointer"
                          >
                            {task.TaskID}
                          </Label>
                          {task.TaskName && (
                            <span className="text-sm text-gray-600">
                              {task.TaskName}
                            </span>
                          )}
                        </div>
                        
                        {task.RequiredSkills && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {task.RequiredSkills.split(',').map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {task.Duration && (
                          <span className="text-xs text-gray-500">
                            Duration: {task.Duration} phases
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Selected Tasks Summary */}
          {formData.taskIds.length > 0 && (
            <div className="space-y-3">
              <Label>Selected Tasks ({formData.taskIds.length})</Label>
              <div className="flex flex-wrap gap-2">
                {formData.taskIds.map(taskId => {
                  const task = tasks.find(t => t.TaskID === taskId)
                  return (
                    <Badge key={taskId} variant="secondary" className="flex items-center gap-1">
                      {taskId}
                      {task?.TaskName && (
                        <span className="text-xs">({task.TaskName})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTaskToggle(taskId, false)}
                        className="ml-1 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
              
              {/* Skill Analysis */}
              {allRequiredSkills.size > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Combined Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(allRequiredSkills).map(skill => (
                      <Badge key={skill} variant="outline" className="text-blue-700 border-blue-300">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Workers assigned to this co-run group will need all these skills
                  </p>
                </div>
              )}
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

          {/* Form Actions */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={formData.taskIds.length < 2}
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
        {showPreview && formData.taskIds.length >= 2 && (
          <div className="border-t pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Rule Preview</h4>
              <p className="text-sm text-amber-700 mb-3">
                This rule will create the following grouping:
              </p>
              <div className="bg-white p-3 rounded border">
                <code className="text-sm">
                  {`{ type: "coRun", tasks: [${formData.taskIds.map(id => `"${id}"`).join(', ')}] }`}
                </code>
              </div>
              <div className="mt-3 text-xs text-amber-600">
                <p>• These {formData.taskIds.length} tasks will always be assigned to the same worker(s)</p>
                <p>• Worker(s) must have all required skills: {Array.from(allRequiredSkills).join(', ')}</p>
                <p>• Tasks will be scheduled in the same phase when possible</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick create component for the main interface
interface QuickCoRunRuleProps {
  onRuleCreated: () => void
}

export function QuickCoRunRule({ onRuleCreated }: QuickCoRunRuleProps) {
  const { tasks } = useDataStoreSelectors()
  const { addRule } = useRulesStore()
  const [showForm, setShowForm] = useState(false)

  const handleSave = (ruleData: Omit<CoRunRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    addRule(ruleData)
    setShowForm(false)
    onRuleCreated()
  }

  if (!showForm) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Play className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Co-run Rule
        </h3>
        <p className="text-gray-600 mb-4">
          Select multiple TaskIDs to run together as a group
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Example: {`{ type: "coRun", tasks: ["T1", "T2", "T3"] }`}
        </p>
        <Button 
          onClick={() => setShowForm(true)}
          disabled={tasks.length < 2}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Co-run Rule
        </Button>
        {tasks.length < 2 && (
          <p className="text-xs text-amber-600 mt-2">
            Need at least 2 tasks to create a co-run rule
          </p>
        )}
      </div>
    )
  }

  return (
    <CoRunRuleForm
      onSave={handleSave}
      onCancel={() => setShowForm(false)}
    />
  )
}