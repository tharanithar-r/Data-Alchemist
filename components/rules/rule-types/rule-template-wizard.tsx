'use client'

import { Search, Filter, Star, AlertTriangle, CheckCircle, ArrowRight, Settings } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RuleTemplate, 
  RULE_TEMPLATES, 
  TEMPLATE_CATEGORIES, 
  searchTemplates,
  getSuggestedTemplates,
  validateTemplateParameters,
  TemplateParameter
} from '@/lib/rules/rule-templates'
import { useDataStore } from '@/lib/stores/data-store'
import { useRulesStore, BusinessRule } from '@/lib/stores/rules-store'

interface TemplateWizardProps {
  onRuleCreated?: (rule: BusinessRule) => void;
}

export function RuleTemplateWizard({ onRuleCreated }: TemplateWizardProps) {
  const { addRule } = useRulesStore()
  const { clients, workers, tasks } = useDataStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null)
  const [templateParams, setTemplateParams] = useState<Record<string, any>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<'browse' | 'customize' | 'preview'>('browse')

  // Extract data context for suggestions
  const dataContext = useMemo(() => {
    const clientGroups = [...new Set(clients.map(c => c.GroupTag).filter(Boolean))]
    const workerGroups = [...new Set(workers.map(w => w.WorkerGroup).filter(Boolean))]
    const taskIds = tasks.map(t => t.TaskID)
    const skills = [...new Set(workers.flatMap(w => w.Skills?.split(',') || []).map(s => s.trim()).filter(Boolean))]
    
    return {
      hasVipClients: clientGroups.some(g => g && (g.toLowerCase().includes('vip') || g.toLowerCase().includes('premium'))),
      hasMultipleTeams: workerGroups.length > 1,
      hasSkillData: skills.length > 0,
      hasPhaseData: tasks.some(t => t.PreferredPhases && t.PreferredPhases.length > 0),
      teamSizes: workerGroups.reduce((acc, group) => {
        if (group) {
          acc[group] = workers.filter(w => w.WorkerGroup === group).length;
        }
        return acc;
      }, {} as Record<string, number>),
      clientGroups,
      workerGroups,
      taskIds,
      skills
    };
  }, [clients, workers, tasks])

  // Filter templates based on search and filters
  const filteredTemplates = useMemo(() => {
    let templates = RULE_TEMPLATES;

    // Apply search
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      templates = templates.filter(t => t.difficulty === selectedDifficulty);
    }

    return templates;
  }, [searchQuery, selectedCategory, selectedDifficulty])

  // Get suggested templates
  const suggestedTemplates = useMemo(() => {
    return getSuggestedTemplates(dataContext);
  }, [dataContext])

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-50'
      case 'intermediate': return 'text-yellow-600 bg-yellow-50'
      case 'advanced': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Handle template selection
  const handleTemplateSelect = (template: RuleTemplate) => {
    setSelectedTemplate(template)
    
    // Initialize parameters with default values
    const initialParams: Record<string, any> = {}
    template.parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        initialParams[param.id] = param.defaultValue
      }
      
      // Populate dynamic options
      if (param.type === 'select' && param.options?.length === 0) {
        switch (param.id) {
          case 'workerGroup':
            param.options = dataContext.workerGroups.filter(Boolean).map(g => ({ value: g!, label: g! }))
            break
          case 'vipGroupTag':
            param.options = dataContext.clientGroups.filter(Boolean).map(g => ({ value: g!, label: g! }))
            break
          case 'skillPattern':
            param.options = dataContext.skills.map(s => ({ value: s, label: s }))
            break
          case 'taskId':
            param.options = dataContext.taskIds.map(id => ({ value: id, label: id }))
            break
        }
      }
      
      if (param.type === 'multiselect' && param.options?.length === 0) {
        switch (param.id) {
          case 'taskIds':
            param.options = dataContext.taskIds.map(id => ({ value: id, label: id }))
            break
        }
      }
    })
    
    setTemplateParams(initialParams)
    setValidationErrors([])
    setCurrentStep('customize')
  }

  // Handle parameter change
  const handleParameterChange = (paramId: string, value: any) => {
    setTemplateParams(prev => ({
      ...prev,
      [paramId]: value
    }))
    setValidationErrors([])
  }

  // Handle template customization completion
  const handleCustomizeComplete = () => {
    if (!selectedTemplate) return

    const validation = validateTemplateParameters(selectedTemplate, templateParams)
    if (!validation.valid) {
      setValidationErrors(validation.errors)
      return
    }

    setCurrentStep('preview')
  }

  // Handle rule creation
  const handleCreateRule = () => {
    if (!selectedTemplate) return

    const generatedRule = selectedTemplate.generateRule(templateParams)
    const rule: BusinessRule = {
      ...generatedRule,
      id: `template-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false
    } as BusinessRule

    addRule(rule)
    onRuleCreated?.(rule)
    
    // Reset wizard
    setSelectedTemplate(null)
    setTemplateParams({})
    setValidationErrors([])
    setCurrentStep('browse')
  }

  // Render parameter input
  const renderParameterInput = (param: TemplateParameter) => {
    const value = templateParams[param.id]

    switch (param.type) {
      case 'string':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleParameterChange(param.id, e.target.value)}
            placeholder={param.description}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleParameterChange(param.id, parseInt(e.target.value) || 0)}
            min={param.validation?.min}
            max={param.validation?.max}
            placeholder={param.description}
          />
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => handleParameterChange(param.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${param.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <div className="space-y-2">
            {param.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${param.id}-${option.value}`}
                  checked={value?.includes(option.value) || false}
                  onCheckedChange={(checked) => {
                    const current = value || []
                    if (checked) {
                      handleParameterChange(param.id, [...current, option.value])
                    } else {
                      handleParameterChange(param.id, current.filter((v: string) => v !== option.value))
                    }
                  }}
                />
                <Label htmlFor={`${param.id}-${option.value}`} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        )

      case 'phase-array':
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">Select allowed phases:</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(phase => (
                <div key={phase} className="flex items-center space-x-1">
                  <Checkbox
                    id={`${param.id}-phase-${phase}`}
                    checked={value?.includes(phase) || false}
                    onCheckedChange={(checked) => {
                      const current = value || []
                      if (checked) {
                        handleParameterChange(param.id, [...current, phase].sort())
                      } else {
                        handleParameterChange(param.id, current.filter((v: number) => v !== phase))
                      }
                    }}
                  />
                  <Label htmlFor={`${param.id}-phase-${phase}`} className="text-sm">
                    Phase {phase}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={param.id}
              checked={value || false}
              onCheckedChange={(checked) => handleParameterChange(param.id, checked)}
            />
            <Label htmlFor={param.id} className="text-sm">
              {param.description}
            </Label>
          </div>
        )

      default:
        return <div className="text-gray-500">Unsupported parameter type</div>
    }
  }

  if (currentStep === 'customize' && selectedTemplate) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setCurrentStep('browse')}>
            ← Back to Templates
          </Button>
          <div>
            <h3 className="text-xl font-bold">{selectedTemplate.name}</h3>
            <p className="text-gray-600">{selectedTemplate.description}</p>
          </div>
        </div>

        {/* Parameter Form */}
        <Card>
          <CardHeader>
            <CardTitle>Customize Template Parameters</CardTitle>
            <CardDescription>
              Configure the parameters for your rule template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedTemplate.parameters.map(param => (
              <div key={param.id} className="space-y-2">
                <Label className="text-sm font-medium">
                  {param.label}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <div className="text-xs text-gray-600 mb-2">{param.description}</div>
                {renderParameterInput(param)}
              </div>
            ))}

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCustomizeComplete} className="flex-1">
                Preview Rule <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentStep === 'preview' && selectedTemplate) {
    const previewRule = selectedTemplate.generateRule(templateParams)
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setCurrentStep('customize')}>
            ← Back to Customize
          </Button>
          <div>
            <h3 className="text-xl font-bold">Rule Preview</h3>
            <p className="text-gray-600">Review your rule before creating</p>
          </div>
        </div>

        {/* Preview */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">{previewRule.name}</CardTitle>
            <CardDescription className="text-green-700">
              {previewRule.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Type:</span> {previewRule.type}
              </div>
              <div>
                <span className="font-medium">Template:</span> {selectedTemplate.name}
              </div>
            </div>

            <div className="p-3 bg-green-100 rounded">
              <div className="font-medium text-green-800 mb-2">Configuration:</div>
              <pre className="text-sm text-green-700 whitespace-pre-wrap">
                {JSON.stringify(previewRule, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateRule} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep('browse')} className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Search and Filters */}
      <Card className="border-green-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <div className="p-2 bg-green-100 rounded-lg">
              <Search className="h-4 w-4 text-green-600" />
            </div>
            Find Templates
          </CardTitle>
          <CardDescription className="text-green-700">
            Search and filter through 12+ rule templates
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TEMPLATE_CATEGORIES.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="suggested" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suggested" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Suggested ({suggestedTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            All Templates ({filteredTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggested">
          {suggestedTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedTemplates.map(template => (
                <Card key={template.id} className="cursor-pointer border-blue-200 bg-blue-50 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge className={`text-xs ${getDifficultyColor(template.difficulty)}`}>
                            {template.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="text-xs text-blue-600 mb-3 italic">{template.useCase}</div>
                    <Button 
                      size="sm" 
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full"
                    >
                      Use Template <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Settings className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No templates suggested based on your current data.</p>
                <p className="text-sm text-gray-500">Upload more data to get personalized recommendations.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all">
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge className={`text-xs ${getDifficultyColor(template.difficulty)}`}>
                            {template.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full"
                    >
                      Use Template <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Search className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No templates found matching your criteria.</p>
                <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}