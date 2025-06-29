'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  MapPin,
  Zap,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState, useMemo } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useValidationStore } from '@/lib/stores/validation-store';
import { ValidationError } from '@/lib/types/entities';

interface ValidationDetailsPanelProps {
  className?: string;
  onNavigateToError?: (error: ValidationError) => void;
  onFixError?: (error: ValidationError) => void;
  onBulkFix?: (errors: ValidationError[]) => void;
  specificErrors?: ValidationError[]; // Optional: provide specific errors to display instead of all
}

interface ErrorGroup {
  ruleType: string;
  level: 'error' | 'warning' | 'info';
  count: number;
  errors: ValidationError[];
  description: string;
  fixSuggestion: string;
  canAutoFix: boolean;
}

const ERROR_EXPLANATIONS: Record<string, {
  description: string;
  fixSuggestion: string;
  canAutoFix: boolean;
}> = {
  'required-field': {
    description: 'Required fields cannot be empty',
    fixSuggestion: 'Fill in the missing required information',
    canAutoFix: false,
  },
  'invalid-format': {
    description: 'Data format does not match expected pattern',
    fixSuggestion: 'Use the correct format (e.g., numbers, dates, JSON)',
    canAutoFix: true,
  },
  'duplicate-id': {
    description: 'ID values must be unique across all records',
    fixSuggestion: 'Change duplicate IDs to unique values',
    canAutoFix: true,
  },
  'invalid-reference': {
    description: 'Referenced ID does not exist in the related entity',
    fixSuggestion: 'Use valid IDs that exist in the referenced data',
    canAutoFix: false,
  },
  'reference-integrity': {
    description: 'Referenced ID does not exist in the related entity',
    fixSuggestion: 'Remove invalid task references automatically or create missing tasks',
    canAutoFix: true,
  },
  'skill-mismatch': {
    description: 'Required skills are not available in worker pool',
    fixSuggestion: 'Add workers with required skills or modify task requirements',
    canAutoFix: false,
  },
  'capacity-exceeded': {
    description: 'Worker capacity is insufficient for assigned workload',
    fixSuggestion: 'Reduce task assignments or increase worker capacity',
    canAutoFix: false,
  },
  'invalid-priority': {
    description: 'Priority level must be between 1-5',
    fixSuggestion: 'Set priority level to a value between 1 and 5',
    canAutoFix: true,
  },
  'missing-skills': {
    description: 'Worker skills field is empty or invalid',
    fixSuggestion: 'Add comma-separated skills for each worker',
    canAutoFix: false,
  },
  'invalid-json': {
    description: 'JSON format is invalid',
    fixSuggestion: 'Use valid JSON syntax or leave empty',
    canAutoFix: true,
  },
};

