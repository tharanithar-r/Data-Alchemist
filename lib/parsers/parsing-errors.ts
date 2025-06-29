/**
 * Comprehensive error handling system for file parsing
 * Provides specific error types, recovery suggestions, and user-friendly messages
 */

export interface ParsingError {
  code: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  suggestion?: string;
  location?: {
    sheet?: string;
    row?: number;
    column?: string;
    cell?: string;
  };
  data?: unknown;
  recoverable: boolean;
}

export interface ParsingResult<T = unknown> {
  success: boolean;
  data: T;
  errors: ParsingError[];
  warnings: ParsingError[];
  info: ParsingError[];
  metadata?: {
    totalRows: number;
    totalColumns: number;
    processingTime: number;
    formatInfo?: any;
  };
}

export class ParsingErrorHandler {
  /**
   * Create a standardized parsing error
   */
  static createError(
    code: string,
    message: string,
    options: {
      type?: 'error' | 'warning' | 'info';
      details?: string;
      suggestion?: string;
      location?: ParsingError['location'];
      data?: unknown;
      recoverable?: boolean;
    } = {}
  ): ParsingError {
    const result: ParsingError = {
      code,
      type: options.type || 'error',
      message,
      suggestion: options.suggestion || this.getDefaultSuggestion(code),
      data: options.data,
      recoverable: options.recoverable ?? this.isRecoverable(code),
    };

    // Only add optional properties if they have actual values
    if (options.details) {
      result.details = options.details;
    }
    if (options.location) {
      result.location = options.location;
    }

    return result;
  }

  /**
   * Create file format error
   */
  static createFormatError(
    fileName: string,
    detectedFormat?: string,
    expectedFormats: string[] = ['.csv', '.xlsx', '.xls']
  ): ParsingError {
    return this.createError(
      'INVALID_FILE_FORMAT',
      `File "${fileName}" has an unsupported format${detectedFormat ? ` (detected: ${detectedFormat})` : ''}.`,
      {
        suggestion: `Please use one of the supported formats: ${expectedFormats.join(', ')}.`,
        recoverable: false,
      }
    );
  }

  /**
   * Create encoding error
   */
  static createEncodingError(
    fileName: string,
    detectedEncoding?: string
  ): ParsingError {
    return this.createError(
      'ENCODING_ERROR',
      `File "${fileName}" has encoding issues${detectedEncoding ? ` (detected: ${detectedEncoding})` : ''}.`,
      {
        type: 'warning',
        suggestion:
          'Try saving the file as UTF-8 encoded CSV or use Excel format.',
        recoverable: true,
      }
    );
  }

  /**
   * Create structure error
   */
  static createStructureError(
    message: string,
    location?: ParsingError['location'],
    suggestion?: string
  ): ParsingError {
    return this.createError('STRUCTURE_ERROR', message, {
      type: 'error',
      location,
      suggestion:
        suggestion ||
        'Check the file structure and ensure consistent formatting.',
      recoverable: true,
    });
  }

  /**
   * Create data validation error
   */
  static createValidationError(
    message: string,
    location?: ParsingError['location'],
    data?: unknown
  ): ParsingError {
    return this.createError('DATA_VALIDATION_ERROR', message, {
      type: 'warning',
      location,
      data,
      suggestion: 'Review the data and fix any inconsistencies.',
      recoverable: true,
    });
  }

  /**
   * Create missing data error
   */
  static createMissingDataError(
    fieldName: string,
    location?: ParsingError['location']
  ): ParsingError {
    return this.createError(
      'MISSING_REQUIRED_DATA',
      `Missing required field: ${fieldName}`,
      {
        type: 'error',
        location,
        suggestion: `Ensure the file contains a column for "${fieldName}" or map it during import.`,
        recoverable: true,
      }
    );
  }

  /**
   * Create duplicate data error
   */
  static createDuplicateError(
    fieldName: string,
    value: string,
    locations: ParsingError['location'][]
  ): ParsingError {
    const locationText = locations
      .map(loc => `${loc?.sheet || 'Sheet'}:${loc?.row || '?'}`)
      .join(', ');

    return this.createError(
      'DUPLICATE_DATA',
      `Duplicate ${fieldName}: "${value}" found at ${locationText}`,
      {
        type: 'warning',
        suggestion: 'Remove duplicate entries or ensure unique identifiers.',
        recoverable: true,
        data: { duplicateValue: value, locations },
      }
    );
  }

  /**
   * Create type conversion error
   */
  static createTypeError(
    fieldName: string,
    expectedType: string,
    actualValue: unknown,
    location?: ParsingError['location']
  ): ParsingError {
    return this.createError(
      'TYPE_CONVERSION_ERROR',
      `Cannot convert "${actualValue}" to ${expectedType} for field "${fieldName}"`,
      {
        type: 'warning',
        location,
        data: { expectedType, actualValue },
        suggestion: `Ensure "${fieldName}" contains valid ${expectedType} values.`,
        recoverable: true,
      }
    );
  }

  /**
   * Create header mapping error
   */
  static createHeaderMappingError(
    unmappedHeaders: string[],
    entityType: string
  ): ParsingError {
    return this.createError(
      'HEADER_MAPPING_ERROR',
      `Could not map headers for ${entityType}: ${unmappedHeaders.join(', ')}`,
      {
        type: 'warning',
        suggestion:
          'Review column names and use standard naming conventions, or manually map columns.',
        recoverable: true,
        data: { unmappedHeaders, entityType },
      }
    );
  }

