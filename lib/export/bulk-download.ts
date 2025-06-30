/**
 * Bulk Download utilities for creating ZIP packages of all export files
 * Creates a single ZIP file containing CSV files and rules.json
 */

import JSZip from 'jszip';

import {
  BusinessRule,
  PriorityWeights,
  PriorityMethod,
  PresetProfile,
} from '@/lib/stores/rules-store';
import { Client, Worker, Task, ValidationResult } from '@/lib/types/entities';

import { exportAllEntitiesToCSV, ExportOptions } from './csv-exporter';
import { exportRulesAsJSON } from './rules-json-generator';

export interface BulkDownloadOptions extends ExportOptions {
  includeTimestamp?: boolean;
  projectName?: string;
}

export interface BulkDownloadResult {
  success: boolean;
  filename: string;
  fileCount: number;
  totalSize: number;
  warnings: string[];
  errors: string[];
}

export interface BulkDownloadProgress {
  currentStep: string;
  progress: number;
  filesCompleted: number;
  totalFiles: number;
  currentFile?: string;
}

/**
 * Generate a timestamp string for file naming
 */
function generateTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19); // Remove milliseconds and timezone
}

/**
 * Generate filename for bulk download
 */
function generateBulkFilename(options: BulkDownloadOptions): string {
  const { includeTimestamp = true, projectName } = options;

  let filename = projectName || 'data-alchemist-export';

  if (includeTimestamp) {
    filename += `-${generateTimestamp()}`;
  }

  return `${filename}.zip`;
}

/**
 * Calculate estimated file sizes for progress tracking
 */
// function estimateFileSizes(
//   clients: Client[],
//   workers: Worker[],
//   tasks: Task[],
//   rules: BusinessRule[]
// ): { [key: string]: number } {
//   // Rough estimates based on average row sizes
//   const avgClientSize = 150 // bytes per client row
//   const avgWorkerSize = 200 // bytes per worker row
//   const avgTaskSize = 180 // bytes per task row
//   const avgRuleSize = 300 // bytes per rule in JSON

//   return {
//     'clients-clean.csv': clients.length * avgClientSize + 500, // Header overhead
//     'workers-clean.csv': workers.length * avgWorkerSize + 500,
//     'tasks-clean.csv': tasks.length * avgTaskSize + 500,
//     'rules-config.json': rules.length * avgRuleSize + 2000 // JSON structure overhead
//   }
// }

/**
 * Create bulk download ZIP file with all export files
 */
