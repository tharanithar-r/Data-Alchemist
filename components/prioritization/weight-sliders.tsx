'use client'

import { RotateCcw, Info, TrendingUp, Users, Target, Zap, AlertTriangle } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useRulesStore } from '@/lib/stores/rules-store'

interface WeightSliderProps {
  label: string
  description: string
  value: number
  onChange: (value: number) => void
  icon: React.ComponentType<{ className?: string }>
  color: string
}

function WeightSlider({ label, description, value, onChange, icon: Icon, color }: WeightSliderProps) {
  const percentage = Math.round((value / 10) * 100)
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <Label className="font-medium">{label}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {value}/10
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {percentage}%
          </Badge>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={`w-full h-3 rounded-lg appearance-none cursor-pointer slider ${color.replace('text-', 'accent-')}`}
          style={{
            background: `linear-gradient(to right, ${getSliderColor(color)} 0%, ${getSliderColor(color)} ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
          }}
        />
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>Low Priority</span>
          <span>Medium Priority</span>
          <span>High Priority</span>
        </div>
      </div>
      
      {/* Visual impact indicator */}
      <div className="flex items-center gap-1 text-xs">
        <div className="flex gap-1">
          {[...Array(Math.ceil(value / 2))].map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${getImpactColor(value)}`} />
          ))}
          {[...Array(5 - Math.ceil(value / 2))].map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-gray-200" />
          ))}
        </div>
        <span className="text-gray-500 ml-2">{getImpactLabel(value)}</span>
      </div>
    </div>
  )
}

function getSliderColor(colorClass: string): string {
  const colorMap: Record<string, string> = {
    'text-blue-600': '#2563eb',
    'text-green-600': '#16a34a',
    'text-purple-600': '#9333ea',
    'text-orange-600': '#ea580c',
    'text-red-600': '#dc2626'
  }
  return colorMap[colorClass] || '#6b7280'
}

function getImpactColor(value: number): string {
  if (value >= 8) return 'bg-red-500'
  if (value >= 6) return 'bg-orange-500'
  if (value >= 4) return 'bg-yellow-500'
  if (value >= 2) return 'bg-green-500'
  return 'bg-gray-400'
}

function getImpactLabel(value: number): string {
  if (value >= 8) return 'Critical Impact'
  if (value >= 6) return 'High Impact'
  if (value >= 4) return 'Medium Impact'
  if (value >= 2) return 'Low Impact'
  return 'Minimal Impact'
}

const WEIGHT_CRITERIA = [
  {
    key: 'fairness' as const,
    label: 'Fairness',
    description: 'Ensure equal distribution of work and opportunities across all workers and clients',
    icon: Users,
    color: 'text-blue-600'
  },
  {
    key: 'priorityLevel' as const,
    label: 'Priority Level',
    description: 'Prioritize high-priority clients and urgent tasks in allocation decisions',
    icon: TrendingUp,
    color: 'text-green-600'
  },
  {
    key: 'taskFulfillment' as const,
    label: 'Task Fulfillment',
    description: 'Maximize the number of requested tasks that get completed successfully',
    icon: Target,
    color: 'text-purple-600'
  },
  {
    key: 'workerUtilization' as const,
    label: 'Worker Utilization',
    description: 'Optimize worker capacity usage to minimize idle time and maximize efficiency',
    icon: Zap,
    color: 'text-orange-600'
  },
  {
    key: 'constraints' as const,
    label: 'Constraints',
    description: 'Strictly enforce business rules and constraints over other optimization goals',
    icon: AlertTriangle,
    color: 'text-red-600'
  }
]

const PRESET_PROFILES = [
  {
    name: 'Balanced',
    description: 'Equal importance to all criteria',
    weights: { fairness: 5, priorityLevel: 5, taskFulfillment: 5, workerUtilization: 5, constraints: 5 }
  },
  {
    name: 'Maximize Fulfillment',
    description: 'Focus on completing as many tasks as possible',
    weights: { fairness: 3, priorityLevel: 6, taskFulfillment: 9, workerUtilization: 7, constraints: 8 }
  },
  {
    name: 'Fair Distribution',
    description: 'Emphasize equal opportunities and fair workload distribution',
    weights: { fairness: 9, priorityLevel: 4, taskFulfillment: 6, workerUtilization: 6, constraints: 7 }
  },
  {
    name: 'Minimize Workload',
    description: 'Optimize for efficiency and minimal worker stress',
    weights: { fairness: 6, priorityLevel: 5, taskFulfillment: 4, workerUtilization: 9, constraints: 8 }
  },
  {
    name: 'Priority-Focused',
    description: 'Heavily prioritize high-importance clients and tasks',
    weights: { fairness: 4, priorityLevel: 9, taskFulfillment: 7, workerUtilization: 5, constraints: 8 }
  },
  {
    name: 'Constraint-Strict',
    description: 'Enforce all business rules strictly, even at efficiency cost',
    weights: { fairness: 5, priorityLevel: 6, taskFulfillment: 6, workerUtilization: 4, constraints: 10 }
  }
]

