'use client'

import { CellValueChangedEvent, ColDef, GridReadyEvent } from '@ag-grid-community/core'
import { AgGridReact } from '@ag-grid-community/react'
import { Download, Plus, Upload } from 'lucide-react'
import { useCallback, useMemo, useRef } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDataStore } from '@/lib/stores/data-store'
import { useValidationStore } from '@/lib/stores/validation-store'
import { QualificationLevels, Worker } from '@/lib/types/entities'
import { normalizeQualificationLevel } from '@/lib/utils/data-normalizer'

import '@ag-grid-community/styles/ag-grid.css'
import '@ag-grid-community/styles/ag-theme-alpine.css'

interface WorkerGridProps {
  className?: string
}

export function WorkerGrid({ className }: WorkerGridProps) {
  const gridRef = useRef<AgGridReact>(null)
  const { workers, updateWorker, addWorker, deleteWorker } = useDataStore()
  const { getErrorsByEntity } = useValidationStore()
  
  const workerErrors = getErrorsByEntity('worker')

  const handleDeleteWorker = useCallback((workerId: string) => {
    if (confirm(`Are you sure you want to delete worker ${workerId}?`)) {
      deleteWorker(workerId)
    }
  }, [deleteWorker])

  const columnDefs = useMemo<ColDef<Worker>[]>(() => [
    {
      field: 'WorkerID',
      headerName: 'Worker ID',
      editable: false,
      width: 120,
      pinned: 'left',
      cellClass: 'font-mono text-sm',
    },
    {
      field: 'WorkerName',
      headerName: 'Worker Name',
      editable: true,
      width: 180,
      cellEditor: 'agTextCellEditor',
      cellClass: 'font-medium',
    },
    {
      field: 'Skills',
      headerName: 'Skills',
      editable: true,
      width: 200,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorParams: {
        maxLength: 500,
        rows: 3,
        cols: 50,
      },
      tooltipField: 'Skills',
      cellRenderer: (params: { value: string }) => {
        const skills = params.value?.split(',') || []
        if (skills.length > 3) {
          return `${skills.slice(0, 3).join(', ')}... (+${skills.length - 3})`
        }
        return params.value
      },
    },
    {
      field: 'AvailableSlots',
      headerName: 'Available Slots',
      editable: true,
      width: 130,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        max: 100,
      },
      cellRenderer: (params: { value: number }) => {
        const value = params.value
        const color = value === 0 ? 'text-red-600' : value > 10 ? 'text-green-600' : 'text-yellow-600'
        return <span className={color}>{value}</span>
      },
    },
    {
      field: 'MaxLoadPerPhase',
      headerName: 'Max Load/Phase',
      editable: true,
      width: 130,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        max: 200,
      },
    },
    {
      field: 'WorkerGroup',
      headerName: 'Group',
      editable: true,
      width: 120,
      cellEditor: 'agTextCellEditor',
    },
    {
      field: 'QualificationLevel',
      headerName: 'Qualification',
      editable: true,
      width: 130,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: QualificationLevels,
      },
      cellRenderer: (params: { value: string | number }) => {
        // Handle both string and numeric qualification levels
        const level = typeof params.value === 'number' 
          ? normalizeQualificationLevel(params.value)
          : normalizeQualificationLevel(params.value)
        const colors = {
          'Junior': 'bg-blue-100 text-blue-800',
          'Mid': 'bg-green-100 text-green-800',
          'Senior': 'bg-orange-100 text-orange-800',
          'Expert': 'bg-purple-100 text-purple-800',
        }
        return (
          <Badge className={colors[level as keyof typeof colors] || 'bg-gray-100'}>
            {level}
          </Badge>
        )
      },
    },
    {
      headerName: 'Actions',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: { data: Worker }) => (
        <div className="flex items-center gap-1 h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteWorker(params.data.WorkerID)}
            className="text-red-600 hover:text-red-800 p-1 h-auto"
          >
            Delete
          </Button>
        </div>
      ),
      editable: false,
      sortable: false,
      filter: false,
    },
  ], [handleDeleteWorker])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
  }), [])

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.autoSizeAllColumns()
  }, [])

  const onCellValueChanged = useCallback((event: CellValueChangedEvent<Worker>) => {
    if (event.data && event.colDef.field) {
      const updates = { [event.colDef.field]: event.newValue }
      updateWorker(event.data.WorkerID, updates)
    }
  }, [updateWorker])

  const handleAddWorker = useCallback(() => {
    const newWorkerId = `WORKER-${Date.now()}`
    const newWorker: Worker = {
      WorkerID: newWorkerId,
      WorkerName: 'New Worker',
      Skills: '',
      AvailableSlots: 5,
      MaxLoadPerPhase: 10,
      WorkerGroup: '',
      QualificationLevel: 'Mid',
    }
    addWorker(newWorker)
  }, [addWorker])

  const exportToCsv = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: 'workers.csv',
      })
    }
  }, [])

  const getRowClass = useCallback((params: { node: { rowIndex: number | null } }) => {
    if (params.node.rowIndex === null) return ''
    
    const hasError = workerErrors.some(error => 
      error.rowIndex === params.node.rowIndex && error.level === 'error'
    )
    const hasWarning = workerErrors.some(error => 
      error.rowIndex === params.node.rowIndex && error.level === 'warning'
    )
    
    if (hasError) return 'bg-red-50 border-l-4 border-red-500'
    if (hasWarning) return 'bg-yellow-50 border-l-4 border-yellow-500'
    return ''
  }, [workerErrors])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Workers
              <Badge variant="outline">{workers.length}</Badge>
            </CardTitle>
            <CardDescription>
              Manage worker skills, availability, and qualifications
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={handleAddWorker}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Worker
            </Button>
          </div>
        </div>
        
        {workerErrors.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="destructive" className="text-xs">
              {workerErrors.filter(e => e.level === 'error').length} errors
            </Badge>
            <Badge variant="outline" className="text-xs">
              {workerErrors.filter(e => e.level === 'warning').length} warnings
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={workers}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            onCellValueChanged={onCellValueChanged}
            getRowClass={getRowClass}
            animateRows={true}
            enableCellTextSelection={true}
            stopEditingWhenCellsLoseFocus={true}
            suppressMenuHide={true}
            tooltipShowDelay={500}
          />
        </div>
        
        {workers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workers yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload a file or add workers manually to get started
            </p>
            <Button onClick={handleAddWorker} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add First Worker
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}