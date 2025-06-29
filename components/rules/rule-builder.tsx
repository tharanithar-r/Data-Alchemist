'use client'

import { 
  Settings, Plus, Eye, Archive, Bot, Zap, Users, Clock, 
  Target, Filter, ArrowUpDown, Sparkles, CheckCircle,
  AlertTriangle, Info
} from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDataStoreSelectors } from '@/lib/stores/data-store'
import { useRulesStore } from '@/lib/stores/rules-store'

import { AIRuleAssistant } from './rule-types/ai-rule-assistant'
import { QuickCoRunRule } from './rule-types/co-run-rule'
import { QuickLoadLimitRule } from './rule-types/load-limit-rule'
import { QuickPatternMatchRule } from './rule-types/pattern-match-rule'
import { QuickPhaseWindowRule } from './rule-types/phase-window-rule'
import { QuickPrecedenceOverrideRule } from './rule-types/precedence-override-rule'
import { QuickSlotRestrictionRule } from './rule-types/slot-restriction-rule'

export function RuleBuilder() {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const { rules, getActiveRules, getRulesByType } = useRulesStore()
  const { hasData } = useDataStoreSelectors()

  const activeRules = getActiveRules()
  const inactiveRules = rules.filter(rule => !rule.isActive)

  // Rule type counts
  const coRunRules = getRulesByType('coRun')
  const slotRestrictionRules = getRulesByType('slotRestriction')
  const loadLimitRules = getRulesByType('loadLimit')
  const phaseWindowRules = getRulesByType('phaseWindow')
  const patternMatchRules = getRulesByType('patternMatch')
  const precedenceOverrideRules = getRulesByType('precedenceOverride')

  return (
    <div className="space-y-6">
      {/* Header with overview */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Rules</h2>
          <p className="text-gray-600 mt-1">
            Create and manage rules for resource allocation optimization
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {rules.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {activeRules.length} active
              </Badge>
              {inactiveRules.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Archive className="h-3 w-3" />
                  {inactiveRules.length} inactive
                </Badge>
              )}
            </div>
          )}
          
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Data requirement check */}
      {!hasData && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Data Required
            </CardTitle>
            <CardDescription className="text-amber-700">
              Please upload client, worker, and task data before creating business rules.
              Rules need actual data to validate constraints and preview effects.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Main rule builder interface */}
      <div className="grid grid-cols-12 gap-6">
        {/* Rule List Sidebar */}
        <div className="col-span-4 space-y-4">
          <Card className="border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Settings className="h-5 w-5 text-gray-600" />
                </div>
                Existing Rules
                {rules.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {rules.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage and edit your business rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {rules.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Settings className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-700 mb-2">No rules created yet</h3>
                  <p className="text-sm text-gray-500">Create your first rule to get started with allocation constraints</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Active Rules */}
                  {activeRules.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Active Rules ({activeRules.length})</span>
                      </div>
                      <div className="space-y-2">
                        {activeRules.map(rule => {
                          const getRuleIcon = (type: string) => {
                            switch (type) {
                              case 'coRun': return <Zap className="h-4 w-4 text-blue-600" />
                              case 'slotRestriction': return <Users className="h-4 w-4 text-green-600" />
                              case 'loadLimit': return <Target className="h-4 w-4 text-yellow-600" />
                              case 'phaseWindow': return <Clock className="h-4 w-4 text-indigo-600" />
                              case 'patternMatch': return <Filter className="h-4 w-4 text-pink-600" />
                              case 'precedenceOverride': return <ArrowUpDown className="h-4 w-4 text-red-600" />
                              default: return <Settings className="h-4 w-4 text-gray-600" />
                            }
                          }

                          return (
                            <div
                              key={rule.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                selectedRuleId === rule.id
                                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => setSelectedRuleId(rule.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {getRuleIcon(rule.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900 truncate">{rule.name}</div>
                                  <div className="text-xs text-gray-500 capitalize mt-0.5">
                                    {rule.type.replace(/([A-Z])/g, ' $1').trim()}
                                  </div>
                                  {rule.description && (
                                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                      {rule.description}
                                    </div>
                                  )}
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs shrink-0"
                                >
                                  Active
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Inactive Rules */}
                  {inactiveRules.length > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">Inactive Rules ({inactiveRules.length})</span>
                      </div>
                      <div className="space-y-2">
                        {inactiveRules.map(rule => (
                          <div
                            key={rule.id}
                            className="p-3 border rounded-lg border-gray-100 bg-gray-50 opacity-60 transition-opacity hover:opacity-80"
                          >
                            <div className="flex items-center gap-3">
                              <Archive className="h-4 w-4 text-gray-400" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-600">{rule.name}</div>
                                <div className="text-xs text-gray-500 capitalize">
                                  {rule.type.replace(/([A-Z])/g, ' $1').trim()}
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rule Creation/Edit Interface */}
        <div className="col-span-8">
          <Card className="border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </div>
                Create Business Rule
              </CardTitle>
              <CardDescription className="text-blue-700">
                Define intelligent allocation constraints using AI assistance or manual configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Quick Info Banner */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800 mb-1">Smart Rule Creation</h4>
                    <p className="text-sm text-green-700">
                      Start with AI Assistant for natural language rule creation, or choose manual rule types for precise control.
                    </p>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="aiAssistant" className="space-y-6">
                <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-gray-50">
                  <TabsTrigger 
                    value="aiAssistant" 
                    className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-purple-500/20 data-[state=active]:border-purple-500/30"
                  >
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Bot className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="text-xs font-medium">AI Assistant</span>
                    <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                      Recommended
                    </Badge>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="coRun" 
                    className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-blue-100 data-[state=active]:border-blue-200"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium">Co-run</span>
                    <span className="text-xs text-gray-500">Tasks Together</span>
                    {coRunRules.length > 0 && (
                      <Badge variant="outline" className="text-xs h-4">
                        {coRunRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="slotRestriction" 
                    className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-green-100 data-[state=active]:border-green-200"
                  >
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium">Slot Limit</span>
                    <span className="text-xs text-gray-500">Group Capacity</span>
                    {slotRestrictionRules.length > 0 && (
                      <Badge variant="outline" className="text-xs h-4">
                        {slotRestrictionRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="loadLimit" 
                    className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-yellow-100 data-[state=active]:border-yellow-200"
                  >
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Target className="h-5 w-5 text-yellow-600" />
                    </div>
                    <span className="text-xs font-medium">Load Limit</span>
                    <span className="text-xs text-gray-500">Worker Max</span>
                    {loadLimitRules.length > 0 && (
                      <Badge variant="outline" className="text-xs h-4">
                        {loadLimitRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="phaseWindow" 
                    className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-indigo-100 data-[state=active]:border-indigo-200"
                  >
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Clock className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-xs font-medium">Phase Window</span>
                    <span className="text-xs text-gray-500">Time Slots</span>
                    {phaseWindowRules.length > 0 && (
                      <Badge variant="outline" className="text-xs h-4">
                        {phaseWindowRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="patternMatch" 
                    className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-pink-100 data-[state=active]:border-pink-200"
                  >
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Filter className="h-5 w-5 text-pink-600" />
                    </div>
                    <span className="text-xs font-medium">Pattern Match</span>
                    <span className="text-xs text-gray-500">Text Rules</span>
                    {patternMatchRules.length > 0 && (
                      <Badge variant="outline" className="text-xs h-4">
                        {patternMatchRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="precedenceOverride" 
                    className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-red-100 data-[state=active]:border-red-200"
                  >
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ArrowUpDown className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="text-xs font-medium">Precedence</span>
                    <span className="text-xs text-gray-500">Rule Priority</span>
                    {precedenceOverrideRules.length > 0 && (
                      <Badge variant="outline" className="text-xs h-4">
                        {precedenceOverrideRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* AI Assistant Tab */}
                <TabsContent value="aiAssistant" className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-purple-900">AI-Powered Rule Creation</h3>
                        <p className="text-sm text-purple-700">Describe your rule in plain English and let AI handle the configuration</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Natural language processing</span>
                      <CheckCircle className="h-4 w-4 ml-3" />
                      <span>Smart rule suggestions</span>
                      <CheckCircle className="h-4 w-4 ml-3" />
                      <span>Confidence scoring</span>
                    </div>
                  </div>
                  <AIRuleAssistant />
                </TabsContent>

                {/* Co-run Rule Tab */}
                <TabsContent value="coRun" className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Zap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900">Co-run Rules</h3>
                        <p className="text-sm text-blue-700">Ensure specific tasks always run together for workflow continuity</p>
                      </div>
                    </div>
                    <div className="text-sm text-blue-600">
                      <span className="font-medium">Example:</span> "Tasks T1 and T2 must be assigned to the same worker"
                    </div>
                  </div>
                  <QuickCoRunRule 
                    onRuleCreated={() => {
                      console.log('Co-run rule created successfully');
                    }}
                  />
                </TabsContent>

                {/* Slot Restriction Rule Tab */}
                <TabsContent value="slotRestriction" className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-900">Slot Restriction Rules</h3>
                        <p className="text-sm text-green-700">Control minimum shared capacity requirements for groups</p>
                      </div>
                    </div>
                    <div className="text-sm text-green-600">
                      <span className="font-medium">Example:</span> "Sales team must have at least 5 common available slots"
                    </div>
                  </div>
                  <QuickSlotRestrictionRule 
                    onRuleCreated={() => {
                      console.log('Slot restriction rule created successfully');
                    }}
                  />
                </TabsContent>

                {/* Load Limit Rule Tab */}
                <TabsContent value="loadLimit" className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Target className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-yellow-900">Load Limit Rules</h3>
                        <p className="text-sm text-yellow-700">Set maximum workload constraints to prevent overallocation</p>
                      </div>
                    </div>
                    <div className="text-sm text-yellow-600">
                      <span className="font-medium">Example:</span> "Development team workers max 8 tasks per phase"
                    </div>
                  </div>
                  <QuickLoadLimitRule 
                    onRuleCreated={() => {
                      console.log('Load limit rule created successfully');
                    }}
                  />
                </TabsContent>

                {/* Phase Window Rule Tab */}
                <TabsContent value="phaseWindow" className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Clock className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-indigo-900">Phase Window Rules</h3>
                        <p className="text-sm text-indigo-700">Restrict tasks to specific time phases or scheduling windows</p>
                      </div>
                    </div>
                    <div className="text-sm text-indigo-600">
                      <span className="font-medium">Example:</span> "Task T5 can only run in phases 2, 3, and 4"
                    </div>
                  </div>
                  <QuickPhaseWindowRule 
                    onRuleCreated={() => {
                      console.log('Phase window rule created successfully');
                    }}
                  />
                </TabsContent>

                {/* Pattern Match Rule Tab */}
                <TabsContent value="patternMatch" className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <Filter className="h-5 w-5 text-pink-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-pink-900">Pattern Match Rules</h3>
                        <p className="text-sm text-pink-700">Use text patterns and templates for advanced rule logic</p>
                      </div>
                    </div>
                    <div className="text-sm text-pink-600">
                      <span className="font-medium">Example:</span> "If client name contains 'Priority', assign to senior workers"
                    </div>
                  </div>
                  <QuickPatternMatchRule 
                    onRuleCreated={() => {
                      console.log('Pattern match rule created successfully');
                    }}
                  />
                </TabsContent>

                {/* Precedence Override Rule Tab */}
                <TabsContent value="precedenceOverride" className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <ArrowUpDown className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-900">Precedence Override Rules</h3>
                        <p className="text-sm text-red-700">Define rule hierarchy and priority order for conflict resolution</p>
                      </div>
                    </div>
                    <div className="text-sm text-red-600">
                      <span className="font-medium">Example:</span> "High-priority client rules override standard load limits"
                    </div>
                  </div>
                  <QuickPrecedenceOverrideRule 
                    onRuleCreated={() => {
                      console.log('Precedence override rule created successfully');
                    }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rule Preview Panel - shown when rule is selected */}
      {selectedRuleId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Rule Preview
            </CardTitle>
            <CardDescription className="text-blue-700">
              Preview how this rule will affect your data before applying
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-blue-600">
              <Eye className="h-8 w-8 mx-auto mb-2" />
              <p>Rule preview functionality will be integrated here</p>
              <p className="text-sm">Shows impact analysis and affected entities</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}