import * as XLSX from 'xlsx';

import {
  ColumnMapping,
  HeaderMappingResult,
  ImportResult,
} from '@/lib/types/entities';

import { FileFormatDetector, FileFormatInfo } from './file-format-detector';
import { ParsingErrorHandler, ParsingError } from './parsing-errors';

export class FileParser {
  private static readonly SUPPORTED_FORMATS = ['.csv', '.xlsx', '.xls'];
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Known column patterns for AI-assisted mapping
  private static readonly COLUMN_PATTERNS = {
    client: {
      ClientID: ['clientid', 'client_id', 'id', 'client id', 'customer_id'],
      ClientName: [
        'clientname',
        'client_name',
        'name',
        'client name',
        'customer_name',
      ],
      PriorityLevel: [
        'prioritylevel',
        'priority_level',
        'priority',
        'priority level',
        'importance',
      ],
      RequestedTaskIDs: [
        'requestedtaskids',
        'requested_task_ids',
        'tasks',
        'requested_tasks',
        'task_ids',
        'task ids',
      ],
      GroupTag: ['grouptag', 'group_tag', 'group', 'team', 'department'],
      AttributesJSON: [
        'attributesjson',
        'attributes_json',
        'attributes',
        'metadata',
        'extra_data',
        'json_data',
      ],
    },
    worker: {
      WorkerID: ['workerid', 'worker_id', 'id', 'worker id', 'employee_id'],
      WorkerName: [
        'workername',
        'worker_name',
        'name',
        'worker name',
        'employee_name',
      ],
      Skills: ['skills', 'skill', 'capabilities', 'expertise'],
      AvailableSlots: [
        'availableslots',
        'available_slots',
        'slots',
        'capacity',
        'availability',
      ],
      MaxLoadPerPhase: [
        'maxloadperphase',
        'max_load_per_phase',
        'max_load',
        'load_limit',
        'phase_capacity',
      ],
      WorkerGroup: [
        'workergroup',
        'worker_group',
        'group',
        'team',
        'department',
      ],
      QualificationLevel: [
        'qualificationlevel',
        'qualification_level',
        'level',
        'qualification',
        'seniority',
        'experience',
      ],
    },
    task: {
      TaskID: ['taskid', 'task_id', 'id', 'task id'],
      TaskName: ['taskname', 'task_name', 'name', 'task name', 'title'],
      Category: ['category', 'type', 'task_type', 'classification'],
      Duration: ['duration', 'time', 'hours', 'effort'],
      RequiredSkills: [
        'requiredskills',
        'required_skills',
        'skills',
        'skill_requirements',
      ],
      PreferredPhases: [
        'preferredphases',
        'preferred_phases',
        'phases',
        'timeline',
      ],
      MaxConcurrent: [
        'maxconcurrent',
        'max_concurrent',
        'concurrency',
        'parallel_limit',
      ],
    },
  };

  static async parseFile(file: File): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: ParsingError[] = [];
    const warnings: ParsingError[] = [];

