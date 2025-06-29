'use client'

import { BookOpen, Target, Users, Zap, CheckCircle, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRulesStore, PriorityWeights } from '@/lib/stores/rules-store'

interface PresetProfile {
  id: string
  name: string
  description: string
  detailedDescription: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  weights: PriorityWeights
  useCase: string
  benefits: string[]
  considerations: string[]
}

const PRESET_PROFILES: PresetProfile[] = [
  {
    id: 'maximize-fulfillment',
    name: 'Maximize Fulfillment',
    description: 'Focus on completing as many requested tasks as possible',
    detailedDescription: 'Prioritizes task completion and client satisfaction. Best for organizations where meeting client requests is the primary goal.',
    icon: Target,
    color: 'text-green-600',
    weights: {
      taskFulfillment: 9,
      priorityLevel: 7,
      constraints: 8,
      workerUtilization: 5,
      fairness: 4
    },
    useCase: 'Client-focused organizations, service delivery teams',
    benefits: [
      'Maximizes client satisfaction',
      'High task completion rates',
      'Clear priority-based allocation',
      'Strong rule enforcement'
    ],
    considerations: [
      'May lead to uneven worker distribution',
      'Lower emphasis on work-life balance',
      'Potential for worker overload'
    ]
  },
  {
    id: 'fair-distribution',
    name: 'Fair Distribution',
    description: 'Emphasize equal opportunities and balanced workload distribution',
    detailedDescription: 'Ensures equitable treatment of all workers and clients. Ideal for organizations prioritizing workplace equity and balanced resource allocation.',
    icon: Users,
    color: 'text-blue-600',
    weights: {
      fairness: 9,
      workerUtilization: 6,
      taskFulfillment: 6,
      constraints: 7,
      priorityLevel: 4
    },
    useCase: 'HR-conscious organizations, team collaboration environments',
    benefits: [
      'Equal opportunities for all workers',
      'Balanced workload distribution',
      'Improved team morale',
      'Sustainable work practices'
    ],
    considerations: [
      'May not prioritize urgent tasks',
      'Could reduce overall efficiency',
      'Less focus on client priorities'
    ]
  },
  {
    id: 'minimize-workload',
    name: 'Minimize Workload',
    description: 'Optimize for efficiency and worker well-being',
    detailedDescription: 'Focuses on maximizing worker efficiency while maintaining sustainable workloads. Perfect for organizations emphasizing productivity and employee wellness.',
    icon: Zap,
    color: 'text-orange-600',
    weights: {
      workerUtilization: 9,
      fairness: 7,
      constraints: 8,
      taskFulfillment: 5,
      priorityLevel: 4
    },
    useCase: 'Efficiency-focused teams, sustainable work environments',
    benefits: [
      'Optimal resource utilization',
      'Reduced worker stress',
      'Higher productivity per hour',
      'Better work-life balance'
    ],
    considerations: [
      'May delay some client requests',
      'Lower priority responsiveness',
      'Could impact urgent deliverables'
    ]
  },
  {
    id: 'constraint-strict',
    name: 'Constraint Strict',
    description: 'Strictly enforce all business rules and constraints',
    detailedDescription: 'Prioritizes rule compliance above all other factors. Essential for highly regulated environments or complex operational constraints.',
    icon: AlertTriangle,
    color: 'text-red-600',
    weights: {
      constraints: 10,
      fairness: 6,
      priorityLevel: 6,
      taskFulfillment: 5,
      workerUtilization: 4
    },
    useCase: 'Regulated industries, complex compliance requirements',
    benefits: [
      'Zero rule violations',
      'Predictable outcomes',
      'Compliance guaranteed',
      'Risk mitigation'
    ],
    considerations: [
      'May reduce flexibility',
      'Could limit optimization',
      'Potential efficiency trade-offs'
    ]
  },
  {
    id: 'balanced-approach',
    name: 'Balanced Approach',
    description: 'Equal weight to all criteria for comprehensive optimization',
    detailedDescription: 'Provides moderate emphasis on all factors. Good starting point for organizations exploring different allocation strategies.',
    icon: BookOpen,
    color: 'text-purple-600',
    weights: {
      fairness: 6,
      priorityLevel: 6,
      taskFulfillment: 6,
      workerUtilization: 6,
      constraints: 6
    },
    useCase: 'General purpose, exploratory analysis, mixed priorities',
    benefits: [
      'No extreme biases',
      'Considers all factors',
      'Safe starting point',
      'Easy to understand'
    ],
    considerations: [
      'May lack focus',
      'Could be suboptimal for specific needs',
      'Less specialized outcomes'
    ]
  },
  {
    id: 'priority-driven',
    name: 'Priority Driven',
    description: 'Heavily emphasize client priority levels and urgent tasks',
    detailedDescription: 'Makes priority level the dominant factor in allocation decisions. Ideal for environments with clear hierarchical importance.',
    icon: TrendingUp,
    color: 'text-indigo-600',
    weights: {
      priorityLevel: 9,
      taskFulfillment: 7,
      constraints: 6,
      fairness: 4,
      workerUtilization: 4
    },
    useCase: 'Executive support, crisis management, VIP client services',
    benefits: [
      'Clear priority hierarchy',
      'VIP client satisfaction',
      'Fast urgent response',
      'Executive alignment'
    ],
    considerations: [
      'May neglect lower priority items',
      'Uneven worker distribution',
      'Potential fairness issues'
    ]
  }
]

interface PresetCardProps {
  preset: PresetProfile
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
}

