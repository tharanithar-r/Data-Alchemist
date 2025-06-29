'use client'

import { Plus, Shield, AlertCircle, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
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
import { useRulesStore } from '@/lib/stores/rules-store'
import { PrecedenceOverrideRule, BusinessRule } from '@/lib/stores/rules-store'

interface PrecedenceOverrideRuleFormProps {
  existingRule?: PrecedenceOverrideRule
  onSave: (rule: Omit<PrecedenceOverrideRule, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

// Override types for different rule scenarios
const OVERRIDE_TYPES = [
  {
    id: 'priority',
    name: 'Priority Override',
    description: 'Override rule priority ordering',
    example: 'Set specific rule to always execute first regardless of creation order'
  },
  {
    id: 'conflict',
    name: 'Conflict Resolution',
    description: 'Define which rule wins when rules conflict',
    example: 'Phase-window rules override co-run rules when they conflict'
  },
  {
    id: 'conditional',
    name: 'Conditional Override',
    description: 'Override rules based on conditions',
    example: 'Disable load-limit rules when priority clients are involved'
  },
  {
    id: 'temporal',
    name: 'Temporal Override',
    description: 'Time-based rule precedence',
    example: 'Emergency rules override all others during specific time periods'
  }
]

export function PrecedenceOverrideRuleForm({ existingRule, onSave, onCancel }: PrecedenceOverrideRuleFormProps) {
  const { rules } = useRulesStore()
  
  const [formData, setFormData] = useState({
    name: existingRule?.name || '',
    description: existingRule?.description || '',
    isActive: existingRule?.isActive ?? true,
    overrideType: existingRule?.overrideType || 'priority',
    targetRuleIds: existingRule?.targetRuleIds || [] as string[],
    priority: existingRule?.priority || 1,
    conditions: existingRule?.conditions || {}
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Get available rules that can be managed
  const availableRules = useMemo(() => {
    return rules.filter(rule => 
      rule.id !== existingRule?.id && // Don't include self
      rule.type !== 'precedenceOverride' // Don't include other precedence rules to avoid loops
    )
  }, [rules, existingRule?.id])

  // Get selected override type
  const selectedOverrideType = useMemo(() => {
    return OVERRIDE_TYPES.find(type => type.id === formData.overrideType) || OVERRIDE_TYPES[0]
  }, [formData.overrideType])

  // Group rules by type for better organization
  const rulesByType = useMemo(() => {
    const grouped: Record<string, BusinessRule[]> = {}
    availableRules.forEach(rule => {
      if (!grouped[rule.type]) grouped[rule.type] = []
      grouped[rule.type].push(rule)
    })
    return grouped
  }, [availableRules])

  // Get selected rules details
  const selectedRules = useMemo(() => {
    return availableRules.filter(rule => formData.targetRuleIds.includes(rule.id))
  }, [availableRules, formData.targetRuleIds])

  // Analyze potential conflicts
  const conflictAnalysis = useMemo(() => {
    if (selectedRules.length === 0) return { conflicts: [], warnings: [] }

    const conflicts: string[] = []
    const warnings: string[] = []

    // Check for circular dependencies
    selectedRules.forEach(rule => {
      if (rule.type === 'precedenceOverride') {
        conflicts.push(`Rule "${rule.name}" is also a precedence override rule (circular dependency risk)`)
      }
    })

    // Check for conflicting rule types
    const ruleTypes = selectedRules.map(r => r.type)
    const uniqueTypes = new Set(ruleTypes)
    
    if (uniqueTypes.has('coRun') && uniqueTypes.has('phaseWindow')) {
      warnings.push('Co-run and Phase-window rules may conflict on task scheduling')
    }
    
    if (uniqueTypes.has('loadLimit') && uniqueTypes.has('slotRestriction')) {
      warnings.push('Load-limit and Slot-restriction rules may have overlapping constraints')
    }

    return { conflicts, warnings }
  }, [selectedRules])

  // Validation
  const validateForm = (): boolean => {
    const newErrors: string[] = []
    
    if (!formData.name.trim()) {
      newErrors.push('Rule name is required')
    }
    
    if (!formData.overrideType) {
      newErrors.push('Override type is required')
    }
    
    if (formData.targetRuleIds.length === 0) {
      newErrors.push('At least one target rule must be selected')
    }
    
    if (formData.priority < 1 || formData.priority > 10) {
      newErrors.push('Priority must be between 1 and 10')
    }
    
    // Check for conflicts
    if (conflictAnalysis.conflicts.length > 0) {
      newErrors.push(...conflictAnalysis.conflicts)
    }
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const rule: Omit<PrecedenceOverrideRule, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'precedenceOverride',
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      isActive: formData.isActive,
      overrideType: formData.overrideType,
      targetRuleIds: formData.targetRuleIds,
      priority: formData.priority,
      conditions: formData.conditions
    }
    
    onSave(rule)
  }

  const handlePreview = () => {
    if (!validateForm()) return
    setShowPreview(true)
  }

  const handleRuleToggle = (ruleId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      targetRuleIds: checked 
        ? [...prev.targetRuleIds, ruleId]
        : prev.targetRuleIds.filter(id => id !== ruleId)
    }))
  }

  const moveRuleUp = (ruleId: string) => {
    setFormData(prev => {
      const currentIndex = prev.targetRuleIds.indexOf(ruleId)
      if (currentIndex > 0) {
        const newOrder = [...prev.targetRuleIds]
        ;[newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]]
        return { ...prev, targetRuleIds: newOrder }
      }
      return prev
    })
  }

  const moveRuleDown = (ruleId: string) => {
    setFormData(prev => {
      const currentIndex = prev.targetRuleIds.indexOf(ruleId)
      if (currentIndex < prev.targetRuleIds.length - 1) {
        const newOrder = [...prev.targetRuleIds]
        ;[newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]]
        return { ...prev, targetRuleIds: newOrder }
      }
      return prev
    })
  }

  const removeRule = (ruleId: string) => {
    setFormData(prev => ({
      ...prev,
      targetRuleIds: prev.targetRuleIds.filter(id => id !== ruleId)
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {existingRule ? 'Edit Precedence Override Rule' : 'Create Precedence Override Rule'}
        </CardTitle>
        <CardDescription>
          Define global vs specific rules with explicit priority order
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
              placeholder="e.g., Emergency Override Protocol"
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
              placeholder="Optional description of this precedence override rule"
              rows={2}
            />
          </div>

          {/* Override Type */}
          <div className="space-y-3">
            <Label htmlFor="overrideType">Override Type *</Label>
            <Select
              value={formData.overrideType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, overrideType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select override type" />
              </SelectTrigger>
              <SelectContent>
                {OVERRIDE_TYPES.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.name}</span>
                      <span className="text-xs text-gray-600">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedOverrideType && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-1">Example:</div>
                <p className="text-sm text-blue-700">{selectedOverrideType.example}</p>
              </div>
            )}
          </div>

          {/* Priority Level */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority Level *</Label>
            <div className="flex items-center gap-3">
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  priority: parseInt(e.target.value) || 1 
                }))}
                className="w-32"
              />
              <span className="text-sm text-gray-600">
                (1 = Lowest, 10 = Highest precedence)
              </span>
            </div>
          </div>

          {/* Target Rules Selection */}
          <div className="space-y-3">
            <Label>Target Rules *</Label>
            <p className="text-sm text-gray-600">
              Select rules that this precedence override will manage
            </p>
            
            {availableRules.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center text-gray-500">
                No other rules available to manage
              </div>
            ) : (
              <div className="space-y-4">
                {/* Rule Selection by Type */}
                {Object.entries(rulesByType).map(([ruleType, typeRules]) => (
                  <div key={ruleType} className="border rounded-lg p-3">
                    <div className="font-medium text-sm mb-2 capitalize">
                      {ruleType.replace(/([A-Z])/g, ' $1').trim()} Rules ({typeRules.length})
                    </div>
                    <div className="space-y-2">
                      {typeRules.map(rule => (
                        <div key={rule.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                          <Checkbox
                            id={`rule-${rule.id}`}
                            checked={formData.targetRuleIds.includes(rule.id)}
                            onCheckedChange={(checked) => 
                              handleRuleToggle(rule.id, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={`rule-${rule.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {rule.name}
                            </Label>
                            {rule.description && (
                              <div className="text-xs text-gray-600">{rule.description}</div>
                            )}
                          </div>
                          <Badge 
                            variant={rule.isActive ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Rules Priority Order */}
          {selectedRules.length > 0 && (
            <div className="space-y-3">
              <Label>Rule Priority Order</Label>
              <p className="text-sm text-gray-600">
                Drag to reorder or use arrow buttons. Higher rules have precedence.
              </p>
              
              <div className="border rounded-lg p-3 space-y-2">
                {formData.targetRuleIds.map((ruleId: string, index: number) => {
                  const rule = availableRules.find(r => r.id === ruleId)
                  if (!rule) return null
                  
                  return (
                    <div key={ruleId} className="flex items-center gap-2 p-2 bg-white border rounded">
                      <span className="text-sm font-medium text-gray-500 w-8">
                        #{index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-xs text-gray-600 capitalize">
                          {rule.type.replace(/([A-Z])/g, ' $1').trim()} Rule
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveRuleUp(ruleId)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveRuleDown(ruleId)}
                          disabled={index === formData.targetRuleIds.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRule(ruleId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Conflict Analysis */}
          {(conflictAnalysis.conflicts.length > 0 || conflictAnalysis.warnings.length > 0) && (
            <div className="space-y-2">
              {conflictAnalysis.conflicts.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Conflicts Detected:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {conflictAnalysis.conflicts.map((conflict, idx) => (
                        <li key={idx} className="text-sm">{conflict}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              {conflictAnalysis.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Potential Issues:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {conflictAnalysis.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
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
                disabled={formData.targetRuleIds.length === 0}
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
        {showPreview && formData.targetRuleIds.length > 0 && (
          <div className="border-t pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Rule Preview</h4>
              <p className="text-sm text-amber-700 mb-3">
                This precedence override will establish the following rule hierarchy:
              </p>
              <div className="bg-white p-3 rounded border">
                <code className="text-sm">
                  {`{ type: "precedenceOverride", overrideType: "${formData.overrideType}", priority: ${formData.priority}, rules: [${formData.targetRuleIds.length}] }`}
                </code>
              </div>
              <div className="mt-3 text-xs text-amber-600">
                <p>• Override type: {selectedOverrideType?.name}</p>
                <p>• Priority level: {formData.priority}/10</p>
                <p>• Manages {formData.targetRuleIds.length} rule(s) in specified order</p>
                <p>• Rule execution order: {selectedRules.map(r => r.name).join(' → ')}</p>
                <p>• This override will control how conflicts between managed rules are resolved</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick create component for the main interface
interface QuickPrecedenceOverrideRuleProps {
  onRuleCreated: () => void
}

export function QuickPrecedenceOverrideRule({ onRuleCreated }: QuickPrecedenceOverrideRuleProps) {
  const { rules } = useRulesStore()
  const { addRule } = useRulesStore()
  const [showForm, setShowForm] = useState(false)

  const handleSave = (ruleData: Omit<PrecedenceOverrideRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    addRule(ruleData)
    setShowForm(false)
    onRuleCreated()
  }

  const availableRules = rules.filter(rule => rule.type !== 'precedenceOverride')

  if (!showForm) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Precedence Override Rule
        </h3>
        <p className="text-gray-600 mb-4">
          Define global vs specific rules with explicit priority order
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Example: {`{ overrideType: "priority", priority: 9, rules: [...] }`}
        </p>
        <Button 
          onClick={() => setShowForm(true)}
          disabled={availableRules.length < 2}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Precedence Override
        </Button>
        {availableRules.length < 2 && (
          <p className="text-xs text-amber-600 mt-2">
            Need at least 2 other rules to create precedence overrides
          </p>
        )}
      </div>
    )
  }

  return (
    <PrecedenceOverrideRuleForm
      onSave={handleSave}
      onCancel={() => setShowForm(false)}
    />
  )
}