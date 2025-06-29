'use client'

import { Plus, Search, AlertCircle, Lightbulb } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDataStoreSelectors } from '@/lib/stores/data-store'
import { useRulesStore } from '@/lib/stores/rules-store'
import { PatternMatchRule } from '@/lib/stores/rules-store'

interface PatternMatchRuleFormProps {
  existingRule?: PatternMatchRule
  onSave: (rule: Omit<PatternMatchRule, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

// Rule templates for common patterns
const RULE_TEMPLATES = [
  {
    id: 'priority',
    name: 'Priority Boost',
    description: 'Increase priority for matching entities',
    example: 'Boost priority for tasks containing "urgent" or "critical"',
    parameters: {
      priorityModifier: { type: 'number', default: 2, min: 1, max: 5, label: 'Priority Multiplier' },
      targetEntity: { type: 'select', default: 'task', options: ['task', 'client', 'worker'], label: 'Target Entity' }
    }
  },
  {
    id: 'grouping',
    name: 'Auto Grouping',
    description: 'Automatically group matching entities',
    example: 'Group all tasks with "data" in the name',
    parameters: {
      groupName: { type: 'text', default: 'Auto Group', label: 'Group Name' },
      targetEntity: { type: 'select', default: 'task', options: ['task', 'client', 'worker'], label: 'Target Entity' }
    }
  },
  {
    id: 'skill-requirement',
    name: 'Skill Requirement',
    description: 'Add skill requirements for matching tasks',
    example: 'Tasks with "ML" require "Machine Learning" skill',
    parameters: {
      requiredSkill: { type: 'text', default: '', label: 'Required Skill' },
      skillLevel: { type: 'number', default: 1, min: 1, max: 5, label: 'Skill Level (1-5)' }
    }
  },
  {
    id: 'load-limit',
    name: 'Load Restriction',
    description: 'Apply load limits to matching workers',
    example: 'Limit senior workers to max 3 slots per phase',
    parameters: {
      maxLoad: { type: 'number', default: 3, min: 1, max: 10, label: 'Max Load Per Phase' }
    }
  },
  {
    id: 'phase-preference',
    name: 'Phase Preference',
    description: 'Set phase preferences for matching tasks',
    example: 'Schedule "setup" tasks in early phases',
    parameters: {
      preferredPhases: { type: 'multiselect', default: [1, 2], options: [1, 2, 3, 4, 5], label: 'Preferred Phases' }
    }
  },
  {
    id: 'custom',
    name: 'Custom Rule',
    description: 'Define custom parameters',
    example: 'Create your own rule logic',
    parameters: {
      customParam1: { type: 'text', default: '', label: 'Parameter 1' },
      customParam2: { type: 'text', default: '', label: 'Parameter 2' }
    }
  }
]

// Common regex patterns for suggestions
const REGEX_SUGGESTIONS = [
  { pattern: '^Data.*', description: 'Starts with "Data"', example: 'DataAnalysis, DataProcessing' },
  { pattern: '.*urgent.*', description: 'Contains "urgent" (case-insensitive)', example: 'Urgent Task, URGENT_REQUEST' },
  { pattern: '^(T|TASK)[0-9]+$', description: 'Task ID format (T123, TASK456)', example: 'T123, TASK456' },
  { pattern: '.*(senior|lead).*', description: 'Contains "senior" or "lead"', example: 'Senior Developer, Team Lead' },
  { pattern: '^[A-Z]{2,3}[0-9]{3}$', description: 'Code format (AB123, XYZ456)', example: 'AB123, XYZ456' },
  { pattern: '.*(test|debug|fix).*', description: 'Development keywords', example: 'Bug Fix, Unit Test, Debug Session' }
]

export function PatternMatchRuleForm({ existingRule, onSave, onCancel }: PatternMatchRuleFormProps) {
  const { clients, workers, tasks } = useDataStoreSelectors()
  
  const [formData, setFormData] = useState({
    name: existingRule?.name || '',
    description: existingRule?.description || '',
    isActive: existingRule?.isActive ?? true,
    regex: existingRule?.regex || '',
    template: existingRule?.template || 'priority',
    parameters: existingRule?.parameters || {}
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [regexTestInput, setRegexTestInput] = useState('')

  // Get selected template
  const selectedTemplate = useMemo(() => {
    return RULE_TEMPLATES.find(t => t.id === formData.template) || RULE_TEMPLATES[0]
  }, [formData.template])

  // Test regex against entities
  const regexMatches = useMemo(() => {
    if (!formData.regex.trim()) return { tasks: [], workers: [], clients: [], total: 0 }
    
    try {
      const regex = new RegExp(formData.regex, 'i') // Case-insensitive
      
      const matchingTasks = tasks.filter(t => 
        regex.test(t.TaskID) || 
        regex.test(t.TaskName || '') || 
        regex.test(t.Category || '')
      )
      
      const matchingWorkers = workers.filter(w => 
        regex.test(w.WorkerID) || 
        regex.test(w.WorkerName || '') || 
        regex.test(w.WorkerGroup || '')
      )
      
      const matchingClients = clients.filter(c => 
        regex.test(c.ClientID) || 
        regex.test(c.ClientName || '') || 
        regex.test(c.GroupTag || '')
      )
      
      return {
        tasks: matchingTasks.slice(0, 10), // Limit display
        workers: matchingWorkers.slice(0, 10),
        clients: matchingClients.slice(0, 10),
        total: matchingTasks.length + matchingWorkers.length + matchingClients.length
      }
    } catch {
      return { tasks: [], workers: [], clients: [], total: 0 }
    }
  }, [formData.regex, tasks, workers, clients])

  // Test regex against custom input
  const regexTestResult = useMemo(() => {
    if (!formData.regex.trim() || !regexTestInput.trim()) return null
    
    try {
      const regex = new RegExp(formData.regex, 'i')
      return regex.test(regexTestInput)
    } catch {
      return null
    }
  }, [formData.regex, regexTestInput])

  // Validation
  const validateForm = (): boolean => {
    const newErrors: string[] = []
    
    if (!formData.name.trim()) {
      newErrors.push('Rule name is required')
    }
    
    if (!formData.regex.trim()) {
      newErrors.push('Regular expression pattern is required')
    } else {
      try {
        new RegExp(formData.regex)
      } catch {
        newErrors.push('Invalid regular expression syntax')
      }
    }
    
    if (!formData.template) {
      newErrors.push('Rule template selection is required')
    }
    
    // Validate template parameters
    if (selectedTemplate) {
      Object.entries(selectedTemplate.parameters).forEach(([key, param]: [string, any]) => {
        const value = formData.parameters[key]
        
        if (param.type === 'number') {
          const numValue = Number(value)
          if (isNaN(numValue) || numValue < (param.min || 0) || numValue > (param.max || 100)) {
            newErrors.push(`${param.label} must be a number between ${param.min || 0} and ${param.max || 100}`)
          }
        } else if (param.type === 'text' && param.label.includes('Required') && !value?.trim()) {
          newErrors.push(`${param.label} is required`)
        }
      })
    }
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const rule: Omit<PatternMatchRule, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'patternMatch',
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      isActive: formData.isActive,
      regex: formData.regex.trim(),
      template: formData.template,
      parameters: formData.parameters
    }
    
    onSave(rule)
  }

  const handlePreview = () => {
    if (!validateForm()) return
    setShowPreview(true)
  }

  const handleTemplateChange = (templateId: string) => {
    const template = RULE_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      const defaultParams: Record<string, any> = {}
      Object.entries(template.parameters).forEach(([key, param]: [string, any]) => {
        defaultParams[key] = param.default
      })
      
      setFormData(prev => ({
        ...prev,
        template: templateId,
        parameters: defaultParams
      }))
    }
  }

  const handleParameterChange = (paramKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [paramKey]: value
      }
    }))
  }

  const insertRegexSuggestion = (pattern: string) => {
    setFormData(prev => ({ ...prev, regex: pattern }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          {existingRule ? 'Edit Pattern Match Rule' : 'Create Pattern Match Rule'}
        </CardTitle>
        <CardDescription>
          Use regular expressions to match entity names and apply rule templates
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
              placeholder="e.g., Priority Boost for Urgent Tasks"
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
              placeholder="Optional description of this pattern matching rule"
              rows={2}
            />
          </div>

          {/* Regular Expression Pattern */}
          <div className="space-y-3">
            <Label htmlFor="regexPattern">Regular Expression Pattern *</Label>
            <div className="space-y-3">
              <Input
                id="regexPattern"
                value={formData.regex}
                onChange={(e) => setFormData(prev => ({ ...prev, regex: e.target.value }))}
                placeholder="e.g., ^Data.* or .*(urgent|critical).*"
                className={`font-mono ${errors.some(e => e.includes('expression')) ? 'border-red-500' : ''}`}
              />
              
              {/* Regex Suggestions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Common Patterns:</Label>
                <div className="grid grid-cols-1 gap-2">
                  {REGEX_SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex-1">
                        <code className="bg-gray-100 px-1 rounded">{suggestion.pattern}</code>
                        <span className="ml-2 text-gray-600">{suggestion.description}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertRegexSuggestion(suggestion.pattern)}
                      >
                        Use
                      </Button>
                    </div>
                  ))}
                  
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      Show more patterns...
                    </summary>
                    <div className="mt-2 space-y-2">
                      {REGEX_SUGGESTIONS.slice(3).map((suggestion, idx) => (
                        <div key={idx + 3} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <code className="bg-gray-100 px-1 rounded">{suggestion.pattern}</code>
                            <span className="ml-2 text-gray-600">{suggestion.description}</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertRegexSuggestion(suggestion.pattern)}
                          >
                            Use
                          </Button>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>

              {/* Regex Test */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Test Your Pattern:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter test text..."
                    value={regexTestInput}
                    onChange={(e) => setRegexTestInput(e.target.value)}
                    className="flex-1"
                  />
                  {regexTestResult !== null && (
                    <Badge variant={regexTestResult ? "default" : "secondary"} className="self-center">
                      {regexTestResult ? "Match" : "No Match"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Matches Preview */}
          {formData.regex.trim() && (
            <div className="space-y-3">
              <Label>Current Data Matches ({regexMatches.total} total)</Label>
              <div className="p-3 bg-blue-50 rounded-lg">
                {regexMatches.total === 0 ? (
                  <p className="text-sm text-blue-600">No entities match this pattern</p>
                ) : (
                  <div className="space-y-2">
                    {regexMatches.tasks.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-blue-800">
                          Tasks ({regexMatches.tasks.length} shown):
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {regexMatches.tasks.map(task => (
                            <Badge key={task.TaskID} variant="outline" className="text-xs">
                              {task.TaskID}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {regexMatches.workers.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-blue-800">
                          Workers ({regexMatches.workers.length} shown):
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {regexMatches.workers.map(worker => (
                            <Badge key={worker.WorkerID} variant="outline" className="text-xs">
                              {worker.WorkerID}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {regexMatches.clients.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-blue-800">
                          Clients ({regexMatches.clients.length} shown):
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {regexMatches.clients.map(client => (
                            <Badge key={client.ClientID} variant="outline" className="text-xs">
                              {client.ClientID}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rule Template Selection */}
          <div className="space-y-3">
            <Label htmlFor="template">Rule Template *</Label>
            <Select
              value={formData.template}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a rule template" />
              </SelectTrigger>
              <SelectContent>
                {RULE_TEMPLATES.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-gray-600">{template.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedTemplate && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Template Example:</span>
                </div>
                <p className="text-sm text-gray-600">{selectedTemplate.example}</p>
              </div>
            )}
          </div>

          {/* Template Parameters */}
          {selectedTemplate && Object.keys(selectedTemplate.parameters).length > 0 && (
            <div className="space-y-3">
              <Label>Template Parameters</Label>
              <div className="space-y-3 p-3 border rounded-lg">
                {Object.entries(selectedTemplate.parameters).map(([key, param]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`param-${key}`} className="text-sm">{param.label}</Label>
                    
                    {param.type === 'text' && (
                      <Input
                        id={`param-${key}`}
                        value={formData.parameters[key] || ''}
                        onChange={(e) => handleParameterChange(key, e.target.value)}
                        placeholder={`Enter ${param.label.toLowerCase()}`}
                      />
                    )}
                    
                    {param.type === 'number' && (
                      <Input
                        id={`param-${key}`}
                        type="number"
                        min={param.min}
                        max={param.max}
                        value={formData.parameters[key] || param.default}
                        onChange={(e) => handleParameterChange(key, parseInt(e.target.value) || param.default)}
                      />
                    )}
                    
                    {param.type === 'select' && (
                      <Select
                        value={formData.parameters[key] || param.default}
                        onValueChange={(value) => handleParameterChange(key, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {param.options.map((option: string) => (
                            <SelectItem key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {param.type === 'multiselect' && (
                      <div className="flex gap-2 flex-wrap">
                        {param.options.map((option: number) => (
                          <div key={option} className="flex items-center space-x-1">
                            <Checkbox
                              id={`${key}-${option}`}
                              checked={(formData.parameters[key] || []).includes(option)}
                              onCheckedChange={(checked) => {
                                const current = formData.parameters[key] || []
                                const updated = checked 
                                  ? [...current, option]
                                  : current.filter((o: number) => o !== option)
                                handleParameterChange(key, updated.sort())
                              }}
                            />
                            <Label htmlFor={`${key}-${option}`} className="text-sm">
                              Phase {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
          {regexMatches.total > 50 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This pattern matches {regexMatches.total} entities. Consider making it more specific to avoid unintended effects.
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
                disabled={!formData.regex.trim() || !formData.template}
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
        {showPreview && formData.regex && formData.template && (
          <div className="border-t pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Rule Preview</h4>
              <p className="text-sm text-amber-700 mb-3">
                This rule will apply the following pattern matching logic:
              </p>
              <div className="bg-white p-3 rounded border">
                <code className="text-sm">
                  {`{ type: "patternMatch", regex: "${formData.regex}", template: "${formData.template}", params: ${JSON.stringify(formData.parameters)} }`}
                </code>
              </div>
              <div className="mt-3 text-xs text-amber-600">
                <p>• Pattern "{formData.regex}" matches {regexMatches.total} entities</p>
                <p>• Template "{selectedTemplate?.name}" will be applied to all matches</p>
                <p>• Parameters: {Object.entries(formData.parameters).map(([k, v]) => `${k}=${v}`).join(', ')}</p>
                <p>• This rule will modify allocation behavior for all matching entities</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick create component for the main interface
interface QuickPatternMatchRuleProps {
  onRuleCreated: () => void
}

export function QuickPatternMatchRule({ onRuleCreated }: QuickPatternMatchRuleProps) {
  const { clients, workers, tasks } = useDataStoreSelectors()
  const { addRule } = useRulesStore()
  const [showForm, setShowForm] = useState(false)

  const handleSave = (ruleData: Omit<PatternMatchRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    addRule(ruleData)
    setShowForm(false)
    onRuleCreated()
  }

  const hasData = clients.length > 0 || workers.length > 0 || tasks.length > 0

  if (!showForm) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Pattern Match Rule
        </h3>
        <p className="text-gray-600 mb-4">
          Enter regex + choose rule template + parameters
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Example: {`{ regex: "^Data.*", template: "priority", params: {...} }`}
        </p>
        <Button 
          onClick={() => setShowForm(true)}
          disabled={!hasData}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Pattern Match
        </Button>
        {!hasData && (
          <p className="text-xs text-amber-600 mt-2">
            Need data to create pattern matching rules
          </p>
        )}
      </div>
    )
  }

  return (
    <PatternMatchRuleForm
      onSave={handleSave}
      onCancel={() => setShowForm(false)}
    />
  )
}