export function WeightSliders() {
  const { 
    priorityWeights, 
    setPriorityWeights, 
    presetProfile, 
    setPresetProfile,
    rules 
  } = useRulesStore()

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Calculate total weight and percentages
  const totalWeight = useMemo(() => {
    return Object.values(priorityWeights).reduce((sum, weight) => sum + weight, 0)
  }, [priorityWeights])

  const weightPercentages = useMemo(() => {
    if (totalWeight === 0) return {}
    return Object.fromEntries(
      Object.entries(priorityWeights).map(([key, value]) => [
        key,
        Math.round((value / totalWeight) * 100)
      ])
    )
  }, [priorityWeights, totalWeight])

  // Analyze impact of current weights
  const impactAnalysis = useMemo(() => {
    const analysis = {
      dominant: '',
      balanced: false,
      extreme: false,
      recommendations: [] as string[]
    }

    const weights = Object.entries(priorityWeights)
    const maxWeight = Math.max(...Object.values(priorityWeights))
    const minWeight = Math.min(...Object.values(priorityWeights))
    
    // Find dominant criteria
    const dominantCriteria = weights.filter(([_, weight]) => weight === maxWeight)
    if (dominantCriteria.length === 1) {
      const criteriaName = WEIGHT_CRITERIA.find(c => c.key === dominantCriteria[0][0])?.label
      analysis.dominant = criteriaName || ''
    }

    // Check if balanced
    analysis.balanced = maxWeight - minWeight <= 2

    // Check for extreme values
    analysis.extreme = maxWeight >= 9 || minWeight <= 1

    // Generate recommendations
    if (analysis.extreme) {
      analysis.recommendations.push('Consider moderating extreme values for more balanced allocation')
    }
    
    if (priorityWeights.constraints < 6 && rules.length > 0) {
      analysis.recommendations.push('With active business rules, consider increasing Constraints weight')
    }
    
    if (priorityWeights.fairness < 4) {
      analysis.recommendations.push('Low fairness weight may lead to uneven workload distribution')
    }

    return analysis
  }, [priorityWeights, rules.length])

  const handleWeightChange = (key: keyof typeof priorityWeights, value: number) => {
    const newWeights = { ...priorityWeights, [key]: value }
    setPriorityWeights(newWeights)
    setHasUnsavedChanges(true)
    
    // Auto-save after 1 second of no changes
    setTimeout(() => setHasUnsavedChanges(false), 1000)
  }

  const applyPreset = (presetName: string) => {
    const preset = PRESET_PROFILES.find(p => p.name === presetName)
    if (preset) {
      setPriorityWeights(preset.weights)
      setPresetProfile(presetName as any)
      setHasUnsavedChanges(false)
    }
  }

  const resetToDefaults = () => {
    const defaultWeights = { fairness: 5, priorityLevel: 5, taskFulfillment: 5, workerUtilization: 5, constraints: 5 }
    setPriorityWeights(defaultWeights)
    setPresetProfile('custom')
    setHasUnsavedChanges(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Priority Weights</h2>
          <p className="text-gray-600 mt-1">
            Configure the relative importance of different allocation criteria
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Auto-saving...
            </Badge>
          )}
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weight Sliders */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Criteria Weights
              </CardTitle>
              <CardDescription>
                Adjust the importance of each criterion for resource allocation decisions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {WEIGHT_CRITERIA.map((criteria) => (
                <WeightSlider
                  key={criteria.key}
                  label={criteria.label}
                  description={criteria.description}
                  value={priorityWeights[criteria.key]}
                  onChange={(value) => handleWeightChange(criteria.key, value)}
                  icon={criteria.icon}
                  color={criteria.color}
                />
              ))}
            </CardContent>
          </Card>

          {/* Preset Profiles */}
          <Card>
            <CardHeader>
              <CardTitle>Preset Profiles</CardTitle>
              <CardDescription>
                Quick configurations for common allocation strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRESET_PROFILES.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={presetProfile === preset.name ? "default" : "outline"}
                    onClick={() => applyPreset(preset.name)}
                    className="h-auto p-4 text-left justify-start"
                  >
                    <div>
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {preset.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis and Preview */}
        <div className="space-y-6">
          {/* Weight Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Weight Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {WEIGHT_CRITERIA.map((criteria) => (
                  <div key={criteria.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <criteria.icon className={`h-4 w-4 ${criteria.color}`} />
                      <span className="text-sm font-medium">{criteria.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm">{priorityWeights[criteria.key]}</div>
                      <Badge variant="secondary" className="text-xs">
                        {weightPercentages[criteria.key] || 0}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Weight:</span>
                  <Badge variant="outline">{totalWeight}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impact Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Impact Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {impactAnalysis.dominant && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-800 text-sm">Dominant Criteria</div>
                  <div className="text-blue-700 text-sm">{impactAnalysis.dominant}</div>
                </div>
              )}
              
              {impactAnalysis.balanced && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800 text-sm">Balanced Configuration</div>
                  <div className="text-green-700 text-sm">All criteria have similar importance</div>
                </div>
              )}
              
              {impactAnalysis.extreme && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Extreme weight values detected. This may lead to heavily skewed allocation decisions.
                  </AlertDescription>
                </Alert>
              )}

              {impactAnalysis.recommendations.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-sm">Recommendations:</div>
                  <ul className="space-y-1">
                    {impactAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Rules Info */}
          {rules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>{rules.filter(r => r.isActive).length} of {rules.length} rules are active</p>
                  <p className="mt-2">Higher constraint weights will strictly enforce these rules during allocation.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Weight Configuration Preview</CardTitle>
          <CardDescription>
            This configuration will guide the downstream allocation optimizer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-mono">
              <div className="text-gray-600 mb-2">Priority Weights Configuration:</div>
              <code className="text-sm">
                {JSON.stringify(priorityWeights, null, 2)}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}