export function ValidationDetailsPanel({
  className,
  onNavigateToError,
  onFixError,
  onBulkFix,
  specificErrors,
}: ValidationDetailsPanelProps) {
  const { 
    validationSummary, 
    getVisibleErrors, 
    getErrorStats,
    dismissError,
    pinError,
    unpinError,
    pinnedErrors,
    setSelectedErrorLevel,
    selectedErrorLevel 
  } = useValidationStore();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'clients' | 'workers' | 'tasks' | 'cross-entity'>('all');

  // Use specific errors if provided, otherwise use all visible errors
  const allErrors = specificErrors || getVisibleErrors();
  const errorStats = getErrorStats();

  // Group errors by rule type and level
  const errorGroups = useMemo(() => {
    const groups = new Map<string, ErrorGroup>();

    allErrors.forEach(error => {
      const key = `${error.ruleType}-${error.level}`;
      
      if (!groups.has(key)) {
        const explanation = ERROR_EXPLANATIONS[error.ruleType] || {
          description: 'Validation rule failed',
          fixSuggestion: 'Review and correct the data',
          canAutoFix: false,
        };

        groups.set(key, {
          ruleType: error.ruleType,
          level: error.level,
          count: 0,
          errors: [],
          ...explanation,
        });
      }

      const group = groups.get(key)!;
      group.count++;
      group.errors.push(error);
    });

    return Array.from(groups.values()).sort((a, b) => {
      // Sort by severity first, then by count
      const severityOrder = { error: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.level] - severityOrder[b.level];
      if (severityDiff !== 0) return severityDiff;
      return b.count - a.count;
    });
  }, [allErrors]);

  // Note: Filtering is handled in the error groups mapping below

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const getErrorIcon = (level: 'error' | 'warning' | 'info') => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getErrorBadgeVariant = (level: 'error' | 'warning' | 'info') => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
    }
  };

  const formatErrorLocation = (error: ValidationError) => {
    const parts: string[] = [];
    
    if (error.entityType) {
      parts.push(error.entityType.charAt(0).toUpperCase() + error.entityType.slice(1));
    }
    
    if (error.rowIndex !== undefined) {
      parts.push(`Row ${error.rowIndex + 1}`);
    }
    
    if (error.field) {
      parts.push(`Field: ${error.field}`);
    }
    
    return parts.join(' • ');
  };

  const handleNavigateToError = (error: ValidationError) => {
    onNavigateToError?.(error);
  };

  const handleFixError = (error: ValidationError) => {
    onFixError?.(error);
  };

  const handleBulkFixGroup = (group: ErrorGroup) => {
    if (group.canAutoFix) {
      onBulkFix?.(group.errors);
    }
  };

  if (!validationSummary || allErrors.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 text-center">
            <div className="space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-medium text-green-700">All Good!</h3>
              <p className="text-sm text-gray-500">
                No validation errors found. Your data looks clean and ready for export.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Validation Issues
            </CardTitle>
            <CardDescription>
              Review and fix data quality issues before export
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              {errorStats.errors} errors
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {errorStats.warnings} warnings
            </Badge>
            {errorStats.info > 0 && (
              <Badge variant="outline" className="text-xs">
                {errorStats.info} info
              </Badge>
            )}
          </div>
        </div>

        {/* Error Level Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Show:</span>
          <Button
            variant={selectedErrorLevel === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedErrorLevel('all')}
          >
            All ({allErrors.length})
          </Button>
          <Button
            variant={selectedErrorLevel === 'error' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setSelectedErrorLevel('error')}
          >
            Errors ({errorStats.errors})
          </Button>
          <Button
            variant={selectedErrorLevel === 'warning' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSelectedErrorLevel('warning')}
          >
            Warnings ({errorStats.warnings})
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          {/* Only show tabs if not using specific errors (which are usually cross-entity) */}
          {!specificErrors && (
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="workers">Workers</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="cross-entity">Cross-Entity</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value={activeTab} className="mt-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {errorGroups
                  .filter(group => {
                    // If using specific errors, show all groups
                    if (specificErrors) return true;
                    
                    // Otherwise filter by active tab
                    return activeTab === 'all' || 
                    group.errors.some(error => 
                      activeTab === 'cross-entity' ? error.entityType === 'cross-entity' :
                      activeTab === 'clients' ? error.entityType === 'client' :
                      activeTab === 'workers' ? error.entityType === 'worker' :
                      error.entityType === 'task'
                    )
                  })
                  .map(group => {
                    const groupKey = `${group.ruleType}-${group.level}`;
                    const isExpanded = expandedGroups.has(groupKey);
                    const filteredGroupErrors = group.errors.filter(error => {
                      // If using specific errors, show all errors in the group
                      if (specificErrors) return true;
                      
                      // Otherwise filter by active tab
                      return activeTab === 'all' ||
                      (activeTab === 'cross-entity' && error.entityType === 'cross-entity') ||
                      (activeTab === 'clients' && error.entityType === 'client') ||
                      (activeTab === 'workers' && error.entityType === 'worker') ||
                      (activeTab === 'tasks' && error.entityType === 'task')
                    });

                    if (filteredGroupErrors.length === 0) return null;

                    return (
                      <Collapsible
                        key={groupKey}
                        open={isExpanded}
                        onOpenChange={() => toggleGroup(groupKey)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  {getErrorIcon(group.level)}
                                  <div>
                                    <CardTitle className="text-base">
                                      {group.ruleType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </CardTitle>
                                    <CardDescription>
                                      {group.description}
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={getErrorBadgeVariant(group.level)}>
                                    {filteredGroupErrors.length} {group.level}
                                    {filteredGroupErrors.length > 1 ? 's' : ''}
                                  </Badge>
                                  {group.canAutoFix && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBulkFixGroup(group);
                                      }}
                                      className="flex items-center gap-1"
                                    >
                                      <Zap className="h-3 w-3" />
                                      Auto-fix
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <Alert className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>How to fix this issue</AlertTitle>
                                <AlertDescription>
                                  {group.fixSuggestion}
                                </AlertDescription>
                              </Alert>

                              <div className="space-y-2">
                                {filteredGroupErrors.map(error => (
                                  <div
                                    key={error.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <MapPin className="h-3 w-3 text-gray-400" />
                                        <span className="text-sm font-medium">
                                          {formatErrorLocation(error)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        {error.message}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleNavigateToError(error)}
                                        className="flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Go to
                                      </Button>
                                      {/* Show individual fix button if this error type can be auto-fixed */}
                                      {(ERROR_EXPLANATIONS[error.ruleType]?.canAutoFix) && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleFixError(error)}
                                          className="flex items-center gap-1"
                                        >
                                          <Zap className="h-3 w-3" />
                                          Fix
                                        </Button>
                                      )}
                                      {pinnedErrors.has(error.id) ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => unpinError(error.id)}
                                        >
                                          <EyeOff className="h-3 w-3" />
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => pinError(error.id)}
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => dismissError(error.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}