  /**
   * Create empty file error
   */
  static createEmptyFileError(fileName: string): ParsingError {
    return this.createError(
      'EMPTY_FILE',
      `File "${fileName}" is empty or contains no data.`,
      {
        suggestion: 'Ensure the file contains data rows with headers.',
        recoverable: false,
      }
    );
  }

  /**
   * Create file size error
   */
  static createFileSizeError(
    fileName: string,
    fileSize: number,
    maxSize: number
  ): ParsingError {
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);

    return this.createError(
      'FILE_TOO_LARGE',
      `File "${fileName}" (${fileSizeMB}MB) exceeds the ${maxSizeMB}MB limit.`,
      {
        suggestion:
          'Split the data into smaller files or remove unnecessary columns.',
        recoverable: false,
      }
    );
  }

  /**
   * Create corruption error
   */
  static createCorruptionError(
    fileName: string,
    details?: string
  ): ParsingError {
    const options: any = {
      suggestion:
        'Try opening and re-saving the file, or use a different file format.',
      recoverable: false,
    };
    
    if (details) {
      options.details = details;
    }

    return this.createError(
      'FILE_CORRUPTED',
      `File "${fileName}" appears to be corrupted or damaged.`,
      options
    );
  }

  /**
   * Create permission error
   */
  static createPermissionError(fileName: string): ParsingError {
    return this.createError(
      'PERMISSION_DENIED',
      `Cannot access file "${fileName}". Permission denied.`,
      {
        suggestion:
          'Check file permissions or try copying the file to a different location.',
        recoverable: false,
      }
    );
  }

  /**
   * Get default suggestion for error code
   */
  private static getDefaultSuggestion(code: string): string {
    const suggestions: Record<string, string> = {
      INVALID_FILE_FORMAT: 'Use a supported file format (CSV, XLSX, or XLS).',
      ENCODING_ERROR: 'Save the file with UTF-8 encoding.',
      STRUCTURE_ERROR: 'Check the file structure and formatting.',
      DATA_VALIDATION_ERROR: 'Review and correct the data.',
      MISSING_REQUIRED_DATA: 'Ensure all required fields are present.',
      DUPLICATE_DATA: 'Remove or fix duplicate entries.',
      TYPE_CONVERSION_ERROR: 'Check data types and format.',
      HEADER_MAPPING_ERROR: 'Use standard column names or map manually.',
      EMPTY_FILE: 'Provide a file with data.',
      FILE_TOO_LARGE: 'Reduce file size.',
      FILE_CORRUPTED: 'Use a different file or repair the current one.',
      PERMISSION_DENIED: 'Check file permissions.',
    };

    return suggestions[code] || 'Please review the issue and try again.';
  }

  /**
   * Check if error is recoverable
   */
  private static isRecoverable(code: string): boolean {
    const nonRecoverableErrors = [
      'INVALID_FILE_FORMAT',
      'EMPTY_FILE',
      'FILE_TOO_LARGE',
      'FILE_CORRUPTED',
      'PERMISSION_DENIED',
    ];

    return !nonRecoverableErrors.includes(code);
  }

  /**
   * Format error for display
   */
  static formatErrorMessage(error: ParsingError): string {
    let message = error.message;

    if (error.location) {
      const loc = error.location;
      const locationParts = [];

      if (loc?.sheet) locationParts.push(`Sheet: ${loc.sheet}`);
      if (loc?.row) locationParts.push(`Row: ${loc.row}`);
      if (loc?.column) locationParts.push(`Column: ${loc.column}`);
      if (loc?.cell) locationParts.push(`Cell: ${loc.cell}`);

      if (locationParts.length > 0) {
        message += ` (${locationParts.join(', ')})`;
      }
    }

    return message;
  }

  /**
   * Group errors by type and code
   */
  static groupErrors(errors: ParsingError[]): Record<string, ParsingError[]> {
    return errors.reduce(
      (groups, error) => {
        const key = error.code;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(error);
        return groups;
      },
      {} as Record<string, ParsingError[]>
    );
  }

  /**
   * Get summary of errors
   */
  static getErrorSummary(errors: ParsingError[]): {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    recoverable: number;
    critical: number;
  } {
    return {
      total: errors.length,
      errors: errors.filter(e => e.type === 'error').length,
      warnings: errors.filter(e => e.type === 'warning').length,
      info: errors.filter(e => e.type === 'info').length,
      recoverable: errors.filter(e => e.recoverable).length,
      critical: errors.filter(e => e.type === 'error' && !e.recoverable).length,
    };
  }

  /**
   * Convert errors to user-friendly format
   */
  static formatErrorsForUser(errors: ParsingError[]): {
    critical: string[];
    fixable: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const result = {
      critical: [] as string[],
      fixable: [] as string[],
      warnings: [] as string[],
      suggestions: [] as string[],
    };

    errors.forEach(error => {
      const message = this.formatErrorMessage(error);

      if (error.type === 'error' && !error.recoverable) {
        result.critical.push(message);
      } else if (error.type === 'error' && error.recoverable) {
        result.fixable.push(message);
      } else if (error.type === 'warning') {
        result.warnings.push(message);
      }

      if (error.suggestion) {
        result.suggestions.push(error.suggestion);
      }
    });

    // Remove duplicate suggestions
    result.suggestions = [...new Set(result.suggestions)];

    return result;
  }
}
