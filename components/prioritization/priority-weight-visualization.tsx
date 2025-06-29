'use client'

import { BarChart3, TrendingUp, Users, Target, Zap, AlertTriangle, PieChart, Activity } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useRulesStore, PriorityWeights } from '@/lib/stores/rules-store'

interface CriteriaVisualization {
  key: keyof PriorityWeights
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

const CRITERIA_CONFIG: CriteriaVisualization[] = [
  {
    key: 'fairness',
    label: 'Fairness',
    description: 'Equal distribution of work and opportunities',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    key: 'priorityLevel',
    label: 'Priority Level',
    description: 'High-priority clients and urgent tasks',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    key: 'taskFulfillment',
    label: 'Task Fulfillment',
    description: 'Maximize completed tasks',
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    key: 'workerUtilization',
    label: 'Worker Utilization',
    description: 'Optimize worker capacity usage',
    icon: Zap,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    key: 'constraints',
    label: 'Constraints',
    description: 'Enforce business rules strictly',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  }
]

// Mock allocation scenarios for demonstration
const MOCK_SCENARIOS = [
  {
    id: 'high-priority-rush',
    name: 'High Priority Rush',
    description: 'Multiple VIP clients with urgent requests',
    clients: [
      { name: 'VIP Client A', priority: 5, tasks: 3, expectedOutcome: 'immediate' },
      { name: 'Standard Client B', priority: 2, tasks: 2, expectedOutcome: 'delayed' },
      { name: 'VIP Client C', priority: 5, tasks: 1, expectedOutcome: 'immediate' }
    ]
  },
  {
    id: 'balanced-workload',
    name: 'Balanced Workload',
    description: 'Normal day with mixed priority levels',
    clients: [
      { name: 'Client A', priority: 3, tasks: 2, expectedOutcome: 'scheduled' },
      { name: 'Client B', priority: 4, tasks: 1, expectedOutcome: 'priority' },
      { name: 'Client C', priority: 2, tasks: 3, expectedOutcome: 'queued' }
    ]
  },
  {
    id: 'worker-overload',
    name: 'Worker Overload',
    description: 'High demand, limited worker availability',
    clients: [
      { name: 'Client A', priority: 4, tasks: 4, expectedOutcome: 'partial' },
      { name: 'Client B', priority: 3, tasks: 3, expectedOutcome: 'delayed' },
      { name: 'Client C', priority: 5, tasks: 2, expectedOutcome: 'priority' }
    ]
  }
]

interface WeightBarProps {
  criteria: CriteriaVisualization
  weight: number
  percentage: number
}

function WeightBar({ criteria, weight, percentage }: WeightBarProps) {
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <criteria.icon className={`h-4 w-4 ${criteria.color}`} />
          <span className="text-sm font-medium">{criteria.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {weight}/10
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {percentage}%
          </Badge>
        </div>
      </div>
      <Progress 
        value={percentage} 
        className={`h-3 ${criteria.bgColor.replace('bg-', 'bg-opacity-20 bg-')}`}
      />
      <div className="text-xs text-gray-600">{criteria.description}</div>
    </div>
  )
}

interface AllocationPreviewProps {
  weights: PriorityWeights
}

function AllocationPreview({ weights }: AllocationPreviewProps) {
  // Calculate dominant criteria
  const dominantCriteria = useMemo(() => {
    const entries = Object.entries(weights) as [keyof PriorityWeights, number][]
    const sorted = entries.sort(([,a], [,b]) => b - a)
    return sorted[0][0]
  }, [weights])

  // Simulate allocation outcomes based on weights
  const simulateOutcome = (scenario: typeof MOCK_SCENARIOS[0]) => {
    const outcomes = scenario.clients.map(client => {
      let score = 0
      
      // Priority Level impact
      score += (client.priority / 5) * weights.priorityLevel * 0.2
      
      // Task Fulfillment impact
      score += (5 - client.tasks) * weights.taskFulfillment * 0.15
      
      // Fairness impact (simulated)
      score += weights.fairness * 0.15
      
      // Worker Utilization impact (simulated)
      score += weights.workerUtilization * 0.1
      
      // Constraints impact (simulated)
      score += weights.constraints * 0.1
      
      // Determine allocation likelihood
      let likelihood: 'high' | 'medium' | 'low'
      if (score > 7) likelihood = 'high'
      else if (score > 4) likelihood = 'medium'
      else likelihood = 'low'
      
      return {
        ...client,
        score: Math.round(score * 10) / 10,
        likelihood
      }
    })
    
    return outcomes.sort((a, b) => b.score - a.score)
  }

  const getLikelihoodColor = (likelihood: 'high' | 'medium' | 'low') => {
    switch (likelihood) {
      case 'high': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-red-600 bg-red-50'
    }
  }

  const getDominantStrategy = (criteria: keyof PriorityWeights) => {
    switch (criteria) {
      case 'priorityLevel': return 'VIP clients and urgent tasks will be prioritized'
      case 'fairness': return 'Work will be distributed evenly among workers'
      case 'taskFulfillment': return 'Focus on completing as many tasks as possible'
      case 'workerUtilization': return 'Optimize worker efficiency and capacity'
      case 'constraints': return 'Strict adherence to business rules'
    }
  }

  return (
    <div className="space-y-6">
      {/* Strategy Summary */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Current Strategy</h4>
        <p className="text-blue-700 text-sm">
          Your highest weighted criterion is <strong>{CRITERIA_CONFIG.find(c => c.key === dominantCriteria)?.label}</strong>. 
          {' '}{getDominantStrategy(dominantCriteria)}.
        </p>
      </div>

      {/* Scenario Simulations */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-800">Allocation Previews</h4>
        {MOCK_SCENARIOS.map(scenario => {
          const outcomes = simulateOutcome(scenario)
          
          return (
            <Card key={scenario.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{scenario.name}</CardTitle>
                <CardDescription className="text-xs">{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {outcomes.map((outcome, index) => (
                    <div key={outcome.name} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <div>
                          <div className="text-sm font-medium">{outcome.name}</div>
                          <div className="text-xs text-gray-600">
                            Priority {outcome.priority}/5 • {outcome.tasks} tasks
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Score: {outcome.score}
                        </Badge>
                        <Badge className={`text-xs ${getLikelihoodColor(outcome.likelihood)}`}>
                          {outcome.likelihood === 'high' ? 'Will allocate' : 
                           outcome.likelihood === 'medium' ? 'May allocate' : 'Unlikely'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function PriorityWeightVisualization() {
  const { 
    priorityWeights,
    priorityMethod,
    presetProfile,
    rules
  } = useRulesStore()

  // Calculate percentages and statistics
  const { totalWeight, maxWeight, percentages, balanceScore } = useMemo(() => {
    const total = Object.values(priorityWeights).reduce((sum, weight) => sum + weight, 0)
    const max = Math.max(...Object.values(priorityWeights))
    
    const percs = Object.fromEntries(
      Object.entries(priorityWeights).map(([key, value]) => [
        key,
        Math.round((value / total) * 100)
      ])
    ) as Record<keyof PriorityWeights, number>
    
    // Calculate balance score (lower = more balanced)
    const variance = Object.values(priorityWeights).reduce((acc, weight) => {
      const avg = total / 5
      return acc + Math.pow(weight - avg, 2)
    }, 0) / 5
    const balance = Math.max(0, 100 - Math.sqrt(variance) * 10)
    
    return {
      totalWeight: total,
      maxWeight: max,
      percentages: percs,
      balanceScore: Math.round(balance)
    }
  }, [priorityWeights])

  const getBalanceStatus = () => {
    if (balanceScore >= 80) return { label: 'Well Balanced', color: 'text-green-600', bgColor: 'bg-green-50' }
    if (balanceScore >= 60) return { label: 'Moderately Balanced', color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
    return { label: 'Specialized Focus', color: 'text-blue-600', bgColor: 'bg-blue-50' }
  }

  const balanceStatus = getBalanceStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Priority Weight Visualization</h2>
          <p className="text-gray-600 mt-1">
            Real-time preview of how your priority configuration affects allocation decisions
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Method: {priorityMethod}
          </Badge>
          {presetProfile !== 'custom' && (
            <Badge variant="secondary">
              Profile: {presetProfile}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weight Distribution Visualization */}
        <div className="xl:col-span-2 space-y-6">
          {/* Weight Bars */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Weight Distribution
              </CardTitle>
              <CardDescription>
                Visual representation of your priority criteria weights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {CRITERIA_CONFIG.map(criteria => (
                  <WeightBar
                    key={criteria.key}
                    criteria={criteria}
                    weight={priorityWeights[criteria.key]}
                    percentage={percentages[criteria.key]}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Allocation Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Allocation Impact Preview
              </CardTitle>
              <CardDescription>
                See how your weights affect allocation decisions in different scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllocationPreview weights={priorityWeights} />
            </CardContent>
          </Card>
        </div>

        {/* Analysis Panel */}
        <div className="space-y-6">
          {/* Weight Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Weight Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{totalWeight}</div>
                    <div className="text-sm text-gray-600">Total Weight</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{maxWeight}</div>
                    <div className="text-sm text-gray-600">Max Weight</div>
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg ${balanceStatus.bgColor}`}>
                  <div className={`font-medium ${balanceStatus.color} mb-1`}>
                    {balanceStatus.label}
                  </div>
                  <div className={`text-sm ${balanceStatus.color}`}>
                    Balance Score: {balanceScore}/100
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  <p><strong>High Balance (80+):</strong> Weights are evenly distributed</p>
                  <p><strong>Medium Balance (60-79):</strong> Some criteria emphasized</p>
                  <p><strong>Specialized (&lt;60):</strong> Strong focus on specific criteria</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Criteria */}
          <Card>
            <CardHeader>
              <CardTitle>Top Priority Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(priorityWeights)
                  .map(([key, weight]) => ({ 
                    key: key as keyof PriorityWeights, 
                    weight,
                    config: CRITERIA_CONFIG.find(c => c.key === key)!
                  }))
                  .sort((a, b) => b.weight - a.weight)
                  .slice(0, 3)
                  .map((item, index) => (
                    <div key={item.key} className="flex items-center gap-3">
                      <Badge variant={index === 0 ? "default" : "outline"} className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <item.config.icon className={`h-4 w-4 ${item.config.color}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.config.label}</div>
                        <div className="text-xs text-gray-600">{item.weight}/10</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

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
                    <strong>Note:</strong> Higher constraint weights will strictly enforce your {rules.filter(r => r.isActive).length} active rules during allocation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                {balanceScore < 50 && (
                  <div className="p-2 bg-blue-50 rounded text-blue-700">
                    <strong>Consider:</strong> Your configuration is highly specialized. This may lead to focused but potentially rigid allocation outcomes.
                  </div>
                )}
                {maxWeight >= 9 && (
                  <div className="p-2 bg-yellow-50 rounded text-yellow-700">
                    <strong>High Priority:</strong> One criterion has maximum weight (9-10). This will dominate allocation decisions.
                  </div>
                )}
                {totalWeight < 20 && (
                  <div className="p-2 bg-gray-50 rounded text-gray-700">
                    <strong>Low Total:</strong> Consider increasing weights for more decisive allocation outcomes.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}