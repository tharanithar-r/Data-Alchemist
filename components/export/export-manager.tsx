'use client'

import { Download, FileText, Database, Settings, CheckCircle, AlertTriangle, Loader2, Package, Zap } from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  createBulkDownload,
  BulkDownloadProgress,
  BulkDownloadResult,
  BulkDownloadOptions,
  generateDownloadSummary
} from '@/lib/export/bulk-download'
import { 
  exportAllEntitiesToCSV, 
  ExportOptions,
  generateCSVDownload 
} from '@/lib/export/csv-exporter'
import { 
  generateRulesDownload,
  validateRulesConfiguration,
  ValidationResult
} from '@/lib/export/rules-json-generator'
import { useDataStore } from '@/lib/stores/data-store'
import { useRulesStore } from '@/lib/stores/rules-store'
import { useValidationStore } from '@/lib/stores/validation-store'

import { ExportPreview } from './export-preview'


interface ExportStatus {
  isExporting: boolean
  currentStep: string
  progress: number
  completed: string[]
  errors: string[]
  bulkDownloadResult?: BulkDownloadResult
}

export function ExportManager() {
  const { clients, workers, tasks } = useDataStore()
  const { 
    rules, 
    priorityWeights, 
    priorityMethod, 
    presetProfile 
  } = useRulesStore()
  const { validationSummary } = useValidationStore()
  
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    isExporting: false,
    currentStep: '',
    progress: 0,
    completed: [],
    errors: []
  })
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeInvalidRows: false,
    includeValidationMetadata: true,
    applyNormalization: true
  })
  
  const [rulesValidation, setRulesValidation] = useState<ValidationResult | null>(null)

  // Validate rules configuration before export
  const validateRules = () => {
    const validation = validateRulesConfiguration(rules, clients, workers, tasks)
    setRulesValidation(validation)
    return validation
  }

  // Export individual CSV files
  const exportCSVFiles = async () => {
    try {
      setExportStatus(prev => ({
        ...prev,
        currentStep: 'Exporting CSV files...',
        progress: 10
      }))

      const csvResults = exportAllEntitiesToCSV(
        clients,
        workers, 
        tasks,
        validationSummary || undefined,
        exportOptions
      )

      // Generate individual CSV downloads
      if (csvResults.clients.success) {
        generateCSVDownload(csvResults.clients.csvContent, 'clients-clean.csv')
        setExportStatus(prev => ({
          ...prev,
          completed: [...prev.completed, 'clients.csv'],
          progress: 30
        }))
      } else {
        throw new Error(`Clients export failed: ${csvResults.clients.error}`)
      }

      if (csvResults.workers.success) {
        generateCSVDownload(csvResults.workers.csvContent, 'workers-clean.csv')
        setExportStatus(prev => ({
          ...prev,
          completed: [...prev.completed, 'workers.csv'],
          progress: 50
        }))
      } else {
        throw new Error(`Workers export failed: ${csvResults.workers.error}`)
      }

      if (csvResults.tasks.success) {
        generateCSVDownload(csvResults.tasks.csvContent, 'tasks-clean.csv')
        setExportStatus(prev => ({
          ...prev,
          completed: [...prev.completed, 'tasks.csv'],
          progress: 70
        }))
      } else {
        throw new Error(`Tasks export failed: ${csvResults.tasks.error}`)
      }

      return csvResults.summary

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'CSV export failed'
      setExportStatus(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage]
      }))
      throw error
    }
  }

  // Export rules configuration JSON
  const exportRulesConfig = async () => {
    try {
      setExportStatus(prev => ({
        ...prev,
        currentStep: 'Generating rules configuration...',
        progress: 80
      }))

      generateRulesDownload(
        rules,
        priorityWeights,
        priorityMethod,
        presetProfile,
        clients,
        workers,
        tasks
      )

      setExportStatus(prev => ({
        ...prev,
        completed: [...prev.completed, 'rules.json'],
        progress: 100
      }))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rules export failed'
      setExportStatus(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage]
      }))
      throw error
    }
  }

  // Bulk download function - enhanced Generate Rules Config
  const handleBulkDownload = async () => {
    setExportStatus({
      isExporting: true,
      currentStep: 'Preparing bulk download...',
      progress: 0,
      completed: [],
      errors: []
    })

    try {
      // Validate first
      const validation = validateRules()
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
      }

      // Create bulk download options
      const bulkOptions: BulkDownloadOptions = {
        ...exportOptions,
        includeTimestamp: true,
        projectName: 'data-alchemist-export'
      }

      // Progress callback
      const handleProgress = (progress: BulkDownloadProgress) => {
        setExportStatus(prev => ({
          ...prev,
          currentStep: progress.currentStep,
          progress: progress.progress,
          completed: prev.completed // Keep existing completed files
        }))
      }

      // Create bulk download
      const result = await createBulkDownload(
        clients,
        workers,
        tasks,
        rules,
        priorityWeights,
        priorityMethod,
        presetProfile,
        validationSummary || undefined,
        bulkOptions,
        handleProgress
      )

      // Update status with result
      setExportStatus(prev => ({
        ...prev,
        currentStep: result.success ? 'Bulk download completed!' : 'Bulk download failed',
        progress: 100,
        isExporting: false,
        completed: result.success ? ['Bulk ZIP file'] : prev.completed,
        errors: result.success ? prev.errors : [...prev.errors, ...result.errors],
        bulkDownloadResult: result
      }))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk download failed'
      setExportStatus(prev => ({
        ...prev,
        currentStep: 'Bulk download failed',
        errors: [...prev.errors, errorMessage],
        isExporting: false
      }))
    }
  }

  // Individual export function - Generate Rules Config (legacy - kept for individual exports)
  // const handleGenerateRulesConfig = async () => {
  //   setExportStatus({
  //     isExporting: true,
  //     currentStep: 'Validating configuration...',
  //     progress: 0,
  //     completed: [],
  //     errors: []
  //   })

  //   try {
  //     // Step 1: Validate rules configuration
  //     const validation = validateRules()
  //     if (!validation.isValid) {
  //       throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
  //     }

  //     // Step 2: Export CSV files
  //     await exportCSVFiles()

  //     // Step 3: Export rules configuration
  //     await exportRulesConfig()

  //     // Step 4: Complete
  //     setExportStatus(prev => ({
  //       ...prev,
  //       currentStep: 'Export completed successfully!',
  //       progress: 100,
  //       isExporting: false
  //     }))

  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : 'Export failed'
  //     setExportStatus(prev => ({
  //       ...prev,
  //       currentStep: 'Export failed',
  //       errors: [...prev.errors, errorMessage],
  //       isExporting: false
  //     }))
  //   }
  // }

  // Export individual components
  const handleExportCSVOnly = async () => {
    setExportStatus({
      isExporting: true,
      currentStep: 'Exporting CSV files...',
      progress: 0,
      completed: [],
      errors: []
    })

    try {
      await exportCSVFiles()
      setExportStatus(prev => ({
        ...prev,
        currentStep: 'CSV export completed!',
        progress: 100,
        isExporting: false
      }))
    } catch (error) {
      setExportStatus(prev => ({
        ...prev,
        currentStep: 'CSV export failed',
        isExporting: false
      }))
    }
  }

  const handleExportRulesOnly = async () => {
    setExportStatus({
      isExporting: true,
      currentStep: 'Validating and exporting rules...',
      progress: 0,
      completed: [],
      errors: []
    })

    try {
      const validation = validateRules()
      if (!validation.isValid) {
        throw new Error(`Rules validation failed: ${validation.errors.join(', ')}`)
      }

      await exportRulesConfig()
      setExportStatus(prev => ({
        ...prev,
        currentStep: 'Rules export completed!',
        progress: 100,
        isExporting: false
      }))
    } catch (error) {
      setExportStatus(prev => ({
        ...prev,
        currentStep: 'Rules export failed',
        isExporting: false
      }))
    }
  }

  // Calculate readiness status
  const hasData = clients.length > 0 && workers.length > 0 && tasks.length > 0
  const hasRules = rules.length > 0
  const hasValidData = validationSummary?.totalErrors === 0
  const isReady = hasData && hasValidData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <Package className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Export Manager</h2>
          <p className="text-gray-600">
            Generate clean data files and rules configuration for allocation systems
          </p>
        </div>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">Export Files</TabsTrigger>
          <TabsTrigger value="preview">Preview Data</TabsTrigger>
          <TabsTrigger value="settings">Export Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-6 mt-6">
          {/* Readiness Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className={`h-5 w-5 ${isReady ? 'text-green-600' : 'text-yellow-600'}`} />
                Export Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="text-sm font-medium">Data Loaded</span>
                  </div>
                  <Badge variant={hasData ? 'default' : 'secondary'}>
                    {hasData ? 'Ready' : 'Missing'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Data Valid</span>
                  </div>
                  <Badge variant={hasValidData ? 'default' : 'destructive'}>
                    {hasValidData ? 'Valid' : `${validationSummary?.totalErrors || 0} errors`}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Rules Created</span>
                  </div>
                  <Badge variant={hasRules ? 'default' : 'secondary'}>
                    {hasRules ? `${rules.length} rules` : 'Optional'}
                  </Badge>
                </div>
              </div>

              {!isReady && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {!hasData && "Please upload data files before exporting. "}
                    {!hasValidData && "Please fix validation errors before exporting. "}
                    Visit the Upload and Validation tabs to resolve issues.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Main Export Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generate Rules Config - Primary Action */}
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Zap className="h-5 w-5" />
                  Generate Rules Config
                </CardTitle>
                <CardDescription>
                  Complete export package: clean CSV files + rules.json configuration ready for allocation systems
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Includes:</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• clients-clean.csv ({clients.length} records)</li>
                    <li>• workers-clean.csv ({workers.length} records)</li>
                    <li>• tasks-clean.csv ({tasks.length} records)</li>
                    <li>• rules-config.json ({rules.filter(r => r.isActive).length} active rules)</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleBulkDownload}
                  disabled={!isReady || exportStatus.isExporting}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {exportStatus.isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {exportStatus.currentStep}
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Generate Rules Config (ZIP)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Individual Exports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Individual Exports
                </CardTitle>
                <CardDescription>
                  Export CSV files or rules configuration separately
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleExportCSVOnly}
                  disabled={!isReady || exportStatus.isExporting}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV Files Only
                </Button>
                
                <Button 
                  onClick={handleExportRulesOnly}
                  disabled={!hasRules || exportStatus.isExporting}
                  variant="outline"
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Export Rules Config Only
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Export Status */}
          {(exportStatus.isExporting || exportStatus.completed.length > 0 || exportStatus.errors.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Export Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {exportStatus.isExporting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{exportStatus.currentStep}</span>
                      <span className="text-sm text-gray-500">{exportStatus.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${exportStatus.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {exportStatus.completed.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Completed:</div>
                    <div className="flex flex-wrap gap-2">
                      {exportStatus.completed.map((file, index) => (
                        <Badge key={index} className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {file}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {exportStatus.errors.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2 text-red-800">Errors:</div>
                    <div className="space-y-1">
                      {exportStatus.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {exportStatus.bulkDownloadResult && (
                  <div>
                    <div className="text-sm font-medium mb-2">Download Summary:</div>
                    {(() => {
                      const summary = generateDownloadSummary(exportStatus.bulkDownloadResult)
                      return (
                        <Alert variant={summary.type === 'error' ? 'destructive' : 'default'}>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium">{summary.title}</div>
                            <div className="text-sm mt-1">{summary.message}</div>
                          </AlertDescription>
                        </Alert>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6 mt-6">
          {isReady ? (
            <ExportPreview 
              exportOptions={exportOptions}
              onExport={handleBulkDownload}
              isExporting={exportStatus.isExporting}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Preview Not Available
                </h3>
                <p className="text-gray-600">
                  {!hasData && "Upload data files first to preview export. "}
                  {!hasValidData && "Fix validation errors to enable export preview. "}
                  Visit the Upload and Validation tabs to resolve issues.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>
                Configure how data is processed and exported
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="normalize">Apply Data Normalization</Label>
                    <p className="text-sm text-gray-600">
                      Convert data to production-ready format (recommended)
                    </p>
                  </div>
                  <Switch
                    id="normalize"
                    checked={exportOptions.applyNormalization}
                    onCheckedChange={(checked: boolean) => 
                      setExportOptions(prev => ({ ...prev, applyNormalization: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="validation-metadata">Include Validation Metadata</Label>
                    <p className="text-sm text-gray-600">
                      Add validation status information to exports
                    </p>
                  </div>
                  <Switch
                    id="validation-metadata"
                    checked={exportOptions.includeValidationMetadata}
                    onCheckedChange={(checked: boolean) => 
                      setExportOptions(prev => ({ ...prev, includeValidationMetadata: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="invalid-rows">Include Invalid Rows</Label>
                    <p className="text-sm text-gray-600">
                      Include rows with validation errors (not recommended for production)
                    </p>
                  </div>
                  <Switch
                    id="invalid-rows"
                    checked={exportOptions.includeInvalidRows}
                    onCheckedChange={(checked: boolean) => 
                      setExportOptions(prev => ({ ...prev, includeInvalidRows: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules Validation */}
          <Card>
            <CardHeader>
              <CardTitle>Rules Validation</CardTitle>
              <CardDescription>
                Check rules configuration before export
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={validateRules}
                variant="outline"
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate Rules Configuration
              </Button>

              {rulesValidation && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total Rules: {rulesValidation.statistics.totalRules}</div>
                    <div>Active Rules: {rulesValidation.statistics.activeRules}</div>
                    <div>Conflicts: {rulesValidation.statistics.conflictCount}</div>
                    <div>Status: <Badge variant={rulesValidation.isValid ? 'default' : 'destructive'}>
                      {rulesValidation.isValid ? 'Valid' : 'Invalid'}
                    </Badge></div>
                  </div>

                  {rulesValidation.errors.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2 text-red-800">Errors:</div>
                      <div className="space-y-1">
                        {rulesValidation.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rulesValidation.warnings.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2 text-yellow-800">Warnings:</div>
                      <div className="space-y-1">
                        {rulesValidation.warnings.map((warning, index) => (
                          <div key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}