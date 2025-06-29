'use client';

import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

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
import { Progress } from '@/components/ui/progress';
import { FileParser } from '@/lib/parsers/file-parser';
import { useDataStore } from '@/lib/stores/data-store';

import { ParsingErrorsDisplay } from './parsing-errors-display';

interface FileUploadProps {
  onUploadComplete?: () => void;
  maxSizeMB?: number;
  className?: string;
}

export function FileUpload({
  onUploadComplete,
  maxSizeMB = 10,
  className,
}: FileUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);

  const { uploadState, setUploadState, setImportResult, resetUploadState } =
    useDataStore();

  const processFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      setIsProcessing(true);

      try {
        // Enhanced file validation
        const validationErrors = await FileParser.validateFile(file);
        if (validationErrors.length > 0) {
          const criticalErrors = validationErrors.filter(
            error => !error.recoverable
          );
          if (criticalErrors.length > 0) {
            throw new Error(criticalErrors[0].message);
          }

          // Show warnings but continue processing
          const warningMessages = validationErrors
            .filter(error => error.recoverable)
            .map(error => error.message);
          if (warningMessages.length > 0) {
            setUploadError(`Warnings: ${warningMessages.join('; ')}`);
          }
        }

        // Update upload state
        setUploadState({
          isUploading: true,
          progress: 0,
          fileName: file.name,
        });

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadState({
            progress: Math.min(uploadState.progress + 10, 90),
          });
        }, 200);

        // Parse the file
        const result = await FileParser.parseFile(file);

        clearInterval(progressInterval);

        // Complete upload
        setUploadState({
          progress: 100,
          isUploading: false,
        });

        // Store the import result
        setImportResult(result);
        setParseResult(result);

        // Clear simple error if parsing succeeded
        if (result.errors.length === 0 && result.warnings.length === 0) {
          setUploadError(null);
        }

        onUploadComplete?.();
      } catch (error) {
        setUploadState({
          isUploading: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
        setUploadError(
          error instanceof Error ? error.message : 'Upload failed'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [setUploadState, setImportResult, onUploadComplete, uploadState.progress]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop: files => {
        if (files.length > 0) {
          processFile(files[0]);
        }
      },
      accept: {
        'text/csv': ['.csv'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
          '.xlsx',
        ],
        'application/vnd.ms-excel': ['.xls'],
      },
      maxFiles: 1,
      maxSize: maxSizeMB * 1024 * 1024,
      disabled: uploadState.isUploading || isProcessing,
    });

  const clearUpload = () => {
    resetUploadState();
    setUploadError(null);
    setParseResult(null);
    // Note: acceptedFiles is readonly, we can't modify it directly
    // The dropzone will handle clearing files on next interaction
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Upload
        </CardTitle>
        <CardDescription>
          Upload CSV or Excel files containing client, worker, and task data.
          Maximum file size: {maxSizeMB}MB
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Upload Area */}
        {!uploadState.fileName && !uploadState.isUploading && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
              ${uploadState.isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />

            {isDragActive ? (
              <p className="text-lg font-medium">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop your file here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports CSV, XLSX, and XLS files
                </p>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {uploadState.isUploading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Uploading...</span>
              <span className="text-sm text-gray-500">
                {uploadState.progress}%
              </span>
            </div>
            <Progress value={uploadState.progress} className="w-full" />
            {uploadState.fileName && (
              <p className="text-sm text-gray-500">
                Processing: {uploadState.fileName}
              </p>
            )}
          </div>
        )}

        {/* Upload Complete */}
        {uploadState.fileName && !uploadState.isUploading && (
          <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">{uploadState.fileName}</p>
                <p className="text-xs text-gray-500">Upload complete</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearUpload}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Enhanced Error Display */}
        {parseResult &&
          (parseResult.errors.length > 0 ||
            parseResult.warnings.length > 0) && (
            <ParsingErrorsDisplay
              errors={parseResult.errors}
              warnings={parseResult.warnings}
              metadata={parseResult.metadata}
              onRetry={() => {
                if (acceptedFiles.length > 0) {
                  processFile(acceptedFiles[0]);
                }
              }}
              onDismiss={() => setParseResult(null)}
            />
          )}

        {/* Simple Error Display (for validation errors) */}
        {(uploadError || uploadState.error) &&
          (!parseResult ||
            (parseResult.errors.length === 0 &&
              parseResult.warnings.length === 0)) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {uploadError || uploadState.error}
              </AlertDescription>
            </Alert>
          )}

        {/* File Info */}
        {acceptedFiles.length > 0 && !uploadState.isUploading && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected File:</h4>
            {acceptedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 border rounded"
              >
                <FileText className="h-4 w-4 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                  </p>
                </div>
                <Badge variant="outline">
                  {file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'Excel'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button (for when drag & drop is not used) */}
        {acceptedFiles.length === 0 && !uploadState.fileName && (
          <div className="flex justify-center">
            <Button
              onClick={() =>
                (
                  document.querySelector(
                    'input[type="file"]'
                  ) as HTMLInputElement
                )?.click()
              }
              disabled={uploadState.isUploading || isProcessing}
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            Processing file data...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
