'use client'

import { Plus, TrendingDown, AlertCircle, Users } from 'lucide-react'
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
import { LoadLimitRule } from '@/lib/stores/rules-store'

interface LoadLimitRuleFormProps {
  existingRule?: LoadLimitRule
  onSave: (rule: Omit<LoadLimitRule, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

export function LoadLimitRuleForm({ existingRule, onSave, onCancel }: LoadLimitRuleFormProps) {
  const { workers } = useDataStoreSelectors()
  
  const [formData, setFormData] = useState({
    name: existingRule?.name || '',
    description: existingRule?.description || '',
    isActive: existingRule?.isActive ?? true,
    workerGroup: existingRule?.workerGroup || '',
    maxSlotsPerPhase: existingRule?.maxSlotsPerPhase || 1
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Get available worker groups
  const availableWorkerGroups = useMemo(() => {
    const groups = new Set<string>()
    workers.forEach(worker => {
      if (worker.WorkerGroup) groups.add(worker.WorkerGroup)
    })
    return Array.from(groups).sort()
  }, [workers])

  // Get workers in selected group
  const workersInGroup = useMemo(() => {
    if (!formData.workerGroup) return []
    return workers.filter(worker => worker.WorkerGroup === formData.workerGroup)
  }, [formData.workerGroup, workers])

  // Analyze current load capacity in the group
  const loadAnalysis = useMemo(() => {
    if (workersInGroup.length === 0) {
      return {
        currentLoads: [],
        averageLoad: 0,
        maxLoad: 0,
        minLoad: 0,
        overloadedWorkers: [],
        underloadedWorkers: []
      }
    }

    const currentLoads = workersInGroup.map(worker => ({
      workerId: worker.WorkerID,
      workerName: worker.WorkerName,
      currentLoad: worker.MaxLoadPerPhase || 0
    }))

    const loads = currentLoads.map(w => w.currentLoad)
    const averageLoad = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : 0
    const maxLoad = Math.max(...loads, 0)
    const minLoad = Math.min(...loads, 0)

    const overloadedWorkers = currentLoads.filter(w => w.currentLoad > formData.maxSlotsPerPhase)
    const underloadedWorkers = currentLoads.filter(w => w.currentLoad < formData.maxSlotsPerPhase)

    return {
      currentLoads,
      averageLoad: Math.round(averageLoad * 10) / 10,
      maxLoad,
      minLoad,
      overloadedWorkers,
      underloadedWorkers
    }
  }, [workersInGroup, formData.maxSlotsPerPhase])

  // Validation
  const validateForm = (): boolean => {
    const newErrors: string[] = []
    
    if (!formData.name.trim()) {
      newErrors.push('Rule name is required')
    }
    
    if (!formData.workerGroup) {
      newErrors.push('Worker group selection is required')
    }
    
    if (formData.maxSlotsPerPhase < 1) {
      newErrors.push('Maximum slots per phase must be at least 1')
    }
    
    if (workersInGroup.length === 0) {
      newErrors.push('No workers found in selected group')
    }
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const rule: Omit<LoadLimitRule, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'loadLimit',
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      isActive: formData.isActive,
      workerGroup: formData.workerGroup,
      maxSlotsPerPhase: formData.maxSlotsPerPhase
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
          <TrendingDown className="h-5 w-5" />
          {existingRule ? 'Edit Load Limit Rule' : 'Create Load Limit Rule'}
        </CardTitle>
        <CardDescription>
          Set maximum workload limits for worker groups to prevent overallocation
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
              placeholder="e.g., Senior Developer Load Limit"
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
              placeholder="Optional description of why this load limit is needed"
              rows={2}
            />
          </div>

          {/* Worker Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="workerGroupSelect">Worker Group *</Label>
            <Select
              value={formData.workerGroup}
              onValueChange={(value) => setFormData(prev => ({ ...prev, workerGroup: value }))}
            >
              <SelectTrigger className={errors.some(e => e.includes('group')) ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a worker group" />
              </SelectTrigger>
              <SelectContent>
                {availableWorkerGroups.length === 0 ? (
                  <SelectItem value="" disabled>
                    No worker groups available
                  </SelectItem>
                ) : (
                  availableWorkerGroups.map(group => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Worker Group Analysis */}
          {formData.workerGroup && workersInGroup.length > 0 && (
            <div className="space-y-3">
              <Label>Worker Group Analysis</Label>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">
                    {workersInGroup.length} workers in "{formData.workerGroup}"
                  </span>
                </div>
                
                {/* Load Statistics */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Current Load Statistics</div>
                    <div className="text-sm">
                      <div>Average: {loadAnalysis.averageLoad} slots/phase</div>
                      <div>Range: {loadAnalysis.minLoad} - {loadAnalysis.maxLoad} slots/phase</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Impact Analysis</div>
                    <div className="text-sm">
                      <div className="text-red-600">
                        {loadAnalysis.overloadedWorkers.length} workers exceed new limit
                      </div>
                      <div className="text-green-600">
                        {loadAnalysis.underloadedWorkers.length} workers under new limit
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workers List */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Workers in Group:</div>
                  <div className="grid gap-2 max-h-32 overflow-y-auto">
                    {loadAnalysis.currentLoads.slice(0, 8).map(worker => (
                      <div key={worker.workerId} className="flex justify-between items-center text-sm p-2 bg-white rounded border">
                        <span className="font-medium">{worker.workerId}</span>
                        <div className="flex items-center gap-2">
                          <span>{worker.currentLoad} slots/phase</span>
                          {worker.currentLoad > formData.maxSlotsPerPhase && (
                            <Badge variant="destructive" className="text-xs">
                              Exceeds limit
                            </Badge>
                          )}
                          {worker.currentLoad <= formData.maxSlotsPerPhase && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              Within limit
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {workersInGroup.length > 8 && (
                      <div className="text-xs text-gray-500 text-center">
                        ... and {workersInGroup.length - 8} more workers
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Maximum Slots Per Phase */}
          <div className="space-y-2">
            <Label htmlFor="maxSlots">Maximum Slots Per Phase *</Label>
            <div className="flex items-center gap-3">
              <Input
                id="maxSlots"
                type="number"
                min="1"
                max="20"
                value={formData.maxSlotsPerPhase}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  maxSlotsPerPhase: parseInt(e.target.value) || 1 
                }))}
                className={`w-32 ${errors.some(e => e.includes('slots')) ? 'border-red-500' : ''}`}
              />
              <span className="text-sm text-gray-600">
                slots per phase per worker
              </span>
            </div>
            
            {/* Load impact warning */}
            {loadAnalysis.overloadedWorkers.length > 0 && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Impact:</strong> {loadAnalysis.overloadedWorkers.length} worker(s) currently exceed this limit 
                  (Current max: {loadAnalysis.maxLoad} slots/phase). They will be constrained to {formData.maxSlotsPerPhase} slots/phase.
                </AlertDescription>
              </Alert>
            )}
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
                disabled={!formData.workerGroup}
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
        {showPreview && formData.workerGroup && (
          <div className="border-t pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Rule Preview</h4>
              <p className="text-sm text-amber-700 mb-3">
                This rule will enforce the following load constraint:
              </p>
              <div className="bg-white p-3 rounded border">
                <code className="text-sm">
                  {`{ type: "loadLimit", workerGroup: "${formData.workerGroup}", maxSlotsPerPhase: ${formData.maxSlotsPerPhase} }`}
                </code>
              </div>
              <div className="mt-3 text-xs text-amber-600">
                <p>• All workers in group "{formData.workerGroup}" will be limited to max {formData.maxSlotsPerPhase} slots per phase</p>
                <p>• Affects {workersInGroup.length} workers in total</p>
                <p>• Current average load: {loadAnalysis.averageLoad} slots/phase</p>
                {loadAnalysis.overloadedWorkers.length > 0 && (
                  <p>• Will reduce load for {loadAnalysis.overloadedWorkers.length} worker(s) currently exceeding the limit</p>
                )}
                <p>• This constraint will be enforced during allocation optimization to prevent worker overload</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick create component for the main interface
interface QuickLoadLimitRuleProps {
  onRuleCreated: () => void
}

export function QuickLoadLimitRule({ onRuleCreated }: QuickLoadLimitRuleProps) {
  const { workers } = useDataStoreSelectors()
  const { addRule } = useRulesStore()
  const [showForm, setShowForm] = useState(false)

  const handleSave = (ruleData: Omit<LoadLimitRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    addRule(ruleData)
    setShowForm(false)
    onRuleCreated()
  }

  const hasWorkerGroups = workers.some(w => w.WorkerGroup)

  if (!showForm) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <TrendingDown className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Load Limit Rule
        </h3>
        <p className="text-gray-600 mb-4">
          Select WorkerGroup + maximum slots per phase
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Example: {`{ workerGroup: "GroupA", maxSlotsPerPhase: 2 }`}
        </p>
        <Button 
          onClick={() => setShowForm(true)}
          disabled={!hasWorkerGroups}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Load Limit
        </Button>
        {!hasWorkerGroups && (
          <p className="text-xs text-amber-600 mt-2">
            Need workers with WorkerGroup to create load limits
          </p>
        )}
      </div>
    )
  }

  return (
    <LoadLimitRuleForm
      onSave={handleSave}
      onCancel={() => setShowForm(false)}
    />
  )
}