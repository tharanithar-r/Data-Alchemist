'use client'

import { CellValueChangedEvent, ColDef, GridReadyEvent } from '@ag-grid-community/core'
import { AgGridReact } from '@ag-grid-community/react'
import { Clock, Download, Plus, Upload } from 'lucide-react'
import { useCallback, useMemo, useRef } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDataStore } from '@/lib/stores/data-store'
import { useValidationStore } from '@/lib/stores/validation-store'
import { Task, TaskCategories } from '@/lib/types/entities'

import '@ag-grid-community/styles/ag-grid.css'
import '@ag-grid-community/styles/ag-theme-alpine.css'

interface TaskGridProps {
  className?: string
}

export function TaskGrid({ className }: TaskGridProps) {
  const gridRef = useRef<AgGridReact>(null)
  const { tasks, updateTask, addTask, deleteTask } = useDataStore()
  const { getErrorsByEntity } = useValidationStore()
  
  const taskErrors = getErrorsByEntity('task')

  const handleDeleteTask = useCallback((taskId: string) => {
    if (confirm(`Are you sure you want to delete task ${taskId}?`)) {
      deleteTask(taskId)
    }
  }, [deleteTask])

  const columnDefs = useMemo<ColDef<Task>[]>(() => [
    {
      field: 'TaskID',
      headerName: 'Task ID',
      editable: false,
      width: 120,
      pinned: 'left',
      cellClass: 'font-mono text-sm',
    },
    {
      field: 'TaskName',
      headerName: 'Task Name',
      editable: true,
      width: 200,
      cellEditor: 'agTextCellEditor',
      cellClass: 'font-medium',
    },
    {
      field: 'Category',
      headerName: 'Category',
      editable: true,
      width: 130,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: TaskCategories,
      },
      cellRenderer: (params: { value: string }) => {
        const category = params.value
        const colors = {
          'Development': 'bg-blue-100 text-blue-800',
          'Design': 'bg-pink-100 text-pink-800',
          'Testing': 'bg-green-100 text-green-800',
          'Analysis': 'bg-purple-100 text-purple-800',
          'Management': 'bg-orange-100 text-orange-800',
          'Support': 'bg-gray-100 text-gray-800',
          'ETL': 'bg-cyan-100 text-cyan-800',
          'Analytics': 'bg-indigo-100 text-indigo-800',
          'ML': 'bg-violet-100 text-violet-800',
          'QA': 'bg-emerald-100 text-emerald-800',
          'Research': 'bg-amber-100 text-amber-800',
          'Infrastructure': 'bg-slate-100 text-slate-800',
        }
        return (
          <Badge className={colors[category as keyof typeof colors] || 'bg-gray-100'}>
            {category}
          </Badge>
        )
      },
    },
    {
      field: 'Duration',
      headerName: 'Duration (hrs)',
      editable: true,
      width: 120,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        max: 200,
      },
      cellRenderer: (params: { value: number }) => {
        const duration = params.value
        if (duration === 0) {
          return <span className="text-red-600">0h</span>
        } else if (duration > 40) {
          return (
            <span className="text-orange-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}h
            </span>
          )
        }
        return `${duration}h`
      },
    },
    {
      field: 'RequiredSkills',
      headerName: 'Required Skills',
      editable: true,
      width: 200,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorParams: {
        maxLength: 500,
        rows: 3,
        cols: 50,
      },
      tooltipField: 'RequiredSkills',
      cellRenderer: (params: { value: string }) => {
        const skills = params.value?.split(',') || []
        if (skills.length > 3) {
          return `${skills.slice(0, 3).join(', ')}... (+${skills.length - 3})`
        }
        return params.value
      },
    },
    {
      field: 'PreferredPhases',
      headerName: 'Preferred Phases',
      editable: true,
      width: 140,
      cellEditor: 'agTextCellEditor',
      tooltipField: 'PreferredPhases',
    },
    {
      field: 'MaxConcurrent',
      headerName: 'Max Concurrent',
      editable: true,
      width: 130,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 1,
        max: 50,
      },
      cellRenderer: (params: { value: number }) => {
        const concurrent = params.value
        if (concurrent > 10) {
          return (
            <span className="text-orange-600 font-medium">
              {concurrent}
            </span>
          )
        } else if (concurrent === 1) {
          return <span className="text-gray-500">{concurrent}</span>
        }
        return concurrent
      },
    },
    {
      headerName: 'Actions',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: { data: Task }) => (
        <div className="flex items-center gap-1 h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteTask(params.data.TaskID)}
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
  ], [handleDeleteTask])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
  }), [])

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.autoSizeAllColumns()
  }, [])

  const onCellValueChanged = useCallback((event: CellValueChangedEvent<Task>) => {
    if (event.data && event.colDef.field) {
      const updates = { [event.colDef.field]: event.newValue }
      updateTask(event.data.TaskID, updates)
    }
  }, [updateTask])

  const handleAddTask = useCallback(() => {
    const newTaskId = `TASK-${Date.now()}`
    const newTask: Task = {
      TaskID: newTaskId,
      TaskName: 'New Task',
      Category: 'Development',
      Duration: 8,
      RequiredSkills: '',
      PreferredPhases: '',
      MaxConcurrent: 1,
    }
    addTask(newTask)
  }, [addTask])

  const exportToCsv = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: 'tasks.csv',
      })
    }
  }, [])

  const getRowClass = useCallback((params: { node: { rowIndex: number | null } }) => {
    if (params.node.rowIndex === null) return ''
    
    const hasError = taskErrors.some(error => 
      error.rowIndex === params.node.rowIndex && error.level === 'error'
    )
    const hasWarning = taskErrors.some(error => 
      error.rowIndex === params.node.rowIndex && error.level === 'warning'
    )
    
    if (hasError) return 'bg-red-50 border-l-4 border-red-500'
    if (hasWarning) return 'bg-yellow-50 border-l-4 border-yellow-500'
    return ''
  }, [taskErrors])

  const totalDuration = useMemo(() => {
    return tasks.reduce((total, task) => total + task.Duration, 0)
  }, [tasks])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Tasks
              <Badge variant="outline">{tasks.length}</Badge>
              {totalDuration > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {totalDuration}h total
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Manage task definitions, requirements, and scheduling constraints
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
              onClick={handleAddTask}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>
        
        {taskErrors.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="destructive" className="text-xs">
              {taskErrors.filter(e => e.level === 'error').length} errors
            </Badge>
            <Badge variant="outline" className="text-xs">
              {taskErrors.filter(e => e.level === 'warning').length} warnings
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={tasks}
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
        
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload a file or add tasks manually to get started
            </p>
            <Button onClick={handleAddTask} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add First Task
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}