    try {
      // Step 1: Comprehensive format detection
      const formatInfo = await FileFormatDetector.detectFormat(file);

      // Add format issues to errors/warnings
      formatInfo.issues.forEach(issue => {
        const errorOptions: any = {
          type: issue.type,
          location: issue.line
            ? {
                row: issue.line,
                ...(issue.column?.toString() && {
                  column: issue.column.toString(),
                }),
              }
            : undefined,
        };

        if (issue.suggestion) {
          errorOptions.suggestion = issue.suggestion;
        }

        const error = ParsingErrorHandler.createError(
          issue.code,
          issue.message,
          errorOptions
        );

        if (issue.type === 'error') {
          errors.push(error);
        } else {
          warnings.push(error);
        }
      });

      // Stop if we have critical format errors
      if (!formatInfo.isValid || errors.some(e => !e.recoverable)) {
        return this.createFailureResult(errors, warnings, startTime);
      }

      // Step 2: Parse file content
      const parseResult = await this.parseFileContent(file, formatInfo);

      // Combine errors and warnings
      errors.push(...parseResult.errors);
      warnings.push(...parseResult.warnings);

      // Step 3: Create final result
      const result: ImportResult = {
        clients: parseResult.clients || [],
        workers: parseResult.workers || [],
        tasks: parseResult.tasks || [],
        errors: errors.map(e => ParsingErrorHandler.formatErrorMessage(e)),
        warnings: warnings.map(w => ParsingErrorHandler.formatErrorMessage(w)),
        metadata: {
          formatInfo,
          processingTime: Date.now() - startTime,
          totalErrors: errors.length,
          totalWarnings: warnings.length,
        },
      };

      return result;
    } catch (error) {
      const errorOptions: any = {
        recoverable: false,
      };

      if (error instanceof Error && error.stack) {
        errorOptions.details = error.stack;
      }

      const parseError = ParsingErrorHandler.createError(
        'PARSING_FAILED',
        error instanceof Error ? error.message : 'Unknown parsing error',
        errorOptions
      );

      errors.push(parseError);
      return this.createFailureResult(errors, warnings, startTime);
    }
  }

  private static getFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  }

  private static processWorkbook(
    workbook: XLSX.WorkBook
  ): Record<string, unknown[][]> {
    const sheets: Record<string, unknown[][]> = {};

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      sheets[sheetName] = data as unknown[][];
    });

    return sheets;
  }

  private static mapHeaders(
    sheets: Record<string, unknown[][]>
  ): HeaderMappingResult {
    const result: HeaderMappingResult = {
      clientMappings: [],
      workerMappings: [],
      taskMappings: [],
      unmappedColumns: [],
    };

    Object.entries(sheets).forEach(([sheetName, data]) => {
      if (data.length === 0) return;

      const headers = data[0] as string[];
      const entityType = this.identifyEntityType(sheetName, headers);

      if (entityType) {
        const mappings = this.generateColumnMappings(headers, entityType);

        switch (entityType) {
          case 'client':
            result.clientMappings = mappings;
            break;
          case 'worker':
            result.workerMappings = mappings;
            break;
          case 'task':
            result.taskMappings = mappings;
            break;
        }
      } else {
        // If we can't identify the entity type, add to unmapped
        result.unmappedColumns.push(...headers);
      }
    });

    return result;
  }

  private static identifyEntityType(
    sheetName: string,
    headers: string[]
  ): 'client' | 'worker' | 'task' | null {
    const normalizedSheetName = sheetName.toLowerCase();
    const normalizedHeaders = headers.map(h => h?.toLowerCase() || '');

    // Check sheet name first
    if (
      normalizedSheetName.includes('client') ||
      normalizedSheetName.includes('customer')
    ) {
      return 'client';
    }
    if (
      normalizedSheetName.includes('worker') ||
      normalizedSheetName.includes('employee')
    ) {
      return 'worker';
    }
    if (
      normalizedSheetName.includes('task') ||
      normalizedSheetName.includes('job')
    ) {
      return 'task';
    }

    // Check headers for entity-specific patterns
    const clientScore = this.calculateEntityScore(normalizedHeaders, 'client');
    const workerScore = this.calculateEntityScore(normalizedHeaders, 'worker');
    const taskScore = this.calculateEntityScore(normalizedHeaders, 'task');

    const maxScore = Math.max(clientScore, workerScore, taskScore);

    if (maxScore < 0.3) return null; // Confidence threshold

    if (clientScore === maxScore) return 'client';
    if (workerScore === maxScore) return 'worker';
    if (taskScore === maxScore) return 'task';

    return null;
  }

  private static calculateEntityScore(
    headers: string[],
    entityType: 'client' | 'worker' | 'task'
  ): number {
    const patterns = this.COLUMN_PATTERNS[entityType];
    let matches = 0;
    const totalFields = Object.keys(patterns).length;

    Object.values(patterns).forEach(fieldPatterns => {
      const hasMatch = headers.some(header =>
        fieldPatterns.some(pattern => header.includes(pattern))
      );
      if (hasMatch) matches++;
    });

    return matches / totalFields;
  }

  private static generateColumnMappings(
    headers: string[],
    entityType: 'client' | 'worker' | 'task'
  ): ColumnMapping[] {
    const patterns = this.COLUMN_PATTERNS[entityType];
    const mappings: ColumnMapping[] = [];

    // Mapping columns for entity type

    Object.entries(patterns).forEach(([targetField, fieldPatterns]) => {
      let bestMatch: { header: string; confidence: number } | null = null;

      headers.forEach(header => {
        if (!header) return;

        const normalizedHeader = header.toLowerCase();
        const confidence = this.calculateFieldConfidence(
          normalizedHeader,
          fieldPatterns
        );

        if (
          confidence > 0.5 &&
          (!bestMatch || confidence > bestMatch.confidence)
        ) {
          bestMatch = { header, confidence };
        }
      });

      if (bestMatch) {
        const match = bestMatch as { header: string; confidence: number };
        mappings.push({
          sourceColumn: match.header,
          targetField,
          confidence: match.confidence,
          isConfirmed: match.confidence > 0.8,
        });
      } else {
      }
    });

    return mappings;
  }

  private static calculateFieldConfidence(
    header: string,
    patterns: string[]
  ): number {
    let maxConfidence = 0;

    patterns.forEach(pattern => {
      if (header === pattern) {
        maxConfidence = Math.max(maxConfidence, 1.0);
      } else if (header.includes(pattern)) {
        maxConfidence = Math.max(maxConfidence, 0.8);
      } else if (pattern.includes(header)) {
        maxConfidence = Math.max(maxConfidence, 0.6);
      }
    });

    return maxConfidence;
  }

  private static async parseSheetData(
    sheets: Record<string, unknown[][]>,
    mappings: HeaderMappingResult
  ): Promise<ImportResult> {
    const result: ImportResult = {
      clients: [],
      workers: [],
      tasks: [],
      errors: [],
      warnings: [],
    };

    try {
      // Parse clients
      if (mappings.clientMappings.length > 0) {
        const clientSheet = this.findSheetByMappings(
          sheets,
          mappings.clientMappings
        );
        if (clientSheet) {
          result.clients = this.parseEntityData(
            clientSheet,
            mappings.clientMappings,
            'client'
          ) as typeof result.clients;
        }
      }

      // Parse workers
      if (mappings.workerMappings.length > 0) {
        const workerSheet = this.findSheetByMappings(
          sheets,
          mappings.workerMappings
        );
        if (workerSheet) {
          result.workers = this.parseEntityData(
            workerSheet,
            mappings.workerMappings,
            'worker'
          ) as typeof result.workers;
        }
      }

      // Parse tasks
      if (mappings.taskMappings.length > 0) {
        const taskSheet = this.findSheetByMappings(
          sheets,
          mappings.taskMappings
        );
        if (taskSheet) {
          result.tasks = this.parseEntityData(
            taskSheet,
            mappings.taskMappings,
            'task'
          ) as typeof result.tasks;
        }
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Data parsing error'
      );
    }

    return result;
  }

  private static findSheetByMappings(
    sheets: Record<string, unknown[][]>,
    mappings: ColumnMapping[]
  ): unknown[][] | null {
    for (const [, data] of Object.entries(sheets)) {
      if (data.length === 0) continue;

      const headers = data[0] as string[];
      const hasAllMappings = mappings.every(mapping =>
        headers.includes(mapping.sourceColumn)
      );

      if (hasAllMappings) {
        return data;
      }
    }

    return null;
  }

  private static parseEntityData(
    sheetData: unknown[][],
    mappings: ColumnMapping[],
    _entityType: string
  ): unknown[] {
    if (sheetData.length < 2) return []; // No data rows

    const headers = sheetData[0] as string[];
    const rows = sheetData.slice(1);

    // Create column index map
    const columnMap = new Map<string, number>();
    mappings.forEach(mapping => {
      const index = headers.indexOf(mapping.sourceColumn);
      if (index !== -1) {
        columnMap.set(mapping.targetField, index);
      }
    });

    return rows
      .map(row => {
        const entity: Record<string, unknown> = {};

        mappings.forEach(mapping => {
          const columnIndex = columnMap.get(mapping.targetField);
          if (columnIndex !== undefined) {
            let value = row[columnIndex];

            // Type conversion based on target field
            if (
              mapping.targetField.includes('Level') ||
              mapping.targetField.includes('Load') ||
              mapping.targetField.includes('Duration') ||
              mapping.targetField.includes('Concurrent')
            ) {
              value = Number(value) || 0;
            } else if (mapping.targetField === 'AvailableSlots') {
              // Handle both numeric and JSON array formats
              if (typeof value === 'string' && value.trim().startsWith('[')) {
                try {
                  // Keep as JSON string for now, will be validated later
                  value = value.trim();
                } catch {
                  value = String(value || '');
                }
              } else {
                value = Number(value) || 0;
              }
            } else if (mapping.targetField === 'PreferredPhases') {
              // Handle both range ("1 - 2") and array ("[1,2]") formats
              value = String(value || '').trim();
            } else if (mapping.targetField === 'AttributesJSON') {
              // Keep as string for JSON validation later
              value = String(value || '').trim();
            } else if (typeof value !== 'string') {
              value = String(value || '');
            }

            entity[mapping.targetField] = value;
          }
        });

        return entity;
      })
      .filter(entity => {
        // Filter out empty entities
        if (Object.keys(entity).length === 0) return false;

        // For each entity type, check for essential fields
        const entityObj = entity as any;

        // Check if entity has at least one required field with meaningful data
        const requiredFields = [
          'ClientID',
          'ClientName', // Client required fields
          'WorkerID',
          'WorkerName', // Worker required fields
          'TaskID',
          'TaskName', // Task required fields
        ];

        const hasRequiredField = requiredFields.some(field => {
          const value = entityObj[field];
          if (!value) return false;
          const stringValue = String(value).trim();
          return stringValue.length > 0 && stringValue !== '0';
        });

        return hasRequiredField;
      });
  }

  /**
   * Create failure result with proper error formatting
   */
  private static createFailureResult(
    errors: ParsingError[],
    warnings: ParsingError[],
    startTime: number
  ): ImportResult {
    return {
      clients: [],
      workers: [],
      tasks: [],
      errors: errors.map(e => ParsingErrorHandler.formatErrorMessage(e)),
      warnings: warnings.map(w => ParsingErrorHandler.formatErrorMessage(w)),
      metadata: {
        processingTime: Date.now() - startTime,
        totalErrors: errors.length,
        totalWarnings: warnings.length,
      },
    };
  }

  /**
   * Parse file content based on detected format
   */
  private static async parseFileContent(
    file: File,
    formatInfo: FileFormatInfo
  ): Promise<{
    clients?: any[];
    workers?: any[];
    tasks?: any[];
    errors: ParsingError[];
    warnings: ParsingError[];
  }> {
    const errors: ParsingError[] = [];
    const warnings: ParsingError[] = [];

    try {
      if (formatInfo.extension === '.csv') {
        return await this.parseCSVFile(file, formatInfo, errors, warnings);
      } else {
        return await this.parseExcelFile(file, formatInfo, errors, warnings);
      }
    } catch (error) {
      errors.push(
        ParsingErrorHandler.createError(
          'CONTENT_PARSING_FAILED',
          error instanceof Error
            ? error.message
            : 'Failed to parse file content',
          { recoverable: false }
        )
      );

      return { errors, warnings };
    }
  }

  /**
   * Parse CSV file with enhanced error handling
   */
  private static async parseCSVFile(
    file: File,
    formatInfo: FileFormatInfo,
    errors: ParsingError[],
    warnings: ParsingError[]
  ): Promise<{
    clients?: any[];
    workers?: any[];
    tasks?: any[];
    errors: ParsingError[];
    warnings: ParsingError[];
  }> {
    try {
      const text = await file.text();
      const delimiter = formatInfo.delimiter || ',';

      // Convert CSV to worksheet format for unified processing
      const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(
          line => !line.split(delimiter).every(cell => cell.trim() === '')
        );

      if (lines.length === 0) {
        errors.push(ParsingErrorHandler.createEmptyFileError(file.name));
        return { errors, warnings };
      }

      const data = lines.map(line =>
        line.split(delimiter).map(cell => cell.trim())
      );
      const sheets = { [file.name]: data };

      // Use existing header mapping and parsing logic
      const mappingResult = this.mapHeaders(sheets);
      const result = await this.parseSheetData(sheets, mappingResult);

      return {
        clients: result.clients,
        workers: result.workers,
        tasks: result.tasks,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        ParsingErrorHandler.createError(
          'CSV_PARSING_FAILED',
          error instanceof Error ? error.message : 'Failed to parse CSV file',
          { recoverable: false }
        )
      );

      return { errors, warnings };
    }
  }

  /**
   * Parse Excel file with enhanced error handling
   */
  private static async parseExcelFile(
    file: File,
    _formatInfo: FileFormatInfo,
    errors: ParsingError[],
    warnings: ParsingError[]
  ): Promise<{
    clients?: any[];
    workers?: any[];
    tasks?: any[];
    errors: ParsingError[];
    warnings: ParsingError[];
  }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        errors.push(
          ParsingErrorHandler.createStructureError(
            'Excel file contains no worksheets',
            undefined,
            'Ensure the Excel file contains at least one worksheet with data.'
          )
        );
        return { errors, warnings };
      }

      // Process all sheets
      const sheets = this.processWorkbook(workbook);

      // Check for empty sheets
      const emptySheets = Object.entries(sheets)
        .filter(([, data]) => data.length === 0)
        .map(([name]) => name);

      if (emptySheets.length > 0) {
        warnings.push(
          ParsingErrorHandler.createError(
            'EMPTY_SHEETS',
            `Found empty sheets: ${emptySheets.join(', ')}`,
            {
              type: 'warning',
              suggestion: 'Remove empty sheets or add data to them.',
            }
          )
        );
      }

      // Map headers and parse data
      const mappingResult = this.mapHeaders(sheets);
      const result = await this.parseSheetData(sheets, mappingResult);

      return {
        clients: result.clients,
        workers: result.workers,
        tasks: result.tasks,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        ParsingErrorHandler.createCorruptionError(
          file.name,
          error instanceof Error ? error.message : undefined
        )
      );

      return { errors, warnings };
    }
  }

  static validateFileSize(file: File, maxSizeMB = 10): boolean {
    return file.size <= maxSizeMB * 1024 * 1024;
  }

  static validateFileType(file: File): boolean {
    const extension = this.getFileExtension(file.name);
    return this.SUPPORTED_FORMATS.includes(extension);
  }

  /**
   * Enhanced file validation with detailed error reporting
   */
  static async validateFile(file: File): Promise<ParsingError[]> {
    const errors: ParsingError[] = [];

    // Size validation
    if (file.size === 0) {
      errors.push(ParsingErrorHandler.createEmptyFileError(file.name));
    } else if (file.size > this.MAX_FILE_SIZE) {
      errors.push(
        ParsingErrorHandler.createFileSizeError(
          file.name,
          file.size,
          this.MAX_FILE_SIZE
        )
      );
    }

    // Type validation
    const extension = this.getFileExtension(file.name);
    if (!this.SUPPORTED_FORMATS.includes(extension)) {
      errors.push(ParsingErrorHandler.createFormatError(file.name, extension));
    }

    return errors;
  }
}
