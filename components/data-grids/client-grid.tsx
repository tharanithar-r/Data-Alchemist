'use client';

import {
  CellValueChangedEvent,
  ColDef,
  GridReadyEvent,
  GridApi,
  RowClassParams,
} from '@ag-grid-community/core';
import { AgGridReact } from '@ag-grid-community/react';
import '@/lib/ag-grid-modules';
import { Download, Plus, Upload } from 'lucide-react';
import {
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDataStore } from '@/lib/stores/data-store';
import { useValidationStore } from '@/lib/stores/validation-store';
import { Client, ValidationError } from '@/lib/types/entities';
import { ErrorFixEngine } from '@/lib/validation/error-fixes';

// Import AG-Grid CSS
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-alpine.css';
import { ValidationDetailsPanel } from '@/components/validation/validation-details-panel';

interface ClientGridProps {
  className?: string;
}

interface ClientGridRef {
  exportToCsv: () => void;
  getSelectedRows: () => Client[];
  refreshData: () => void;
  getGridApi: () => GridApi<Client> | undefined;
}

export const ClientGrid = forwardRef<ClientGridRef, ClientGridProps>(
  ({ className }, ref) => {
    const gridRef = useRef<AgGridReact<Client>>(null);
    const { clients, updateClient, addClient, deleteClient, workers, tasks, setClients } = useDataStore();
    const { getErrorsByEntity } = useValidationStore();
    const [showValidationDetails, setShowValidationDetails] = useState(false);
    const [isFixingErrors, setIsFixingErrors] = useState(false);

    const clientErrors = getErrorsByEntity('client');

    // Error fixing functions
    const handleFixError = useCallback(async (error: ValidationError) => {
      setIsFixingErrors(true);
      try {
        const suggestions = ErrorFixEngine.getFixSuggestions(error, { clients, workers, tasks });
        const autoFixable = suggestions.find(s => s.canAutoFix && s.confidence === 'high');
        
        if (autoFixable) {
          const result = await ErrorFixEngine.applyFix(error, autoFixable.id, { clients, workers, tasks });
          if (result.success) {
            setClients(result.newData.clients);
          } else {
            console.error('Failed to fix error:', result.message);
          }
        }
      } catch (err) {
        console.error('Error fixing failed:', err);
      } finally {
        setIsFixingErrors(false);
      }
    }, [clients, workers, tasks, setClients]);

    const handleBulkFix = useCallback(async (errors: ValidationError[]) => {
      setIsFixingErrors(true);
      try {
        const result = await ErrorFixEngine.applyBulkFix(errors, { clients, workers, tasks });
        if (result.success && result.newData) {
          setClients(result.newData.clients);
        } else {
          console.error('Bulk fix failed:', result.message);
        }
      } catch (err) {
        console.error('Bulk fix failed:', err);
      } finally {
        setIsFixingErrors(false);
      }
    }, [clients, workers, tasks, setClients]);

    // Column definitions for client data
    const handleDeleteClient = useCallback(
      (clientId: string) => {
        if (confirm(`Are you sure you want to delete client ${clientId}?`)) {
          deleteClient(clientId);
        }
      },
      [deleteClient]
    );

    const columnDefs = useMemo<ColDef<Client>[]>(
      () => [
        {
          field: 'ClientID',
          headerName: 'Client ID',
          editable: false,
          width: 120,
          cellClass: 'font-mono text-sm',
        },
        {
          field: 'ClientName',
          headerName: 'Client Name',
          editable: true,
          width: 200,
          cellClass: 'font-medium',
        },
        {
          field: 'PriorityLevel',
          headerName: 'Priority',
          editable: true,
          width: 100,
          cellRenderer: (params: { value: number }) => {
            const priority = params.value;
            const colors = {
              1: 'bg-gray-100 text-gray-800',
              2: 'bg-blue-100 text-blue-800',
              3: 'bg-yellow-100 text-yellow-800',
              4: 'bg-orange-100 text-orange-800',
              5: 'bg-red-100 text-red-800',
            };
            return (
              <Badge
                className={
                  colors[priority as keyof typeof colors] || 'bg-gray-100'
                }
              >
                {priority}
              </Badge>
            );
          },
        },
        {
          field: 'RequestedTaskIDs',
          headerName: 'Requested Tasks',
          editable: true,
          width: 200,
          tooltipField: 'RequestedTaskIDs',
          cellRenderer: (params: { value: string }) => {
            const taskIds = params.value?.split(',') || [];
            if (taskIds.length > 3) {
              return `${taskIds.slice(0, 3).join(', ')}... (+${taskIds.length - 3})`;
            }
            return params.value;
          },
        },
        {
          field: 'GroupTag',
          headerName: 'Group',
          editable: true,
          width: 120,
        },
        {
          field: 'AttributesJSON',
          headerName: 'Attributes',
          editable: true,
          width: 150,
          tooltipField: 'AttributesJSON',
          cellRenderer: (params: { value: string }) => {
            if (!params.value) return '';
            try {
              const obj = JSON.parse(params.value);
              const keys = Object.keys(obj);
              return keys.length > 0 ? `{${keys.join(', ')}}` : '{}';
            } catch {
              return 'Invalid JSON';
            }
          },
        },
        {
          headerName: 'Actions',
          width: 100,
          cellRenderer: (params: { data: Client }) => (
            <div className="flex items-center gap-1 h-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClient(params.data.ClientID)}
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
      ],
      [handleDeleteClient]
    );

    const defaultColDef = useMemo<ColDef<Client>>(
      () => ({
        sortable: true,
        filter: true,
        resizable: true,
        editable: true,
      }),
      []
    );

    const onGridReady = useCallback((params: GridReadyEvent<Client>) => {
      // Size columns to fit the grid
      params.api.sizeColumnsToFit();
    }, []);

    const onCellValueChanged = useCallback(
      (event: CellValueChangedEvent<Client>) => {
        if (event.data && event.colDef.field) {
          const updates = { [event.colDef.field]: event.newValue };
          updateClient(event.data.ClientID, updates);
        }
      },
      [updateClient]
    );

    const handleAddClient = useCallback(() => {
      const newClientId = `CLIENT-${Date.now()}`;
      const newClient: Client = {
        ClientID: newClientId,
        ClientName: 'New Client',
        PriorityLevel: 3,
        RequestedTaskIDs: '',
        GroupTag: '',
        AttributesJSON: '',
      };
      addClient(newClient);
    }, [addClient]);

    const exportToCsv = useCallback(() => {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `clients-${new Date().toISOString().split('T')[0]}.csv`,
          skipColumnHeaders: false,
          columnSeparator: ',',
          suppressQuotes: false,
        });
      }
    }, []);

    // Row class rules for validation errors
    const getRowClass = useCallback(
      (params: RowClassParams<Client>) => {
        if (params.node.rowIndex === null || !params.data) return '';

        const hasError = clientErrors.some(
          error =>
            error.rowIndex === params.node.rowIndex && error.level === 'error'
        );
        const hasWarning = clientErrors.some(
          error =>
            error.rowIndex === params.node.rowIndex && error.level === 'warning'
        );

        if (hasError) return 'bg-red-50 border-l-4 border-red-500';
        if (hasWarning) return 'bg-yellow-50 border-l-4 border-yellow-500';
        return '';
      },
      [clientErrors]
    );

    // Expose methods through ref for external components
    useImperativeHandle(
      ref,
      () => ({
        exportToCsv,
        getSelectedRows: () => {
          const selectedNodes = gridRef.current?.api?.getSelectedNodes() || [];
          return selectedNodes
            .map(node => node.data)
            .filter(Boolean) as Client[];
        },
        refreshData: () => {
          gridRef.current?.api?.refreshCells({ force: true });
        },
        getGridApi: () => gridRef.current?.api,
      }),
      [exportToCsv]
    );

    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Clients
                <Badge variant="outline">{clients.length}</Badge>
              </CardTitle>
              <CardDescription>
                Manage client information, priorities, and task assignments
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
                onClick={handleAddClient}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </div>
          </div>

          {clientErrors.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="destructive" className="text-xs">
                {clientErrors.filter(e => e.level === 'error').length} errors
              </Badge>
              <Badge variant="outline" className="text-xs">
                {clientErrors.filter(e => e.level === 'warning').length}{' '}
                warnings
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValidationDetails(!showValidationDetails)}
                className="text-xs"
                disabled={isFixingErrors}
              >
                {showValidationDetails ? 'Hide Details' : 'View Details'}
              </Button>
              {isFixingErrors && (
                <Badge variant="secondary" className="text-xs">
                  Fixing errors...
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div
            className="ag-theme-alpine"
            style={{ height: '500px', width: '100%' }}
          >
            <AgGridReact<Client>
              ref={gridRef}
              rowData={clients}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              onCellValueChanged={onCellValueChanged}
              getRowClass={getRowClass}
              animateRows={true}
              stopEditingWhenCellsLoseFocus={true}
              rowSelection={'single'}
            />
          </div>

          {clients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No clients yet
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a file or add clients manually to get started
              </p>
              <Button
                onClick={handleAddClient}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Client
              </Button>
            </div>
          )}

          {/* Validation Details Panel */}
          {showValidationDetails && clientErrors.length > 0 && (
            <div className="mt-6">
              <ValidationDetailsPanel
                onNavigateToError={(error) => {
                  // Navigate to the specific row/cell with the error
                  if (error.rowIndex !== undefined && gridRef.current?.api) {
                    gridRef.current.api.ensureIndexVisible(error.rowIndex);
                    // Highlight the specific row
                    gridRef.current.api.flashCells({
                      rowNodes: [gridRef.current.api.getRowNode(error.rowIndex.toString())!].filter(Boolean),
                      flashDelay: 500,
                      fadeDelay: 1000,
                    });
                  }
                }}
                onFixError={handleFixError}
                onBulkFix={handleBulkFix}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

ClientGrid.displayName = 'ClientGrid';