function PresetCard({ preset, isSelected, onSelect, onPreview }: PresetCardProps) {
  return (
    <Card className={`cursor-pointer transition-all duration-200 ${
      isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'hover:shadow-lg hover:border-gray-300'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <preset.icon className={`h-6 w-6 ${preset.color}`} />
            <div>
              <CardTitle className="text-lg">{preset.name}</CardTitle>
              <CardDescription className="text-sm">
                {preset.description}
              </CardDescription>
            </div>
          </div>
          {isSelected && (
            <CheckCircle className="h-5 w-5 text-blue-600" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{preset.detailedDescription}</p>
        
        {/* Weight Preview */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Weight Distribution:</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(preset.weights).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="font-medium">{value}/10</span>
              </div>
            ))}
          </div>
        </div>

        {/* Use Case */}
        <div className="p-2 bg-gray-50 rounded text-xs">
          <span className="font-medium">Best for: </span>
          {preset.useCase}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onPreview()
            }}
            className="flex-1 text-xs"
          >
            Preview
          </Button>
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className="flex-1 text-xs"
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function PresetProfiles() {
  const { 
    priorityWeights,
    setPriorityWeights, 
    setPresetProfile,
    setPriorityMethod,
    rules 
  } = useRulesStore()

  const [previewPreset, setPreviewPreset] = useState<PresetProfile | null>(null)

  // Find current preset or detect custom
  const currentPreset = useMemo(() => {
    return PRESET_PROFILES.find(preset => 
      JSON.stringify(preset.weights) === JSON.stringify(priorityWeights)
    )
  }, [priorityWeights])

  const isCustom = !currentPreset

  // Apply preset
  const applyPreset = (preset: PresetProfile) => {
    setPriorityWeights(preset.weights)
    setPresetProfile(preset.id as any)
    setPriorityMethod('presets')
    setPreviewPreset(null)
  }

  // Preview preset
  const previewPresetHandler = (preset: PresetProfile) => {
    setPreviewPreset(preset)
  }

  const clearPreview = () => {
    setPreviewPreset(null)
  }

  // Compare weights
  const compareWeights = (weights1: PriorityWeights, weights2: PriorityWeights) => {
    const differences: { key: string; diff: number; direction: 'higher' | 'lower' }[] = []
    
    Object.keys(weights1).forEach(key => {
      const k = key as keyof PriorityWeights
      const diff = weights1[k] - weights2[k]
      if (Math.abs(diff) >= 1) {
        differences.push({
          key: k,
          diff: Math.abs(diff),
          direction: diff > 0 ? 'higher' : 'lower'
        })
      }
    })
    
    return differences
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Preset Profiles</h2>
          <p className="text-gray-600 mt-1">
            Choose from pre-configured priority strategies designed for common scenarios
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isCustom && (
            <Badge variant="outline" className="text-purple-600 border-purple-300">
              Custom Configuration
            </Badge>
          )}
          {currentPreset && (
            <Badge variant="default" className="flex items-center gap-1">
              <currentPreset.icon className="h-3 w-3" />
              {currentPreset.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Current Status */}
      {currentPreset && (
        <Alert>
          <currentPreset.icon className="h-4 w-4" />
          <AlertDescription>
            Currently using <strong>{currentPreset.name}</strong> preset profile. 
            This configuration {currentPreset.description.toLowerCase()}.
          </AlertDescription>
        </Alert>
      )}

      {/* Preset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRESET_PROFILES.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isSelected={currentPreset?.id === preset.id}
            onSelect={() => applyPreset(preset)}
            onPreview={() => previewPresetHandler(preset)}
          />
        ))}
      </div>

      {/* Preview Panel */}
      {previewPreset && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <previewPreset.icon className="h-5 w-5" />
                Previewing: {previewPreset.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearPreview}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Benefits & Considerations */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-green-800 mb-2">Benefits:</h4>
                  <ul className="space-y-1 text-sm text-green-700">
                    {previewPreset.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-amber-800 mb-2">Considerations:</h4>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {previewPreset.considerations.map((consideration, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {consideration}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Weight Comparison */}
              <div className="space-y-4">
                <h4 className="font-medium text-blue-800">Weight Changes:</h4>
                {currentPreset ? (
                  <div className="space-y-2">
                    {compareWeights(previewPreset.weights, currentPreset.weights).map(({ key, direction }) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{currentPreset.weights[key as keyof PriorityWeights]}</span>
                          <ArrowRight className={`h-3 w-3 ${direction === 'higher' ? 'text-green-600' : 'text-red-600'}`} />
                          <span className={`font-medium ${direction === 'higher' ? 'text-green-600' : 'text-red-600'}`}>
                            {previewPreset.weights[key as keyof PriorityWeights]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(previewPreset.weights).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium">{value}/10</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-blue-200">
              <Button variant="outline" onClick={clearPreview}>
                Cancel
              </Button>
              <Button onClick={() => applyPreset(previewPreset)}>
                Apply This Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules Context */}
      {rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rules Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <p>{rules.filter(r => r.isActive).length} active business rules</p>
              <p className="mt-2">
                <strong>Recommendation:</strong> Consider "Constraint Strict" profile if you have complex business rules that must be followed precisely.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Selection Guide</CardTitle>
          <CardDescription>
            Choose the profile that best matches your organization's priorities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">When to Use Each Profile:</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <strong>Maximize Fulfillment:</strong> Client deliverables are top priority
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <strong>Fair Distribution:</strong> Team equity and balance matter most
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div>
                    <strong>Minimize Workload:</strong> Efficiency and sustainability focus
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Profile Customization:</h4>
              <div className="space-y-2 text-gray-600">
                <p>• Start with a preset that closely matches your needs</p>
                <p>• Use Weight Sliders to fine-tune specific criteria</p>
                <p>• Switch between profiles to compare outcomes</p>
                <p>• Custom configurations are saved automatically</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}