'use client'

import { Eye, Download, AlertTriangle, FileText, Database, Settings, ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  exportAllEntitiesToCSV, 
  ExportOptions 
} from '@/lib/export/csv-exporter'
import { 
  generateRulesConfiguration,
  validateRulesConfiguration 
} from '@/lib/export/rules-json-generator'
import { useDataStore } from '@/lib/stores/data-store'
import { useRulesStore } from '@/lib/stores/rules-store'
import { useValidationStore } from '@/lib/stores/validation-store'
import { Client, Worker, Task } from '@/lib/types/entities'

interface ExportPreviewProps {
  exportOptions: ExportOptions
  onExport: () => void
  isExporting?: boolean
}

interface PreviewData {
  clients: Client[]
  workers: Worker[]
  tasks: Task[]
  rules: any
  summary: {
    totalRows: number
    skippedRows: number
    warnings: string[]
  }
}

export function ExportPreview({ exportOptions, onExport, isExporting = false }: ExportPreviewProps) {
  const { clients, workers, tasks } = useDataStore()
  const { rules, priorityWeights, priorityMethod, presetProfile } = useRulesStore()
  const { validationSummary } = useValidationStore()
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    clients: false,
    workers: false,
    tasks: false,
    rules: false
  })

  // Generate preview data
  const previewData = useMemo<PreviewData>(() => {
    // Generate CSV export data
    const csvResults = exportAllEntitiesToCSV(
      clients,
      workers,
      tasks,
      validationSummary || undefined,
      exportOptions
    )

    // Parse CSV results to get actual data
    const parseCSVToObjects = (csvContent: string, headers: string[]) => {
      const lines = csvContent.split('\n').filter(line => line.trim())
      if (lines.length <= 1) return []
      
      return lines.slice(1).map(line => {
        const values = line.split(',').map(val => val.replace(/^"|"$/g, '')) // Remove quotes
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = values[index] || ''
        })
        return obj
      })
    }

    const clientHeaders = ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON']
    const workerHeaders = ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel']
    const taskHeaders = ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent']

    const previewClients = csvResults.clients.success 
      ? parseCSVToObjects(csvResults.clients.csvContent, clientHeaders)
      : []
    const previewWorkers = csvResults.workers.success 
      ? parseCSVToObjects(csvResults.workers.csvContent, workerHeaders)
      : []
    const previewTasks = csvResults.tasks.success 
      ? parseCSVToObjects(csvResults.tasks.csvContent, taskHeaders)
      : []

    // Generate rules configuration
    const rulesConfig = generateRulesConfiguration(
      rules,
      priorityWeights,
      priorityMethod,
      presetProfile,
      clients,
      workers,
      tasks
    )

    return {
      clients: previewClients,
      workers: previewWorkers,
      tasks: previewTasks,
      rules: rulesConfig,
      summary: {
        totalRows: csvResults.summary.totalRows,
        skippedRows: csvResults.summary.totalSkipped,
        warnings: csvResults.summary.allWarnings
      }
    }
  }, [clients, workers, tasks, rules, priorityWeights, priorityMethod, presetProfile, validationSummary, exportOptions])

  // Validation results
  const rulesValidation = useMemo(() => {
    return validateRulesConfiguration(rules, clients, workers, tasks)
  }, [rules, clients, workers, tasks])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const renderDataPreview = (
    data: any[], 
    entityType: 'clients' | 'workers' | 'tasks',
    icon: React.ReactNode,
    color: string
  ) => {
    const isExpanded = expandedSections[entityType]
    const previewCount = 3
    const displayData = data.slice(0, previewCount)
    
    return (
      <Card>
        <Collapsible open={isExpanded} onOpenChange={() => toggleSection(entityType)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color}`}>
                    {icon}
                  </div>
                  <div>
                    <CardTitle className="capitalize">{entityType}</CardTitle>
                    <CardDescription>
                      {data.length} records will be exported
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{data.length} rows</Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              {data.length > 0 ? (
                <div className="space-y-3">
                  {/* Sample data preview */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <div className="text-sm font-medium">
                        Sample Data (showing {Math.min(previewCount, data.length)} of {data.length} records)
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            {Object.keys(displayData[0] || {}).map(key => (
                              <th key={key} className="text-left p-2 font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayData.map((row, index) => (
                            <tr key={index} className="border-t">
                              {Object.values(row).map((value: any, cellIndex) => (
                                <td key={cellIndex} className="p-2 max-w-32 truncate">
                                  {typeof value === 'string' && value.length > 30 
                                    ? `${value.substring(0, 30)}...` 
                                    : String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Data transformations applied */}
                  <div className="text-sm space-y-2">
                    <div className="font-medium text-gray-700">Applied Transformations:</div>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {exportOptions.applyNormalization && (
                        <>
                          <li>Data normalization applied</li>
                          {entityType === 'workers' && <li>QualificationLevel converted to string format</li>}
                          {entityType === 'tasks' && <li>PreferredPhases normalized to JSON arrays</li>}
                          {entityType === 'clients' && <li>AttributesJSON validated and formatted</li>}
                        </>
                      )}
                      {!exportOptions.includeInvalidRows && (
                        <li>Invalid rows filtered out</li>
                      )}
                      <li>Cross-reference validation applied</li>
                      <li>Production-ready CSV format</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No data to export
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }

  const renderRulesPreview = () => {
    const isExpanded = expandedSections.rules
    const activeRules = previewData.rules.configuration.rules.filter((r: any) => r.isActive)
    
    return (
      <Card>
        <Collapsible open={isExpanded} onOpenChange={() => toggleSection('rules')}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Settings className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Rules Configuration</CardTitle>
                    <CardDescription>
                      Business rules and prioritization settings
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{activeRules.length} active rules</Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Rules Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-600">
                      {previewData.rules.statistics.totalRules}
                    </div>
                    <div className="text-xs text-blue-700">Total Rules</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">
                      {previewData.rules.statistics.activeRules}
                    </div>
                    <div className="text-xs text-green-700">Active Rules</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <div className="text-lg font-bold text-purple-600">
                      {Object.keys(previewData.rules.statistics.rulesByType).length}
                    </div>
                    <div className="text-xs text-purple-700">Rule Types</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <div className="text-lg font-bold text-orange-600">
                      {previewData.rules.statistics.conflictResolution.length}
                    </div>
                    <div className="text-xs text-orange-700">Conflicts Resolved</div>
                  </div>
                </div>

                {/* Active Rules List */}
                {activeRules.length > 0 && (
                  <div>
                    <div className="font-medium text-gray-700 mb-2">Active Rules:</div>
                    <div className="space-y-2">
                      {activeRules.slice(0, 5).map((rule: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium text-sm">{rule.name}</div>
                            <div className="text-xs text-gray-600">{rule.type}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Priority {rule.priority}
                          </Badge>
                        </div>
                      ))}
                      {activeRules.length > 5 && (
                        <div className="text-sm text-gray-500 text-center">
                          ... and {activeRules.length - 5} more rules
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prioritization Settings */}
                <div>
                  <div className="font-medium text-gray-700 mb-2">Prioritization Configuration:</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Method: <span className="font-medium">{previewData.rules.configuration.prioritization.method}</span></div>
                    <div>Profile: <span className="font-medium">{previewData.rules.configuration.prioritization.presetProfile}</span></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    <div>Weight Distribution:</div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {Object.entries(previewData.rules.configuration.prioritization.normalizedWeights).map(([key, value]) => (
                        <div key={key}>
                          {key}: {Math.round((value as number) * 100)}%
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* JSON Structure Preview */}
                <div>
                  <div className="font-medium text-gray-700 mb-2">Configuration Structure:</div>
                  <div className="bg-gray-100 p-3 rounded text-xs font-mono">
                    <div>version: "{previewData.rules.version}"</div>
                    <div>generatedAt: "{previewData.rules.generatedAt}"</div>
                    <div>configuration: {'{'}rules, prioritization, dataContext{'}'}</div>
                    <div>statistics: {'{'}totalRules, activeRules, rulesByType, conflictResolution{'}'}</div>
                    <div>compatibility: {'{'}allocationEngine, schemaVersion, requiredFeatures{'}'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Eye className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Export Preview</h3>
            <p className="text-gray-600">
              Review your data and configuration before export
            </p>
          </div>
        </div>
        
        <Button 
          onClick={onExport}
          disabled={isExporting || !rulesValidation.isValid}
          className="bg-green-600 hover:bg-green-700"
        >
          {isExporting ? (
            <>
              <Download className="h-4 w-4 mr-2 animate-pulse" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Confirm Export
            </>
          )}
        </Button>
      </div>

      {/* Validation Status */}
      {!rulesValidation.isValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Configuration has {rulesValidation.errors.length} error(s) that must be fixed before export.
          </AlertDescription>
        </Alert>
      )}

      {rulesValidation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {rulesValidation.warnings.length} warning(s) found. Export will continue but review recommended.
          </AlertDescription>
        </Alert>
      )}

      {previewData.summary.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Export warnings: {previewData.summary.warnings.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Export Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Export Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {previewData.summary.totalRows}
              </div>
              <div className="text-sm text-gray-600">Total Rows</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {previewData.summary.totalRows - previewData.summary.skippedRows}
              </div>
              <div className="text-sm text-gray-600">Valid Rows</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {previewData.summary.skippedRows}
              </div>
              <div className="text-sm text-gray-600">Skipped Rows</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                4
              </div>
              <div className="text-sm text-gray-600">Files Generated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Tabs */}
      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="data" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Data Preview
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Rules Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4 mt-6">
          {/* Data Preview */}
          <div className="space-y-4">
            {renderDataPreview(
              previewData.clients,
              'clients',
              <Database className="h-5 w-5 text-blue-600" />,
              'bg-blue-100'
            )}
            
            {renderDataPreview(
              previewData.workers,
              'workers',
              <Database className="h-5 w-5 text-green-600" />,
              'bg-green-100'
            )}
            
            {renderDataPreview(
              previewData.tasks,
              'tasks',
              <Database className="h-5 w-5 text-purple-600" />,
              'bg-purple-100'
            )}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4 mt-6">
          {renderRulesPreview()}
        </TabsContent>
      </Tabs>

      {/* Export Options Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Export Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Data Normalization:</span>
              <Badge variant={exportOptions.applyNormalization ? 'default' : 'secondary'}>
                {exportOptions.applyNormalization ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Validation Metadata:</span>
              <Badge variant={exportOptions.includeValidationMetadata ? 'default' : 'secondary'}>
                {exportOptions.includeValidationMetadata ? 'Included' : 'Excluded'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Invalid Rows:</span>
              <Badge variant={exportOptions.includeInvalidRows ? 'destructive' : 'default'}>
                {exportOptions.includeInvalidRows ? 'Included' : 'Filtered Out'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}