'use client'

import { GripVertical, ArrowUp, ArrowDown, RotateCcw, Users, Target, Zap, AlertTriangle, TrendingUp } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRulesStore, PriorityWeights } from '@/lib/stores/rules-store'

interface CriteriaItem {
  key: keyof PriorityWeights
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const CRITERIA_ITEMS: CriteriaItem[] = [
  {
    key: 'fairness',
    label: 'Fairness',
    description: 'Ensure equal distribution of work and opportunities across all workers and clients',
    icon: Users,
    color: 'text-blue-600'
  },
  {
    key: 'priorityLevel',
    label: 'Priority Level',
    description: 'Prioritize high-priority clients and urgent tasks in allocation decisions',
    icon: TrendingUp,
    color: 'text-green-600'
  },
  {
    key: 'taskFulfillment',
    label: 'Task Fulfillment',
    description: 'Maximize the number of requested tasks that get completed successfully',
    icon: Target,
    color: 'text-purple-600'
  },
  {
    key: 'workerUtilization',
    label: 'Worker Utilization',
    description: 'Optimize worker capacity usage to minimize idle time and maximize efficiency',
    icon: Zap,
    color: 'text-orange-600'
  },
  {
    key: 'constraints',
    label: 'Constraints',
    description: 'Strictly enforce business rules and constraints over other optimization goals',
    icon: AlertTriangle,
    color: 'text-red-600'
  }
]

interface RankingItemProps {
  item: CriteriaItem
  rank: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

function RankingItem({
  item,
  rank,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: RankingItemProps) {
  const priority = 5 - rank + 1 // Convert rank to priority (1st = 5, 2nd = 4, etc.)
  
  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return 'bg-red-100 text-red-800 border-red-200'
    if (priority >= 4) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (priority >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (priority >= 2) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPriorityLabel = (priority: number) => {
    if (priority >= 5) return 'Highest Priority'
    if (priority >= 4) return 'High Priority'
    if (priority >= 3) return 'Medium Priority'
    if (priority >= 2) return 'Low Priority'
    return 'Lowest Priority'
  }

  return (
    <div
      className={`group relative bg-white border-2 rounded-lg p-4 transition-all duration-200 ${
        isDragging 
          ? 'border-blue-400 shadow-lg rotate-2 scale-105' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Rank indicator */}
      <div className="absolute -top-3 -left-3 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
        #{rank}
      </div>

      {/* Priority badge */}
      <div className="absolute -top-2 -right-2">
        <Badge className={`text-xs px-2 py-1 ${getPriorityColor(priority)}`}>
          {getPriorityLabel(priority)}
        </Badge>
      </div>

      <div className="flex items-start gap-4">
        {/* Drag handle */}
        <div className="flex-shrink-0 mt-1">
          <GripVertical className="h-5 w-5 text-gray-400 cursor-grab group-hover:text-gray-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <item.icon className={`h-6 w-6 ${item.color}`} />
            <h3 className="font-semibold text-gray-900">{item.label}</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Move buttons */}
        <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            disabled={isFirst}
            className="h-6 w-6 p-0"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            disabled={isLast}
            className="h-6 w-6 p-0"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none" />
      )}
    </div>
  )
}

const RANKING_PRESETS = [
  {
    name: 'Balanced Priority',
    description: 'Equal importance to all criteria',
    ranking: ['fairness', 'priorityLevel', 'taskFulfillment', 'workerUtilization', 'constraints']
  },
  {
    name: 'Client-First',
    description: 'Prioritize client satisfaction and task completion',
    ranking: ['priorityLevel', 'taskFulfillment', 'constraints', 'fairness', 'workerUtilization']
  },
  {
    name: 'Worker-Focused',
    description: 'Emphasize fair workload and efficient utilization',
    ranking: ['fairness', 'workerUtilization', 'constraints', 'taskFulfillment', 'priorityLevel']
  },
  {
    name: 'Rule-Strict',
    description: 'Enforce constraints above all other considerations',
    ranking: ['constraints', 'fairness', 'priorityLevel', 'taskFulfillment', 'workerUtilization']
  },
  {
    name: 'Efficiency-Driven',
    description: 'Maximize task completion and worker productivity',
    ranking: ['taskFulfillment', 'workerUtilization', 'priorityLevel', 'constraints', 'fairness']
  }
]

export function RankingInterface() {
  const { 
    priorityWeights, 
    setPriorityWeights, 
    setPresetProfile,
    priorityMethod,
    setPriorityMethod,
    rules 
  } = useRulesStore()

  // Convert weights to ranking order (highest weight = rank 1)
  const currentRanking = useMemo(() => {
    return Object.entries(priorityWeights)
      .sort(([, a], [, b]) => b - a)
      .map(([key]) => key as keyof PriorityWeights)
  }, [priorityWeights])

  const [localRanking, setLocalRanking] = useState<(keyof PriorityWeights)[]>(currentRanking)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Convert ranking to weights (rank 1 = weight 10, rank 2 = weight 8, etc.)
  const convertRankingToWeights = (ranking: string[]) => {
    const weights: any = {}
    ranking.forEach((key, index) => {
      weights[key] = Math.max(10 - (index * 2), 1) // 10, 8, 6, 4, 2
    })
    return weights
  }

  // Apply ranking changes to weights
  const applyRanking = () => {
    const newWeights = convertRankingToWeights(localRanking)
    setPriorityWeights(newWeights)
    setPriorityMethod('ranking')
    setHasUnsavedChanges(false)
  }

  // Reset to current weights ranking
  const resetRanking = () => {
    setLocalRanking(currentRanking)
    setHasUnsavedChanges(false)
  }

  // Apply preset ranking
  const applyPreset = (presetName: string) => {
    const preset = RANKING_PRESETS.find(p => p.name === presetName)
    if (preset) {
      setLocalRanking(preset.ranking as any)
      const newWeights = convertRankingToWeights(preset.ranking)
      setPriorityWeights(newWeights)
      setPriorityMethod('ranking')
      setPresetProfile(presetName as any)
      setHasUnsavedChanges(false)
    }
  }

  // Move item up/down
  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= localRanking.length) return
    
    const newRanking = [...localRanking]
    const [movedItem] = newRanking.splice(fromIndex, 1)
    newRanking.splice(toIndex, 0, movedItem)
    
    setLocalRanking(newRanking)
    setHasUnsavedChanges(true)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveItem(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
  }

  // Get criteria items in current ranking order
  const rankedCriteria = localRanking.map(key => 
    CRITERIA_ITEMS.find(item => item.key === key)!
  )

  // Calculate ranking impact
  const rankingImpact = useMemo(() => {
    const topCriteria = rankedCriteria.slice(0, 2).map(c => c.label)
    const bottomCriteria = rankedCriteria.slice(-2).map(c => c.label)
    
    return {
      focus: topCriteria.join(' and '),
      deprioritized: bottomCriteria.join(' and ')
    }
  }, [rankedCriteria])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Priority Ranking</h2>
          <p className="text-gray-600 mt-1">
            Drag and drop to reorder criteria by importance (highest priority first)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={resetRanking} disabled={!hasUnsavedChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={applyRanking} disabled={!hasUnsavedChanges}>
            Apply Ranking
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranking Interface */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Criteria Ranking</CardTitle>
              <CardDescription>
                Drag criteria to reorder by importance. #1 has the highest priority.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rankedCriteria.map((item, index) => (
                <RankingItem
                  key={item.key}
                  item={item}
                  rank={index + 1}
                  isFirst={index === 0}
                  isLast={index === rankedCriteria.length - 1}
                  onMoveUp={() => moveItem(index, index - 1)}
                  onMoveDown={() => moveItem(index, index + 1)}
                  isDragging={draggedIndex === index}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                />
              ))}
            </CardContent>
          </Card>

          {/* Preset Rankings */}
          <Card>
            <CardHeader>
              <CardTitle>Preset Rankings</CardTitle>
              <CardDescription>
                Quick configurations for common priority strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RANKING_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
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

        {/* Analysis Panel */}
        <div className="space-y-6">
          {/* Current Impact */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800 text-sm mb-1">Primary Focus</div>
                  <div className="text-green-700 text-sm">{rankingImpact.focus}</div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-800 text-sm mb-1">Lower Priority</div>
                  <div className="text-gray-700 text-sm">{rankingImpact.deprioritized}</div>
                </div>
              </div>

              {/* Weight Preview */}
              <div className="space-y-2 pt-3 border-t">
                <div className="font-medium text-sm">Weight Preview:</div>
                {rankedCriteria.map((item, index) => {
                  const weight = Math.max(10 - (index * 2), 1)
                  return (
                    <div key={item.key} className="flex justify-between items-center text-sm">
                      <span>{item.label}</span>
                      <Badge variant="outline">{weight}/10</Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Method Comparison */}
          {priorityMethod !== 'ranking' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Current priority method is "{priorityMethod}". Applying this ranking will switch to "ranking" method.
              </AlertDescription>
            </Alert>
          )}

          {/* Active Rules Context */}
          {rules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rules Context</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>{rules.filter(r => r.isActive).length} active rules</p>
                  <p className="mt-2">
                    Higher "Constraints" ranking will strictly enforce business rules during allocation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Ranking Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>How Ranking Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Ranking to Weights</h4>
              <ul className="space-y-1">
                <li>• #1 Rank → Weight 10 (Highest)</li>
                <li>• #2 Rank → Weight 8</li>
                <li>• #3 Rank → Weight 6</li>
                <li>• #4 Rank → Weight 4</li>
                <li>• #5 Rank → Weight 2 (Lowest)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Allocation Impact</h4>
              <ul className="space-y-1">
                <li>• Higher ranked criteria take precedence</li>
                <li>• Creates clear hierarchy for decision making</li>
                <li>• Simpler than complex weight balancing</li>
                <li>• Ideal for organizations with clear priorities</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}