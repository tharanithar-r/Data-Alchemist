'use client';

import { Settings, Plus, Eye, Archive } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataStoreSelectors } from '@/lib/stores/data-store';
import { useRulesStore } from '@/lib/stores/rules-store';

import { QuickCoRunRule } from './rule-types/co-run-rule';
import { QuickLoadLimitRule } from './rule-types/load-limit-rule';
import { QuickSlotRestrictionRule } from './rule-types/slot-restriction-rule';

export function RuleBuilder() {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const { rules, getActiveRules, getRulesByType } = useRulesStore();
  const { hasData } = useDataStoreSelectors();

  const activeRules = getActiveRules();
  const inactiveRules = rules.filter(rule => !rule.isActive);

  // Rule type counts
  const coRunRules = getRulesByType('coRun');
  const slotRestrictionRules = getRulesByType('slotRestriction');
  const loadLimitRules = getRulesByType('loadLimit');
  const phaseWindowRules = getRulesByType('phaseWindow');
  const patternMatchRules = getRulesByType('patternMatch');
  const precedenceOverrideRules = getRulesByType('precedenceOverride');

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
              Please upload client, worker, and task data before creating
              business rules. Rules need actual data to validate constraints and
              preview effects.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Main rule builder interface */}
      <div className="grid grid-cols-12 gap-6">
        {/* Rule List Sidebar */}
        <div className="col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Existing Rules</CardTitle>
              <CardDescription>
                Manage and edit your business rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No rules created yet</p>
                  <p className="text-sm">
                    Create your first rule to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeRules.map(rule => (
                    <div
                      key={rule.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRuleId === rule.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedRuleId(rule.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{rule.name}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {rule.type.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {rule.type}
                        </Badge>
                      </div>
                      {rule.description && (
                        <div className="text-xs text-gray-600 mt-1 truncate">
                          {rule.description}
                        </div>
                      )}
                    </div>
                  ))}

                  {inactiveRules.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs font-medium text-gray-500 mb-2">
                        Inactive Rules
                      </div>
                      {inactiveRules.map(rule => (
                        <div
                          key={rule.id}
                          className="p-2 border rounded border-gray-100 bg-gray-50 opacity-60"
                        >
                          <div className="text-sm font-medium text-gray-600">
                            {rule.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {rule.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rule Creation/Edit Interface */}
        <div className="col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Business Rule
              </CardTitle>
              <CardDescription>
                Choose a rule type and configure its parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="coRun" className="space-y-4">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger
                    value="coRun"
                    className="flex flex-col items-center gap-1 py-3"
                  >
                    <span className="text-xs font-medium">Co-run</span>
                    {coRunRules.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-4">
                        {coRunRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="slotRestriction"
                    className="flex flex-col items-center gap-1 py-3"
                  >
                    <span className="text-xs font-medium">Slot Limit</span>
                    {slotRestrictionRules.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-4">
                        {slotRestrictionRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="loadLimit"
                    className="flex flex-col items-center gap-1 py-3"
                  >
                    <span className="text-xs font-medium">Load Limit</span>
                    {loadLimitRules.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-4">
                        {loadLimitRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="phaseWindow"
                    className="flex flex-col items-center gap-1 py-3"
                  >
                    <span className="text-xs font-medium">Phase Window</span>
                    {phaseWindowRules.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-4">
                        {phaseWindowRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="patternMatch"
                    className="flex flex-col items-center gap-1 py-3"
                  >
                    <span className="text-xs font-medium">Pattern Match</span>
                    {patternMatchRules.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-4">
                        {patternMatchRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="precedenceOverride"
                    className="flex flex-col items-center gap-1 py-3"
                  >
                    <span className="text-xs font-medium">Precedence</span>
                    {precedenceOverrideRules.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-4">
                        {precedenceOverrideRules.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Co-run Rule Tab */}
                <TabsContent value="coRun" className="space-y-4">
                  <QuickCoRunRule
                    onRuleCreated={() => {
                      // Refresh rule list - the store will auto-update
                      console.log('Co-run rule created successfully');
                    }}
                  />
                </TabsContent>

                {/* Slot Restriction Rule Tab */}
                <TabsContent value="slotRestriction" className="space-y-4">
                  <QuickSlotRestrictionRule
                    onRuleCreated={() => {
                      // Refresh rule list - the store will auto-update
                      console.log('Slot restriction rule created successfully');
                    }}
                  />
                </TabsContent>

                {/* Load Limit Rule Tab */}
                <TabsContent value="loadLimit" className="space-y-4">
                  <QuickLoadLimitRule
                    onRuleCreated={() => {
                      // Refresh rule list - the store will auto-update
                      console.log('Load limit rule created successfully');
                    }}
                  />
                </TabsContent>

                {/* Phase Window Rule Tab */}
                <TabsContent value="phaseWindow" className="space-y-4">
                  <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Phase Window Rule
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Pick TaskID + allowed phase list/range
                    </p>
                    <p className="text-sm text-gray-500">
                      Example: {`{ taskId: "T1", allowedPhases: [1, 2, 3] }`}
                    </p>
                    <Button className="mt-4" disabled={!hasData}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Phase Window
                    </Button>
                  </div>
                </TabsContent>

                {/* Pattern Match Rule Tab */}
                <TabsContent value="patternMatch" className="space-y-4">
                  <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Pattern Match Rule
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Enter regex + choose rule template + parameters
                    </p>
                    <p className="text-sm text-gray-500">
                      Example:{' '}
                      {`{ regex: "^Data.*", template: "priority", params: {...} }`}
                    </p>
                    <Button className="mt-4" disabled={!hasData}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Pattern Match
                    </Button>
                  </div>
                </TabsContent>

                {/* Precedence Override Rule Tab */}
                <TabsContent value="precedenceOverride" className="space-y-4">
                  <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Precedence Override Rule
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Define global vs specific rules with explicit priority
                      order
                    </p>
                    <p className="text-sm text-gray-500">
                      Example:{' '}
                      {`{ priority: 1, scope: "global", conditions: {...} }`}
                    </p>
                    <Button className="mt-4" disabled={!hasData}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Precedence Override
                    </Button>
                  </div>
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
              <p className="text-sm">
                Shows impact analysis and affected entities
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
