'use client'

import { Lightbulb, TrendingUp, Users, AlertTriangle, CheckCircle, X, Eye, Plus, BarChart3, Target, Clock } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { generateRuleSuggestions, getSuggestionStats, RuleSuggestion } from '@/lib/ai/rule-suggestions'
import { useDataStore } from '@/lib/stores/data-store'
import { useRulesStore, BusinessRule } from '@/lib/stores/rules-store'

interface SuggestionCardProps {
  suggestion: RuleSuggestion
  onAccept: () => void
  onReject: () => void
  onPreview: () => void
  isProcessing?: boolean
}

function SuggestionCard({ suggestion, onAccept, onReject, onPreview, isProcessing }: SuggestionCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'workload management': return <Users className="h-4 w-4" />
      case 'task coordination': return <Target className="h-4 w-4" />
      case 'client prioritization': return <TrendingUp className="h-4 w-4" />
      case 'phase management': return <Clock className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  return (
    <Card className={`transition-all duration-200 ${getPriorityColor(suggestion.priority)} hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getCategoryIcon(suggestion.category)}
            <div>
              <CardTitle className="text-lg">{suggestion.title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {suggestion.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
              {suggestion.priority}
            </Badge>
            <Badge className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
              {suggestion.confidence}% confidence
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reason and Impact */}
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium text-gray-700">Reason: </span>
            <span className="text-gray-600">{suggestion.reason}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-gray-700">Impact: </span>
            <span className="text-gray-600">{suggestion.impact}</span>
          </div>
        </div>

        {/* Metrics */}
        {suggestion.metrics && (
          <div className="grid grid-cols-3 gap-3 text-center">
            {suggestion.metrics.workloadReduction && (
              <div className="p-2 bg-white/50 rounded">
                <div className="text-lg font-bold text-green-600">
                  -{suggestion.metrics.workloadReduction}%
                </div>
                <div className="text-xs text-gray-600">Workload</div>
              </div>
            )}
            {suggestion.metrics.efficiencyGain && (
              <div className="p-2 bg-white/50 rounded">
                <div className="text-lg font-bold text-blue-600">
                  +{suggestion.metrics.efficiencyGain}%
                </div>
                <div className="text-xs text-gray-600">Efficiency</div>
              </div>
            )}
            {suggestion.metrics.capacityUtilization && (
              <div className="p-2 bg-white/50 rounded">
                <div className="text-lg font-bold text-purple-600">
                  {suggestion.metrics.capacityUtilization}%
                </div>
                <div className="text-xs text-gray-600">Capacity</div>
              </div>
            )}
          </div>
        )}

        {/* Benefits and Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-medium text-green-700 mb-1">Benefits:</div>
            <ul className="space-y-1 text-green-600">
              {suggestion.benefits.slice(0, 2).map((benefit, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span>•</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium text-amber-700 mb-1">Considerations:</div>
            <ul className="space-y-1 text-amber-600">
              {suggestion.risks.slice(0, 2).map((risk, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span>•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="flex-1 text-xs"
            disabled={isProcessing}
          >
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            className="flex-1 text-xs"
            disabled={isProcessing}
          >
            <X className="h-3 w-3 mr-1" />
            Dismiss
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            className="flex-1 text-xs"
            disabled={isProcessing}
          >
            <Plus className="h-3 w-3 mr-1" />
            {isProcessing ? 'Creating...' : 'Create Rule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface SuggestionPreviewProps {
  suggestion: RuleSuggestion
  onAccept: () => void
  onClose: () => void
  isProcessing?: boolean
}

function SuggestionPreview({ suggestion, onAccept, onClose, isProcessing }: SuggestionPreviewProps) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Rule Preview: {suggestion.title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rule Configuration */}
        <div className="p-4 bg-blue-100 rounded-lg">
          <div className="font-medium text-blue-800 mb-2">Generated Rule Configuration:</div>
          <div className="grid grid-cols-2 gap-3 text-sm text-blue-700">
            <div>
              <span className="font-medium">Name:</span> {suggestion.suggestedRule.name}
            </div>
            <div>
              <span className="font-medium">Type:</span> {suggestion.suggestedRule.type}
            </div>
          </div>
          <div className="mt-2 text-sm text-blue-700">
            <span className="font-medium">Description:</span> {suggestion.suggestedRule.description}
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Full Benefits:</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              {suggestion.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Considerations:</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              {suggestion.risks.map((risk, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-600" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Affected Entities */}
        {(suggestion.affectedEntities.clients?.length || suggestion.affectedEntities.workers?.length || suggestion.affectedEntities.tasks?.length) && (
          <div className="space-y-2">
            <h4 className="font-medium text-blue-800">Affected Entities:</h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {suggestion.affectedEntities.clients?.length && (
                <div className="p-2 bg-blue-100 rounded">
                  <div className="font-medium">Clients ({suggestion.affectedEntities.clients.length})</div>
                  <div className="text-blue-600">{suggestion.affectedEntities.clients.slice(0, 3).join(', ')}</div>
                </div>
              )}
              {suggestion.affectedEntities.workers?.length && (
                <div className="p-2 bg-blue-100 rounded">
                  <div className="font-medium">Workers ({suggestion.affectedEntities.workers.length})</div>
                  <div className="text-blue-600">{suggestion.affectedEntities.workers.slice(0, 3).join(', ')}</div>
                </div>
              )}
              {suggestion.affectedEntities.tasks?.length && (
                <div className="p-2 bg-blue-100 rounded">
                  <div className="font-medium">Tasks ({suggestion.affectedEntities.tasks.length})</div>
                  <div className="text-blue-600">{suggestion.affectedEntities.tasks.slice(0, 3).join(', ')}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-blue-200">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onAccept} disabled={isProcessing} className="flex-1">
            {isProcessing ? 'Creating Rule...' : 'Create This Rule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function RuleSuggestions() {
  const { addRule, rules } = useRulesStore()
  const { clients, workers, tasks } = useDataStore()
  
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [previewSuggestion, setPreviewSuggestion] = useState<RuleSuggestion | null>(null)
  const [processingSuggestions, setProcessingSuggestions] = useState<Set<string>>(new Set())
  
  // Generate suggestions based on current data
  const suggestions = useMemo(() => {
    if (clients.length === 0 || workers.length === 0 || tasks.length === 0) {
      return []
    }
    
    const generated = generateRuleSuggestions(clients, workers, tasks, rules)
    return generated.filter(s => !dismissedSuggestions.has(s.id))
  }, [clients, workers, tasks, rules, dismissedSuggestions])

  const stats = useMemo(() => getSuggestionStats(suggestions), [suggestions])

  // Handle suggestion acceptance
  const handleAcceptSuggestion = (suggestion: RuleSuggestion) => {
    setProcessingSuggestions(prev => new Set(prev).add(suggestion.id))
    
    try {
      const rule: BusinessRule = {
        ...suggestion.suggestedRule,
        id: `suggestion-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: false // Let user activate after review
      } as BusinessRule

      addRule(rule)
      setDismissedSuggestions(prev => new Set(prev).add(suggestion.id))
      setPreviewSuggestion(null)
    } catch (error) {
      console.error('Error creating rule from suggestion:', error)
    } finally {
      setProcessingSuggestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(suggestion.id)
        return newSet
      })
    }
  }

  // Handle suggestion rejection
  const handleRejectSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(suggestionId))
  }

  // Group suggestions by priority
  const suggestionsByPriority = useMemo(() => {
    return {
      high: suggestions.filter(s => s.priority === 'high'),
      medium: suggestions.filter(s => s.priority === 'medium'),
      low: suggestions.filter(s => s.priority === 'low')
    }
  }, [suggestions])

  if (clients.length === 0 || workers.length === 0 || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Lightbulb className="h-8 w-8 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600">No suggestions available</p>
          <p className="text-sm text-gray-500">Upload client, worker, and task data to get intelligent rule suggestions</p>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-500" />
          <p className="text-gray-600">No new suggestions</p>
          <p className="text-sm text-gray-500">Your current setup looks well-optimized! New suggestions will appear as your data changes.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <Lightbulb className="h-6 w-6 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rule Suggestions</h2>
          <p className="text-gray-600">
            AI-powered recommendations based on your data patterns
          </p>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-gray-600">Total Suggestions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.averageConfidence}%</div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.potentialImpact.efficiencyGain}%</div>
                <p className="text-sm text-gray-600">Efficiency Gain</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{stats.byPriority.high}</div>
                <p className="text-sm text-gray-600">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      {previewSuggestion && (
        <SuggestionPreview
          suggestion={previewSuggestion}
          onAccept={() => handleAcceptSuggestion(previewSuggestion)}
          onClose={() => setPreviewSuggestion(null)}
          isProcessing={processingSuggestions.has(previewSuggestion.id)}
        />
      )}

      {/* Suggestions by Priority */}
      <Tabs defaultValue="high" className="space-y-4">
        <TabsList>
          <TabsTrigger value="high" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            High Priority ({suggestionsByPriority.high.length})
          </TabsTrigger>
          <TabsTrigger value="medium" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Medium Priority ({suggestionsByPriority.medium.length})
          </TabsTrigger>
          <TabsTrigger value="low" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Low Priority ({suggestionsByPriority.low.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="high">
          {suggestionsByPriority.high.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {suggestionsByPriority.high.map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={() => handleAcceptSuggestion(suggestion)}
                  onReject={() => handleRejectSuggestion(suggestion.id)}
                  onPreview={() => setPreviewSuggestion(suggestion)}
                  isProcessing={processingSuggestions.has(suggestion.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-500" />
                <p className="text-gray-600">No high priority suggestions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="medium">
          {suggestionsByPriority.medium.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {suggestionsByPriority.medium.map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={() => handleAcceptSuggestion(suggestion)}
                  onReject={() => handleRejectSuggestion(suggestion.id)}
                  onPreview={() => setPreviewSuggestion(suggestion)}
                  isProcessing={processingSuggestions.has(suggestion.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-500" />
                <p className="text-gray-600">No medium priority suggestions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="low">
          {suggestionsByPriority.low.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {suggestionsByPriority.low.map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={() => handleAcceptSuggestion(suggestion)}
                  onReject={() => handleRejectSuggestion(suggestion.id)}
                  onPreview={() => setPreviewSuggestion(suggestion)}
                  isProcessing={processingSuggestions.has(suggestion.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-500" />
                <p className="text-gray-600">No low priority suggestions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}