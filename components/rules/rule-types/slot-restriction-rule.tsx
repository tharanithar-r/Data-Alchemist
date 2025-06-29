'use client'

import { Plus, Users, AlertCircle, Building } from 'lucide-react'
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
import { SlotRestrictionRule } from '@/lib/stores/rules-store'

interface SlotRestrictionRuleFormProps {
  existingRule?: SlotRestrictionRule
  onSave: (rule: Omit<SlotRestrictionRule, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

export function SlotRestrictionRuleForm({ existingRule, onSave, onCancel }: SlotRestrictionRuleFormProps) {
  const { clients, workers } = useDataStoreSelectors()
  
  const [formData, setFormData] = useState({
    name: existingRule?.name || '',
    description: existingRule?.description || '',
    isActive: existingRule?.isActive ?? true,
    targetType: existingRule?.targetType || 'worker' as 'client' | 'worker',
    groupTag: existingRule?.groupTag || '',
    minCommonSlots: existingRule?.minCommonSlots || 1
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Get available groups based on target type
  const availableGroups = useMemo(() => {
    if (formData.targetType === 'worker') {
      const groups = new Set<string>()
      workers.forEach(worker => {
        if (worker.WorkerGroup) groups.add(worker.WorkerGroup)
      })
      return Array.from(groups).sort()
    } else {
      const groups = new Set<string>()
      clients.forEach(client => {
        if (client.GroupTag) groups.add(client.GroupTag)
      })
      return Array.from(groups).sort()
    }
  }, [formData.targetType, workers, clients])

  // Get entities in selected group
  const entitiesInGroup = useMemo(() => {
    if (!formData.groupTag) return []
    
    if (formData.targetType === 'worker') {
      return workers.filter(worker => worker.WorkerGroup === formData.groupTag)
    } else {
      return clients.filter(client => client.GroupTag === formData.groupTag)
    }
  }, [formData.targetType, formData.groupTag, workers, clients])

  // Calculate common slots for workers in the group
  const commonSlotsAnalysis = useMemo(() => {
    if (formData.targetType !== 'worker' || entitiesInGroup.length === 0) {
      return { commonSlots: [], maxPossible: 0 }
    }

    const workerSlots = entitiesInGroup.map(entity => {
      const worker = entity as any // Type assertion since we know it's a worker when targetType is 'worker'
      try {
        const slots = worker.AvailableSlots
        if (typeof slots === 'number') {
          return [slots]
        }
        return JSON.parse(slots || '[]') as number[]
      } catch {
        return []
      }
    })

    if (workerSlots.length === 0) {
      return { commonSlots: [], maxPossible: 0 }
    }

    // Find slots that are common to ALL workers in the group
    const commonSlots = workerSlots[0].filter(slot =>
      workerSlots.every(workerSlot => workerSlot.includes(slot))
    )

    return {
      commonSlots: commonSlots.sort((a, b) => a - b),
      maxPossible: commonSlots.length
    }
  }, [formData.targetType, entitiesInGroup])

  // Validation
  const validateForm = (): boolean => {
    const newErrors: string[] = []
    
    if (!formData.name.trim()) {
      newErrors.push('Rule name is required')
    }
    
    if (!formData.groupTag) {
      newErrors.push('Group selection is required')
    }
    
    if (formData.minCommonSlots < 1) {
      newErrors.push('Minimum common slots must be at least 1')
    }
    
    if (entitiesInGroup.length === 0) {
      newErrors.push(`No ${formData.targetType}s found in selected group`)
    }
    
    if (formData.targetType === 'worker' && formData.minCommonSlots > commonSlotsAnalysis.maxPossible) {
      newErrors.push(`Requested ${formData.minCommonSlots} common slots, but only ${commonSlotsAnalysis.maxPossible} are available in this group`)
    }
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const rule: Omit<SlotRestrictionRule, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'slotRestriction',
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      isActive: formData.isActive,
      targetType: formData.targetType,
      groupTag: formData.groupTag,
      minCommonSlots: formData.minCommonSlots
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
          <Users className="h-5 w-5" />
          {existingRule ? 'Edit Slot Restriction Rule' : 'Create Slot Restriction Rule'}
        </CardTitle>
        <CardDescription>
          Ensure groups have minimum common available slots for coordinated scheduling
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
              placeholder="e.g., Senior Team Coordination"
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
              placeholder="Optional description of why this slot restriction is needed"
              rows={2}
            />
          </div>

          {/* Target Type Selection */}
          <div className="space-y-3">
            <Label>Target Entity Type *</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="targetWorker"
                  checked={formData.targetType === 'worker'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({ 
                        ...prev, 
                        targetType: 'worker',
                        groupTag: '' // Reset group when changing type
                      }))
                    }
                  }}
                />
                <Label htmlFor="targetWorker" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Worker Groups
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="targetClient"
                  checked={formData.targetType === 'client'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({ 
                        ...prev, 
                        targetType: 'client',
                        groupTag: '' // Reset group when changing type
                      }))
                    }
                  }}
                />
                <Label htmlFor="targetClient" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Client Groups
                </Label>
              </div>
            </div>
          </div>

          {/* Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="groupSelect">{formData.targetType === 'worker' ? 'Worker Group' : 'Client Group'} *</Label>
            <Select
              value={formData.groupTag}
              onValueChange={(value) => setFormData(prev => ({ ...prev, groupTag: value }))}
            >
              <SelectTrigger className={errors.some(e => e.includes('Group')) ? 'border-red-500' : ''}>
                <SelectValue placeholder={`Select a ${formData.targetType} group`} />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.length === 0 ? (
                  <SelectItem value="" disabled>
                    No {formData.targetType} groups available
                  </SelectItem>
                ) : (
                  availableGroups.map(group => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Group Analysis */}
          {formData.groupTag && entitiesInGroup.length > 0 && (
            <div className="space-y-3">
              <Label>Group Analysis</Label>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {formData.targetType === 'worker' ? <Users className="h-4 w-4" /> : <Building className="h-4 w-4" />}
                  <span className="font-medium">
                    {entitiesInGroup.length} {formData.targetType}(s) in "{formData.groupTag}"
                  </span>
                </div>
                
                <div className="space-y-2">
                  {entitiesInGroup.slice(0, 5).map(entity => (
                    <div key={formData.targetType === 'worker' ? (entity as any).WorkerID : (entity as any).ClientID} 
                         className="text-sm">
                      <span className="font-medium">
                        {formData.targetType === 'worker' ? (entity as any).WorkerID : (entity as any).ClientID}
                      </span>
                      {formData.targetType === 'worker' && (entity as any).AvailableSlots && (
                        <span className="text-gray-600 ml-2">
                          Slots: {typeof (entity as any).AvailableSlots === 'number' 
                            ? (entity as any).AvailableSlots 
                            : JSON.stringify((entity as any).AvailableSlots)}
                        </span>
                      )}
                    </div>
                  ))}
                  {entitiesInGroup.length > 5 && (
                    <div className="text-sm text-gray-500">
                      ... and {entitiesInGroup.length - 5} more
                    </div>
                  )}
                </div>

                {/* Common slots analysis for workers */}
                {formData.targetType === 'worker' && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm font-medium mb-1">Common Available Slots:</div>
                    {commonSlotsAnalysis.commonSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {commonSlotsAnalysis.commonSlots.map(slot => (
                          <Badge key={slot} variant="outline" className="text-xs">
                            Slot {slot}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-red-600">No common slots available</span>
                    )}
                    <div className="text-xs text-gray-600 mt-1">
                      Maximum possible common slots: {commonSlotsAnalysis.maxPossible}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Minimum Common Slots */}
          <div className="space-y-2">
            <Label htmlFor="minSlots">Minimum Common Slots *</Label>
            <div className="flex items-center gap-3">
              <Input
                id="minSlots"
                type="number"
                min="1"
                max={formData.targetType === 'worker' ? commonSlotsAnalysis.maxPossible || 10 : 10}
                value={formData.minCommonSlots}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  minCommonSlots: parseInt(e.target.value) || 1 
                }))}
                className={`w-32 ${errors.some(e => e.includes('slots')) ? 'border-red-500' : ''}`}
              />
              <span className="text-sm text-gray-600">
                {formData.targetType === 'worker' 
                  ? `(Max available: ${commonSlotsAnalysis.maxPossible})`
                  : 'slots that must be available to all group members'
                }
              </span>
            </div>
          </div>

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
                disabled={!formData.groupTag}
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
        {showPreview && formData.groupTag && (
          <div className="border-t pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Rule Preview</h4>
              <p className="text-sm text-amber-700 mb-3">
                This rule will enforce the following constraint:
              </p>
              <div className="bg-white p-3 rounded border">
                <code className="text-sm">
                  {`{ type: "slotRestriction", groupTag: "${formData.groupTag}", minCommonSlots: ${formData.minCommonSlots} }`}
                </code>
              </div>
              <div className="mt-3 text-xs text-amber-600">
                <p>• All {formData.targetType}s in group "{formData.groupTag}" must have at least {formData.minCommonSlots} slots in common</p>
                <p>• Affects {entitiesInGroup.length} {formData.targetType}(s) in total</p>
                {formData.targetType === 'worker' && (
                  <p>• Currently {commonSlotsAnalysis.maxPossible} common slots available: [{commonSlotsAnalysis.commonSlots.join(', ')}]</p>
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
interface QuickSlotRestrictionRuleProps {
  onRuleCreated: () => void
}

export function QuickSlotRestrictionRule({ onRuleCreated }: QuickSlotRestrictionRuleProps) {
  const { clients, workers } = useDataStoreSelectors()
  const { addRule } = useRulesStore()
  const [showForm, setShowForm] = useState(false)

  const handleSave = (ruleData: Omit<SlotRestrictionRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    addRule(ruleData)
    setShowForm(false)
    onRuleCreated()
  }

  const hasGroups = workers.some(w => w.WorkerGroup) || clients.some(c => c.GroupTag)

  if (!showForm) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Slot Restriction Rule
        </h3>
        <p className="text-gray-600 mb-4">
          Choose ClientGroup/WorkerGroup + minimum common slots
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Example: {`{ groupTag: "GroupA", minCommonSlots: 3 }`}
        </p>
        <Button 
          onClick={() => setShowForm(true)}
          disabled={!hasGroups}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Slot Restriction
        </Button>
        {!hasGroups && (
          <p className="text-xs text-amber-600 mt-2">
            Need groups with GroupTag/WorkerGroup to create slot restrictions
          </p>
        )}
      </div>
    )
  }

  return (
    <SlotRestrictionRuleForm
      onSave={handleSave}
      onCancel={() => setShowForm(false)}
    />
  )
}