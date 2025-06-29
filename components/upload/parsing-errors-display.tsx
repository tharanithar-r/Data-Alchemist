'use client';

import { AlertCircle, CheckCircle, XCircle, Lightbulb, FileText } from 'lucide-react';
import { useState } from 'react';

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
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface ParsingErrorsDisplayProps {
  errors: string[];
  warnings: string[];
  metadata?: {
    formatInfo?: any;
    processingTime?: number;
    totalErrors?: number;
    totalWarnings?: number;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ParsingErrorsDisplay({
  errors = [],
  warnings = [],
  metadata,
  onRetry,
  onDismiss,
}: ParsingErrorsDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasCriticalErrors = hasErrors; // Assuming all errors are critical for now

  if (!hasErrors && !hasWarnings) {
    return null;
  }

  // Helper function for potential future use
  // const getErrorIcon = (type: 'error' | 'warning' | 'info') => {
  //   switch (type) {
  //     case 'error':
  //       return <XCircle className="h-4 w-4 text-red-500" />;
  //     case 'warning':
  //       return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  //     case 'info':
  //       return <Info className="h-4 w-4 text-blue-500" />;
  //   }
  // };

  const getSuggestions = () => {
    const suggestions: string[] = [];

    // Generic suggestions based on error patterns
    if (errors.some(e => e.includes('format'))) {
      suggestions.push('Save your file as CSV (UTF-8) or Excel (.xlsx) format');
    }
    if (errors.some(e => e.includes('encoding'))) {
      suggestions.push('Ensure your file is saved with UTF-8 encoding');
    }
    if (errors.some(e => e.includes('structure') || e.includes('column'))) {
      suggestions.push('Check that your data has consistent column headers and structure');
    }
    if (errors.some(e => e.includes('size') || e.includes('large'))) {
      suggestions.push('Split your data into smaller files or remove unnecessary columns');
    }
    if (warnings.some(w => w.includes('mapping') || w.includes('header'))) {
      suggestions.push('Use standard column names like "ClientID", "WorkerName", "TaskID" for better recognition');
    }

    return suggestions;
  };

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'Unknown';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {hasCriticalErrors ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <div>
              <CardTitle className={`text-lg ${hasCriticalErrors ? 'text-red-700' : 'text-yellow-700'}`}>
                {hasCriticalErrors ? 'Parsing Failed' : 'Parsing Completed with Issues'}
              </CardTitle>
              <CardDescription className="mt-1">
                {hasCriticalErrors
                  ? 'Unable to process the file due to critical errors'
                  : 'File processed successfully but with some issues that need attention'}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {metadata?.processingTime && (
              <Badge variant="outline" className="text-xs">
                {formatProcessingTime(metadata.processingTime)}
              </Badge>
            )}
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Summary */}
        <div className="flex items-center gap-4">
          {hasErrors && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive">
                {errors.length} Error{errors.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
          {hasWarnings && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </div>

        {/* Critical Errors */}
        {hasErrors && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Critical Issues
            </h4>
            {errors.slice(0, 3).map((error, index) => (
              <Alert key={index} variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ))}
            {errors.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} {errors.length - 3} more errors
              </Button>
            )}
          </div>
        )}

        {/* Additional Errors (Collapsible) */}
        {hasErrors && errors.length > 3 && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleContent className="space-y-2">
              {errors.slice(3).map((error, index) => (
                <Alert key={index + 3} variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className="space-y-2">
            <h4 className="font-medium text-yellow-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Warnings
            </h4>
            {warnings.slice(0, 2).map((warning, index) => (
              <Alert key={index} className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  {warning}
                </AlertDescription>
              </Alert>
            ))}
            {warnings.length > 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} {warnings.length - 2} more warnings
              </Button>
            )}
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && getSuggestions().length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-blue-700 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Suggestions to Fix Issues
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuggestions(false)}
                >
                  Hide
                </Button>
              </div>
              
              <div className="grid gap-2">
                {getSuggestions().map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* File Format Info */}
        {metadata?.formatInfo && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                File Information
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded">
                <div>
                  <span className="font-medium">Format:</span> {metadata.formatInfo.extension || 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Encoding:</span> {metadata.formatInfo.encoding || 'Unknown'}
                </div>
                {metadata.formatInfo.delimiter && (
                  <div>
                    <span className="font-medium">Delimiter:</span> 
                    {metadata.formatInfo.delimiter === '\t' ? 'Tab' : metadata.formatInfo.delimiter}
                  </div>
                )}
                <div>
                  <span className="font-medium">Confidence:</span> 
                  {metadata.formatInfo.confidence 
                    ? `${(metadata.formatInfo.confidence * 100).toFixed(0)}%`
                    : 'Unknown'
                  }
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
          )}
          <Button variant="secondary" size="sm">
            View Documentation
          </Button>
          <Button variant="secondary" size="sm">
            Download Sample File
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ParsingErrorsDisplay;