export async function createBulkDownload(
  clients: Client[],
  workers: Worker[],
  tasks: Task[],
  rules: BusinessRule[],
  priorityWeights: PriorityWeights,
  priorityMethod: PriorityMethod,
  presetProfile: PresetProfile,
  validationSummary?: {
    clients: ValidationResult;
    workers: ValidationResult;
    tasks: ValidationResult;
  },
  options: BulkDownloadOptions = {},
  onProgress?: (progress: BulkDownloadProgress) => void
): Promise<BulkDownloadResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Initialize ZIP archive
    const zip = new JSZip();
    let completedFiles = 0;
    const totalFiles = 4;

    // Step 1: Generate CSV files
    onProgress?.({
      currentStep: 'Generating CSV files...',
      progress: 25,
      filesCompleted: 0,
      totalFiles,
      currentFile: 'CSV Export',
    });

    const csvResults = exportAllEntitiesToCSV(
      clients,
      workers,
      tasks,
      validationSummary,
      options
    );

    // Add CSV files to ZIP
    if (csvResults.clients.success) {
      zip.file('clients-clean.csv', csvResults.clients.csvContent);
      completedFiles++;
      onProgress?.({
        currentStep: 'Adding clients data...',
        progress: 25 + (completedFiles / totalFiles) * 15,
        filesCompleted: completedFiles,
        totalFiles,
        currentFile: 'clients-clean.csv',
      });
    } else {
      errors.push(`Clients CSV generation failed: ${csvResults.clients.error}`);
    }

    if (csvResults.workers.success) {
      zip.file('workers-clean.csv', csvResults.workers.csvContent);
      completedFiles++;
      onProgress?.({
        currentStep: 'Adding workers data...',
        progress: 25 + (completedFiles / totalFiles) * 15,
        filesCompleted: completedFiles,
        totalFiles,
        currentFile: 'workers-clean.csv',
      });
    } else {
      errors.push(`Workers CSV generation failed: ${csvResults.workers.error}`);
    }

    if (csvResults.tasks.success) {
      zip.file('tasks-clean.csv', csvResults.tasks.csvContent);
      completedFiles++;
      onProgress?.({
        currentStep: 'Adding tasks data...',
        progress: 25 + (completedFiles / totalFiles) * 15,
        filesCompleted: completedFiles,
        totalFiles,
        currentFile: 'tasks-clean.csv',
      });
    } else {
      errors.push(`Tasks CSV generation failed: ${csvResults.tasks.error}`);
    }

    // Collect CSV warnings
    warnings.push(...csvResults.summary.allWarnings);

    // Step 2: Generate Rules JSON
    onProgress?.({
      currentStep: 'Generating rules configuration...',
      progress: 50,
      filesCompleted: completedFiles,
      totalFiles,
      currentFile: 'rules-config.json',
    });

    try {
      const rulesJSON = exportRulesAsJSON(
        rules,
        priorityWeights,
        priorityMethod,
        presetProfile,
        clients,
        workers,
        tasks
      );

      zip.file('rules-config.json', rulesJSON);
      completedFiles++;

      onProgress?.({
        currentStep: 'Adding rules configuration...',
        progress: 65,
        filesCompleted: completedFiles,
        totalFiles,
        currentFile: 'rules-config.json',
      });
    } catch (error) {
      errors.push(
        `Rules JSON generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Check if we have any files to download
    if (completedFiles === 0) {
      throw new Error('No files were successfully generated for download');
    }

    // Step 3: Create ZIP file
    onProgress?.({
      currentStep: 'Creating ZIP archive...',
      progress: 80,
      filesCompleted: completedFiles,
      totalFiles,
      currentFile: 'Packaging files',
    });

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6, // Balanced compression
      },
    });

    // Step 4: Trigger download
    onProgress?.({
      currentStep: 'Preparing download...',
      progress: 95,
      filesCompleted: completedFiles,
      totalFiles,
      currentFile: 'Finalizing',
    });

    const filename = generateBulkFilename(options);
    await triggerZipDownload(zipBlob, filename);

    onProgress?.({
      currentStep: 'Download completed!',
      progress: 100,
      filesCompleted: completedFiles,
      totalFiles,
      currentFile: 'Complete',
    });

    return {
      success: true,
      filename,
      fileCount: completedFiles,
      totalSize: zipBlob.size,
      warnings,
      errors,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error during bulk download';
    errors.push(errorMessage);

    return {
      success: false,
      filename: '',
      fileCount: 0,
      totalSize: 0,
      warnings,
      errors,
    };
  }
}

/**
 * Trigger ZIP file download
 */
async function triggerZipDownload(
  zipBlob: Blob,
  filename: string
): Promise<void> {
  // Create download link
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate bulk download prerequisites
 */
export function validateBulkDownloadReadiness(
  clients: Client[],
  workers: Worker[],
  tasks: Task[],
  validationSummary?: {
    clients: ValidationResult;
    workers: ValidationResult;
    tasks: ValidationResult;
  }
): { isReady: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check if data exists
  if (clients.length === 0 && workers.length === 0 && tasks.length === 0) {
    issues.push('No data available for export');
  }

  // Check validation status
  if (validationSummary) {
    const totalErrors =
      (validationSummary.clients?.errors?.length || 0) +
      (validationSummary.workers?.errors?.length || 0) +
      (validationSummary.tasks?.errors?.length || 0);

    if (totalErrors > 0) {
      issues.push(
        `${totalErrors} validation errors must be fixed before export`
      );
    }
  }

  return {
    isReady: issues.length === 0,
    issues,
  };
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate download summary for user feedback
 */
export function generateDownloadSummary(result: BulkDownloadResult): {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error';
} {
  if (!result.success) {
    return {
      title: 'Download Failed',
      message: `Export failed: ${result.errors.join(', ')}`,
      type: 'error',
    };
  }

  if (result.warnings.length > 0) {
    return {
      title: 'Download Completed with Warnings',
      message: `${result.fileCount} files exported (${formatFileSize(result.totalSize)}). Warnings: ${result.warnings.join(', ')}`,
      type: 'warning',
    };
  }

  return {
    title: 'Download Completed Successfully',
    message: `${result.fileCount} files exported in ${result.filename} (${formatFileSize(result.totalSize)})`,
    type: 'success',
  };
}
