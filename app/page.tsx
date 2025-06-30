'use client'

import { AlertTriangle, Briefcase, CheckCircle, ClipboardList, Search, Upload, Users, Settings, TrendingUp } from 'lucide-react'
import { useEffect } from 'react'

import { AutoSaveStatus } from '@/components/auto-save/auto-save-status'
import { RecoveryDialog } from '@/components/auto-save/recovery-dialog'
import { ClientGrid } from '@/components/data-grids/client-grid'
import { TaskGrid } from '@/components/data-grids/task-grid'
import { WorkerGrid } from '@/components/data-grids/worker-grid'
import { PrioritizationManager } from '@/components/prioritization/prioritization-manager'
import { RuleBuilder } from '@/components/rules/rule-builder'
import { NaturalLanguageSearch } from '@/components/search/natural-language-search'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from '@/components/upload/file-upload'
import { useDataStoreSelectors } from '@/lib/stores/data-store'
import { useRulesStore } from '@/lib/stores/rules-store'
import { useValidationStore } from '@/lib/stores/validation-store'
import { ValidationEngine } from '@/lib/validation/validation-engine'

export default function Home() {
  const { clients, workers, tasks, hasData } = useDataStoreSelectors()
  const { 
    validationSummary, 
    setValidationSummary, 
    setIsValidating,
    realtimeValidation 
  } = useValidationStore()
  const { getActiveRules } = useRulesStore()

  // Real-time validation effect
  useEffect(() => {
    if (!realtimeValidation || (!hasData)) return

    const validateData = async () => {
      setIsValidating(true)
      try {
        const summary = await ValidationEngine.validateAll(clients, workers, tasks)
        setValidationSummary(summary)
      } catch (error) {
        console.error('Validation failed:', error)
      } finally {
        setIsValidating(false)
      }
    }

    // Debounce validation
    const timeoutId = setTimeout(validateData, 300)
    return () => clearTimeout(timeoutId)
  }, [clients, workers, tasks, hasData, realtimeValidation, setValidationSummary, setIsValidating])

  const totalEntities = clients.length + workers.length + tasks.length
  const hasErrors = validationSummary ? validationSummary.totalErrors > 0 : false
  const hasWarnings = validationSummary ? validationSummary.totalWarnings > 0 : false
  const activeRules = getActiveRules()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Recovery Dialog */}
      <RecoveryDialog />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Alchemist</h1>
              <p className="text-gray-600 mt-1">
                Transform messy spreadsheet data into clean, validated datasets
              </p>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center gap-4">
              {totalEntities > 0 && (
                <Badge variant="outline" className="flex items-center gap-2">
                  <span>{totalEntities} entities loaded</span>
                </Badge>
              )}
              
              {validationSummary && (
                <div className="flex items-center gap-2">
                  {hasErrors ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {validationSummary.totalErrors} errors
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      No errors
                    </Badge>
                  )}
                  
                  {hasWarnings && (
                    <Badge variant="outline" className="flex items-center gap-1 text-yellow-600">
                      <AlertTriangle className="h-3 w-3" />
                      {validationSummary.totalWarnings} warnings
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Auto-save status */}
              <AutoSaveStatus />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
              {hasData && (
                <Badge variant="outline" className="ml-1">
                  AI
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clients
              {clients.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {clients.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="workers" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Workers
              {workers.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {workers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Tasks
              {tasks.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Rules
              {activeRules.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeRules.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Validation
              {hasErrors && (
                <Badge variant="destructive" className="ml-1">
                  {validationSummary?.totalErrors}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="prioritization" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Prioritization
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="grid gap-6">
              <FileUpload className="max-w-4xl mx-auto" />
              
              {hasData && (
                <Card className="max-w-4xl mx-auto">
                  <CardHeader>
                    <CardTitle>Data Summary</CardTitle>
                    <CardDescription>
                      Overview of loaded data and validation status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {clients.length}
                        </div>
                        <div className="text-sm text-gray-600">Clients</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {workers.length}
                        </div>
                        <div className="text-sm text-gray-600">Workers</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {tasks.length}
                        </div>
                        <div className="text-sm text-gray-600">Tasks</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search">
            {hasData ? (
              <NaturalLanguageSearch 
                onResultSelect={(_result) => {
                }}
                onResultsChange={(_results) => {
                }}
              />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Data to Search
                  </h3>
                  <p className="text-gray-600">
                    Upload some data first to use the AI-powered search feature
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <ClientGrid />
          </TabsContent>

          {/* Workers Tab */}
          <TabsContent value="workers">
            <WorkerGrid />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <TaskGrid />
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <RuleBuilder />
          </TabsContent>

          {/* Prioritization Tab */}
          <TabsContent value="prioritization" className="space-y-6">
            <PrioritizationManager />
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Validation Summary
                </CardTitle>
                <CardDescription>
                  Data quality analysis and error reporting
                </CardDescription>
              </CardHeader>
              <CardContent>
                {validationSummary ? (
                  <div className="space-y-4">
                    {/* Overall status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium">Errors</span>
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          {validationSummary.totalErrors}
                        </div>
                        <div className="text-sm text-gray-600">
                          Must be fixed before export
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">Warnings</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {validationSummary.totalWarnings}
                        </div>
                        <div className="text-sm text-gray-600">
                          Recommended improvements
                        </div>
                      </div>
                    </div>

                    {/* Entity-specific validation */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Validation by Entity Type</h4>
                      
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="font-medium">Clients</span>
                          <div className="flex items-center gap-2">
                            {validationSummary.clients.errors.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {validationSummary.clients.errors.length} errors
                              </Badge>
                            )}
                            {validationSummary.clients.warnings.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {validationSummary.clients.warnings.length} warnings
                              </Badge>
                            )}
                            {validationSummary.clients.isValid && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                ✓ Valid
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="font-medium">Workers</span>
                          <div className="flex items-center gap-2">
                            {validationSummary.workers.errors.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {validationSummary.workers.errors.length} errors
                              </Badge>
                            )}
                            {validationSummary.workers.warnings.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {validationSummary.workers.warnings.length} warnings
                              </Badge>
                            )}
                            {validationSummary.workers.isValid && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                ✓ Valid
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="font-medium">Tasks</span>
                          <div className="flex items-center gap-2">
                            {validationSummary.tasks.errors.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {validationSummary.tasks.errors.length} errors
                              </Badge>
                            )}
                            {validationSummary.tasks.warnings.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {validationSummary.tasks.warnings.length} warnings
                              </Badge>
                            )}
                            {validationSummary.tasks.isValid && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                ✓ Valid
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded">
                          <span className="font-medium">Cross-Entity</span>
                          <div className="flex items-center gap-2">
                            {validationSummary.crossEntity.errors.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {validationSummary.crossEntity.errors.length} errors
                              </Badge>
                            )}
                            {validationSummary.crossEntity.warnings.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {validationSummary.crossEntity.warnings.length} warnings
                              </Badge>
                            )}
                            {validationSummary.crossEntity.isValid && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                ✓ Valid
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No data to validate
                    </h3>
                    <p className="text-gray-600">
                      Upload data to see validation results
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}