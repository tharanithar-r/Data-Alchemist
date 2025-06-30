'use client';

import {
  Bot,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Sparkles,
  MessageSquare,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { useState, useMemo } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
import { ConfidenceResult } from '@/lib/ai/confidence-scoring';
import { EXAMPLE_PROMPTS } from '@/lib/ai/rule-generator';
import { useDataStore } from '@/lib/stores/data-store';
import { useRulesStore, BusinessRule } from '@/lib/stores/rules-store';

import { RuleSuggestions } from '../rule-suggestions';

import { RuleTemplateWizard } from './rule-template-wizard';

interface GeneratedRulePreview {
  rule: Partial<BusinessRule>;
  confidence: number;
  confidenceResult?: ConfidenceResult;
  explanation: string;
  suggestions: string[];
}

export function AIRuleAssistant() {
  const { addRule } = useRulesStore();
  const { clients, workers, tasks } = useDataStore();

  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRule, setGeneratedRule] =
    useState<GeneratedRulePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract available data for AI context
  const availableData = useMemo(() => {
    const clientGroups = [
      ...new Set(clients.map(c => c.GroupTag).filter(Boolean)),
    ] as string[];
    const workerGroups = [
      ...new Set(workers.map(w => w.WorkerGroup).filter(Boolean)),
    ] as string[];
    const taskIds = tasks.map(t => t.TaskID);
    const skills = [
      ...new Set(
        workers
          .flatMap(w => w.Skills?.split(',') || [])
          .map(s => s.trim())
          .filter(Boolean)
      ),
    ];

    return { clientGroups, workerGroups, taskIds, skills };
  }, [clients, workers, tasks]);

  // Handle rule generation
  const handleGenerateRule = async () => {
    if (!userInput.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedRule(null);

    try {
      const response = await fetch('/api/ai/rule-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput,
          availableData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate rule');
      }

      const result = await response.json();

      if (result.success && result.rule) {
        setGeneratedRule({
          rule: result.rule,
          confidence: result.confidence,
          explanation: result.explanation || '',
          suggestions: result.suggestions || [],
        });
      } else {
        setError(result.error || 'Failed to generate rule');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle adding generated rule
  const handleAddRule = () => {
    if (generatedRule?.rule) {
      addRule(generatedRule.rule as BusinessRule);
      setUserInput('');
      setGeneratedRule(null);
      setError(null);
    }
  };

  // Handle adding and activating generated rule
  const handleAddAndActivateRule = () => {
    if (generatedRule?.rule) {
      // Add rule with active status
      const activeRule = { ...generatedRule.rule, isActive: true };
      addRule(activeRule as BusinessRule);
      setUserInput('');
      setGeneratedRule(null);
      setError(null);
    }
  };

  // Handle example prompt selection
  const handleExampleSelect = (example: string) => {
    setUserInput(example);
    setGeneratedRule(null);
    setError(null);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Format rule configuration for display
  const formatRuleConfig = (rule: Partial<BusinessRule>) => {
    switch (rule.type) {
      case 'coRun':
        return `Tasks: ${(rule as any).taskIds?.join(', ')}`;
      case 'loadLimit':
        return `Group: ${(rule as any).workerGroup}, Max: ${(rule as any).maxSlotsPerPhase} slots/phase`;
      case 'slotRestriction':
        return `${(rule as any).targetType}: ${(rule as any).groupTag}, Min: ${(rule as any).minCommonSlots} slots`;
      case 'phaseWindow':
        return `Task: ${(rule as any).taskId}, Phases: ${(rule as any).allowedPhases?.join(', ')}`;
      case 'patternMatch':
        return `Pattern: ${(rule as any).regex}, Template: ${(rule as any).template}`;
      case 'precedenceOverride':
        return `Priority: ${(rule as any).priority}, Type: ${(rule as any).overrideType}, Targets: ${(rule as any).targetRuleIds?.length || 0}`;
      default:
        return 'Unknown configuration';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="natural-language" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
          <TabsTrigger 
            value="suggestions" 
            className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-blue-500/20 data-[state=active]:border-blue-500/30"
          >
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-sm font-medium">Smart Suggestions</span>
            <span className="text-xs text-muted-foreground">AI Recommendations</span>
          </TabsTrigger>
          <TabsTrigger
            value="natural-language"
            className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-purple-500/20 data-[state=active]:border-purple-500/30"
          >
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <MessageSquare className="h-5 w-5 text-purple-400" />
            </div>
            <span className="text-sm font-medium">Natural Language</span>
            <span className="text-xs text-muted-foreground">Describe in English</span>
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-green-500/20 data-[state=active]:border-green-500/30"
          >
            <div className="p-2 bg-green-500/20 rounded-lg">
              <BookOpen className="h-5 w-5 text-green-400" />
            </div>
            <span className="text-sm font-medium">Rule Templates</span>
            <span className="text-xs text-muted-foreground">Pre-built Patterns</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-6 mt-6">
          <RuleSuggestions />
        </TabsContent>

        <TabsContent value="natural-language" className="space-y-6 mt-6">
          {/* Natural Language Header */}
          <div className="p-6 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl border border-purple-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-900">Natural Language Rule Creation</h3>
                <p className="text-purple-700">Describe your allocation rule in plain English and let AI convert it to configuration</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-purple-600">
                <CheckCircle className="h-4 w-4" />
                <span>Intelligent parsing</span>
              </div>
              <div className="flex items-center gap-2 text-purple-600">
                <CheckCircle className="h-4 w-4" />
                <span>Confidence scoring</span>
              </div>
              <div className="flex items-center gap-2 text-purple-600">
                <CheckCircle className="h-4 w-4" />
                <span>Alternative suggestions</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Input Section */}
            <div className="xl:col-span-2 space-y-6">
              {/* Natural Language Input */}
              <Card className="border-purple-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                    </div>
                    Describe Your Rule
                  </CardTitle>
                  <CardDescription className="text-purple-700">
                    Explain what you want the rule to do in conversational English
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {/* Quick Start Examples */}
                  <div className="grid grid-cols-1 gap-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">Quick Start Examples:</div>
                    {[
                      "Sales workers should handle at most 3 tasks per phase",
                      "Tasks T1 and T2 should always run together",
                      "High priority clients must have at least 2 available slots"
                    ].map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setUserInput(example)}
                        className="text-left p-3 bg-gray-50 hover:bg-purple-50 rounded-lg text-sm text-gray-600 hover:text-purple-700 transition-colors border hover:border-purple-200"
                      >
                        "{example}"
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Textarea
                      placeholder="Type your rule description here... Be specific about numbers, groups, and constraints."
                      value={userInput}
                      onChange={e => setUserInput(e.target.value)}
                      rows={5}
                      className="resize-none text-base border-purple-200 focus:border-purple-400 focus:ring-purple-200"
                    />
                    {userInput.length > 400 && (
                      <div className="absolute top-2 right-2">
                        <Badge variant={userInput.length > 500 ? "destructive" : "secondary"} className="text-xs">
                          {500 - userInput.length} left
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500">
                        {userInput.length}/500 characters
                      </div>
                      {userInput.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserInput('')}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <Button
                      onClick={handleGenerateRule}
                      disabled={!userInput.trim() || isGenerating || userInput.length > 500}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                      size="lg"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isGenerating ? 'Generating...' : 'Generate Rule'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Rule Preview */}
              {generatedRule && (
                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b border-green-200">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <div className="p-2 bg-green-200 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-700" />
                        </div>
                        Generated Rule
                      </CardTitle>
                      <Badge
                        className={`${getConfidenceColor(generatedRule.confidence)} font-medium`}
                      >
                        {generatedRule.confidence}% confidence
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    {/* Rule Summary */}
                    <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                      <div className="space-y-3">
                        <div>
                          <div className="font-semibold text-lg text-green-900">
                            {generatedRule.rule.name}
                          </div>
                          <div className="text-green-700 mt-1">
                            {generatedRule.rule.description}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-green-100">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Type:</span>
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              {generatedRule.rule.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Config:</span>
                            <span className="text-sm text-gray-600 truncate">
                              {formatRuleConfig(generatedRule.rule)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Explanation */}
                    {generatedRule.explanation && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-4 w-4 text-blue-600" />
                          <div className="font-medium text-blue-800">AI Explanation</div>
                        </div>
                        <div className="text-sm text-blue-700 leading-relaxed">
                          {generatedRule.explanation}
                        </div>
                      </div>
                    )}

                    {/* Alternative Interpretations */}
                    {generatedRule.suggestions.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-600" />
                          <div className="font-medium text-amber-800">Alternative Interpretations</div>
                        </div>
                        <div className="space-y-2">
                          {generatedRule.suggestions.map((suggestion, index) => (
                            <div 
                              key={index}
                              className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800"
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></div>
                                <span>{suggestion}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4 border-t border-green-200">
                      <div className="mb-2 text-xs text-gray-600">
                        Choose how to add this rule to your collection:
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleAddAndActivateRule} 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          size="lg"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Add & Activate Rule
                        </Button>
                        <Button 
                          onClick={handleAddRule} 
                          variant="outline"
                          className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                          size="lg"
                        >
                          <Settings className="h-5 w-5 mr-2" />
                          Add for Review
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <span className="font-medium text-green-700">Active:</span> Rule takes effect immediately
                        </div>
                        <div className="text-center">
                          <span className="font-medium text-gray-700">Review:</span> Add as inactive for manual activation
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setGeneratedRule(null)}
                        className="w-full border-gray-300 text-gray-600 hover:bg-gray-50"
                        size="sm"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Examples and Help */}
            <div className="space-y-6">
              {/* Data Context */}
              <Card className="border-indigo-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Settings className="h-4 w-4 text-indigo-600" />
                    </div>
                    Available Data Context
                  </CardTitle>
                  <CardDescription className="text-indigo-700 text-sm">
                    Use these entities in your rule descriptions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-blue-800">Client Groups ({availableData.clientGroups.length})</span>
                      </div>
                      <div className="text-blue-700 text-xs">
                        {availableData.clientGroups.length > 0 ? (
                          <>
                            {availableData.clientGroups.slice(0, 5).map(group => (
                              <Badge key={group} variant="outline" className="mr-1 mb-1 text-xs border-blue-300 text-blue-700">
                                {group}
                              </Badge>
                            ))}
                            {availableData.clientGroups.length > 5 && (
                              <span className="text-blue-600">+{availableData.clientGroups.length - 5} more</span>
                            )}
                          </>
                        ) : (
                          <span className="text-blue-600 italic">No client groups available</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-800">Worker Groups ({availableData.workerGroups.length})</span>
                      </div>
                      <div className="text-green-700 text-xs">
                        {availableData.workerGroups.length > 0 ? (
                          <>
                            {availableData.workerGroups.slice(0, 5).map(group => (
                              <Badge key={group} variant="outline" className="mr-1 mb-1 text-xs border-green-300 text-green-700">
                                {group}
                              </Badge>
                            ))}
                            {availableData.workerGroups.length > 5 && (
                              <span className="text-green-600">+{availableData.workerGroups.length - 5} more</span>
                            )}
                          </>
                        ) : (
                          <span className="text-green-600 italic">No worker groups available</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="font-medium text-purple-800">Tasks ({availableData.taskIds.length})</span>
                      </div>
                      <div className="text-purple-700 text-xs">
                        {availableData.taskIds.length > 0 ? (
                          <>
                            {availableData.taskIds.slice(0, 8).map(task => (
                              <Badge key={task} variant="outline" className="mr-1 mb-1 text-xs border-purple-300 text-purple-700">
                                {task}
                              </Badge>
                            ))}
                            {availableData.taskIds.length > 8 && (
                              <span className="text-purple-600">+{availableData.taskIds.length - 8} more</span>
                            )}
                          </>
                        ) : (
                          <span className="text-purple-600 italic">No tasks available</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="font-medium text-orange-800">Skills ({availableData.skills.length})</span>
                      </div>
                      <div className="text-orange-700 text-xs">
                        {availableData.skills.length > 0 ? (
                          <>
                            {availableData.skills.slice(0, 6).map(skill => (
                              <Badge key={skill} variant="outline" className="mr-1 mb-1 text-xs border-orange-300 text-orange-700">
                                {skill}
                              </Badge>
                            ))}
                            {availableData.skills.length > 6 && (
                              <span className="text-orange-600">+{availableData.skills.length - 6} more</span>
                            )}
                          </>
                        ) : (
                          <span className="text-orange-600 italic">No skills available</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Example Prompts */}
              <Card className="border-amber-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                    </div>
                    Example Prompts
                  </CardTitle>
                  <CardDescription className="text-amber-700 text-sm">
                    Click any example to try it out
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <Tabs
                    defaultValue={EXAMPLE_PROMPTS[0].category}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 bg-amber-50">
                      {EXAMPLE_PROMPTS.map(category => (
                        <TabsTrigger
                          key={category.category}
                          value={category.category}
                          className="text-xs data-[state=active]:bg-amber-100"
                        >
                          {category.category.replace(' Rules', '')}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {EXAMPLE_PROMPTS.map(category => (
                      <TabsContent
                        key={category.category}
                        value={category.category}
                        className="space-y-2 mt-4"
                      >
                        {category.examples.map((example, index) => (
                          <div
                            key={index}
                            className="group p-3 bg-white border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-all duration-200 shadow-sm"
                            onClick={() => handleExampleSelect(example)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs text-gray-700 group-hover:text-amber-800 flex-1 leading-relaxed">
                                "{example}"
                              </div>
                              <ArrowRight className="h-3 w-3 text-amber-400 group-hover:text-amber-600 mt-0.5 shrink-0" />
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* AI Tips */}
              <Card className="border-emerald-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    Tips for Better Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  {[
                    "Be specific about groups, tasks, and numbers",
                    "Use entities that exist in your data",
                    "Mention rule types explicitly when possible", 
                    "Include context about phases (1-5) for timing rules",
                    "Review and modify generated rules before adding"
                  ].map((tip, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-emerald-700">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0"></div>
                      <span>{tip}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 mt-6">
          {/* Templates Header */}
          <div className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-900">Rule Templates</h3>
                <p className="text-green-700">Start with pre-built rule patterns and customize them for your needs</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>12+ template categories</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Guided parameter input</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Instant rule preview</span>
              </div>
            </div>
          </div>
          
          <RuleTemplateWizard
            onRuleCreated={rule => {
              console.log('Template rule created:', rule);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
