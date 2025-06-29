/**
 * Advanced file format detection and validation system
 * Provides comprehensive format checking, encoding detection, and error handling
 */

export interface FileFormatInfo {
  extension: string;
  mimeType: string;
  encoding: string;
  delimiter?: string | undefined; // For CSV files
  isValid: boolean;
  confidence: number;
  issues: FileIssue[];
}

export interface FileIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
  line?: number;
  column?: number;
}

export type FileErrorCode = 
  | 'UNSUPPORTED_FORMAT'
  | 'CORRUPTED_FILE'
  | 'INVALID_ENCODING'
  | 'EMPTY_FILE'
  | 'PERMISSION_DENIED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_MAGIC_NUMBER'
  | 'MALFORMED_CSV'
  | 'MALFORMED_EXCEL'
  | 'MIXED_ENCODINGS'
  | 'INVALID_HEADERS'
  | 'INSUFFICIENT_DATA';

export class FileFormatDetector {
  // Magic numbers for file type detection
  private static readonly MAGIC_NUMBERS = {
    // Excel formats
    XLSX: [0x50, 0x4B, 0x03, 0x04], // ZIP signature (XLSX is ZIP-based)
    XLS: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE2 signature
    
    // CSV detection patterns (UTF-8 BOM)
    UTF8_BOM: [0xEF, 0xBB, 0xBF],
    UTF16_BE_BOM: [0xFE, 0xFF],
    UTF16_LE_BOM: [0xFF, 0xFE],
  };

  // Supported MIME types
  private static readonly SUPPORTED_MIME_TYPES = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'application/vnd.ms-excel', // XLS
    'application/excel',
  ];

  // Common CSV delimiters
  private static readonly CSV_DELIMITERS = [',', ';', '\t', '|'];

  /**
   * Comprehensive file format detection and validation
   */
  static async detectFormat(file: File): Promise<FileFormatInfo> {
    const result: FileFormatInfo = {
      extension: this.getFileExtension(file.name),
      mimeType: file.type,
      encoding: 'unknown',
      isValid: false,
      confidence: 0,
      issues: [],
    };

    try {
      // Basic validation
      await this.validateBasicFile(file, result);
      
      if (result.issues.some(issue => issue.type === 'error')) {
        return result;
      }

      // Read file header for magic number detection
      const headerBuffer = await this.readFileHeader(file);
      await this.validateMagicNumber(headerBuffer, result);

      // Encoding detection
      await this.detectEncoding(file, result);

      // Format-specific validation
      if (this.isCSVFile(result.extension, result.mimeType)) {
        await this.validateCSVFormat(file, result);
      } else if (this.isExcelFile(result.extension, result.mimeType)) {
        await this.validateExcelFormat(file, headerBuffer, result);
      }

      // Calculate confidence score
      result.confidence = this.calculateConfidence(result);
      result.isValid = result.confidence > 0.7 && !result.issues.some(issue => issue.type === 'error');

    } catch (error) {
      result.issues.push({
        type: 'error',
        code: 'PERMISSION_DENIED',
        message: 'Cannot read file. Please check file permissions.',
        suggestion: 'Try saving the file again or check if it\'s being used by another application.',
      });
    }

    return result;
  }

  /**
   * Basic file validation (size, name, etc.)
   */
  private static async validateBasicFile(file: File, result: FileFormatInfo): Promise<void> {
    // Check file size
    if (file.size === 0) {
      result.issues.push({
        type: 'error',
        code: 'EMPTY_FILE',
        message: 'File is empty.',
        suggestion: 'Please select a file that contains data.',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      result.issues.push({
        type: 'error',
        code: 'FILE_TOO_LARGE',
        message: `File size (${this.formatFileSize(file.size)}) exceeds 10MB limit.`,
        suggestion: 'Try splitting the data into smaller files or removing unnecessary columns.',
      });
      return;
    }

    // Check file extension
    if (!result.extension) {
      result.issues.push({
        type: 'warning',
        code: 'INVALID_HEADERS',
        message: 'File has no extension.',
        suggestion: 'Add a proper file extension (.csv, .xlsx, or .xls).',
      });
    }

    // Check supported extensions
    const supportedExtensions = ['.csv', '.xlsx', '.xls'];
    if (result.extension && !supportedExtensions.includes(result.extension)) {
      result.issues.push({
        type: 'error',
        code: 'UNSUPPORTED_FORMAT',
        message: `File format '${result.extension}' is not supported.`,
        suggestion: `Please use one of the supported formats: ${supportedExtensions.join(', ')}.`,
      });
    }

    // Check MIME type
    if (file.type && !this.SUPPORTED_MIME_TYPES.includes(file.type)) {
      result.issues.push({
        type: 'warning',
        code: 'UNSUPPORTED_FORMAT',
        message: `MIME type '${file.type}' may not be fully supported.`,
        suggestion: 'File might still work, but consider using standard CSV or Excel formats.',
      });
    }
  }

  /**
   * Read file header for magic number detection
   */
  private static async readFileHeader(file: File, bytes = 512): Promise<ArrayBuffer> {
    const slice = file.slice(0, bytes);
    return await slice.arrayBuffer();
  }

  /**
   * Validate file using magic numbers
   */
  private static async validateMagicNumber(
    headerBuffer: ArrayBuffer, 
    result: FileFormatInfo
  ): Promise<void> {
    const bytes = new Uint8Array(headerBuffer);

    // Check for Excel XLSX (ZIP signature)
    if (this.matchesMagicNumber(bytes, this.MAGIC_NUMBERS.XLSX)) {
      if (result.extension !== '.xlsx') {
        result.issues.push({
          type: 'warning',
          code: 'INVALID_HEADERS',
          message: 'File appears to be XLSX but has wrong extension.',
          suggestion: 'Rename the file with .xlsx extension.',
        });
      }
      return;
    }

    // Check for Excel XLS (OLE2 signature)
    if (this.matchesMagicNumber(bytes, this.MAGIC_NUMBERS.XLS)) {
      if (result.extension !== '.xls') {
        result.issues.push({
          type: 'warning',
          code: 'INVALID_HEADERS',
          message: 'File appears to be XLS but has wrong extension.',
          suggestion: 'Rename the file with .xls extension.',
        });
      }
      return;
    }

    // For files claiming to be Excel but not matching magic numbers
    if (['.xlsx', '.xls'].includes(result.extension)) {
      result.issues.push({
        type: 'error',
        code: 'CORRUPTED_FILE',
        message: 'Excel file appears to be corrupted or invalid.',
        suggestion: 'Try opening the file in Excel and saving it again.',
      });
    }
  }

  /**
   * Detect file encoding
   */
  private static async detectEncoding(file: File, result: FileFormatInfo): Promise<void> {
    const headerBuffer = await this.readFileHeader(file, 1024);
    const bytes = new Uint8Array(headerBuffer);

    // Check for BOM (Byte Order Mark)
    if (this.matchesMagicNumber(bytes, this.MAGIC_NUMBERS.UTF8_BOM)) {
      result.encoding = 'UTF-8 with BOM';
      return;
    }

    if (this.matchesMagicNumber(bytes, this.MAGIC_NUMBERS.UTF16_BE_BOM)) {
      result.encoding = 'UTF-16 BE';
      return;
    }

    if (this.matchesMagicNumber(bytes, this.MAGIC_NUMBERS.UTF16_LE_BOM)) {
      result.encoding = 'UTF-16 LE';
      return;
    }

    // Try to detect encoding by analyzing byte patterns
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const sample = decoder.decode(headerBuffer);
    
    if (sample.includes('�')) {
      result.issues.push({
        type: 'warning',
        code: 'INVALID_ENCODING',
        message: 'File may have encoding issues.',
        suggestion: 'Try saving the file as UTF-8 encoded CSV or Excel format.',
      });
      result.encoding = 'unknown (possible encoding issues)';
    } else {
      result.encoding = 'UTF-8';
    }
  }

  /**
   * Validate CSV format and detect delimiter
   */
  private static async validateCSVFormat(file: File, result: FileFormatInfo): Promise<void> {
    try {
      // Read first few lines to analyze structure
      const sampleSize = Math.min(8192, file.size); // 8KB sample
      const sampleBuffer = await file.slice(0, sampleSize).arrayBuffer();
      const decoder = new TextDecoder(result.encoding.includes('UTF-8') ? 'utf-8' : 'utf-8');
      const sampleText = decoder.decode(sampleBuffer);
      
      const lines = sampleText.split('\n').slice(0, 10); // First 10 lines
      
      if (lines.length === 0) {
        result.issues.push({
          type: 'error',
          code: 'EMPTY_FILE',
          message: 'CSV file appears to be empty.',
          suggestion: 'Ensure the file contains data rows.',
        });
        return;
      }

      // Detect delimiter
      const delimiter = this.detectCSVDelimiter(lines);
      result.delimiter = delimiter || undefined;

      if (!delimiter) {
        result.issues.push({
          type: 'error',
          code: 'MALFORMED_CSV',
          message: 'Cannot detect CSV delimiter.',
          suggestion: 'Ensure the CSV uses standard delimiters (comma, semicolon, or tab).',
        });
        return;
      }

      // Validate CSV structure
      this.validateCSVStructure(lines, delimiter, result);

    } catch (error) {
      result.issues.push({
        type: 'error',
        code: 'MALFORMED_CSV',
        message: 'Failed to parse CSV structure.',
        suggestion: 'Check that the file is a valid CSV format.',
      });
    }
  }

  /**
   * Validate Excel format
   */
  private static async validateExcelFormat(
    _file: File, 
    headerBuffer: ArrayBuffer, 
    result: FileFormatInfo
  ): Promise<void> {
    const bytes = new Uint8Array(headerBuffer);

    // Basic validation based on magic numbers already done
    // Additional Excel-specific validation could go here
    
    if (result.extension === '.xlsx' && !this.matchesMagicNumber(bytes, this.MAGIC_NUMBERS.XLSX)) {
      result.issues.push({
        type: 'error',
        code: 'MALFORMED_EXCEL',
        message: 'XLSX file structure is invalid.',
        suggestion: 'Try opening and re-saving the file in Excel.',
      });
    }

    if (result.extension === '.xls' && !this.matchesMagicNumber(bytes, this.MAGIC_NUMBERS.XLS)) {
      result.issues.push({
        type: 'error',
        code: 'MALFORMED_EXCEL',
        message: 'XLS file structure is invalid.',
        suggestion: 'Try opening and re-saving the file in Excel.',
      });
    }
  }

  /**
   * Detect CSV delimiter by analyzing line structure
   */
  private static detectCSVDelimiter(lines: string[]): string | null {
    const delimiterCounts: Record<string, number[]> = {};
    
    // Initialize counts for each delimiter
    this.CSV_DELIMITERS.forEach(delimiter => {
      delimiterCounts[delimiter] = [];
    });

    // Count occurrences of each delimiter in each line
    lines.forEach(line => {
      if (line.trim()) {
        this.CSV_DELIMITERS.forEach(delimiter => {
          const count = (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
          delimiterCounts[delimiter].push(count);
        });
      }
    });

    // Find delimiter with most consistent count across lines
    let bestDelimiter = null;
    let bestScore = 0;

    this.CSV_DELIMITERS.forEach(delimiter => {
      const counts = delimiterCounts[delimiter];
      if (counts.length === 0) return;

      // Calculate consistency score
      const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      const variance = counts.reduce((sum, count) => sum + Math.pow(count - avgCount, 2), 0) / counts.length;
      
      // Prefer delimiters with higher average count and lower variance
      const score = avgCount > 0 ? avgCount / (1 + variance) : 0;
      
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    });

    return bestDelimiter;
  }

  /**
   * Validate CSV structure consistency
   */
  private static validateCSVStructure(
    lines: string[], 
    delimiter: string, 
    result: FileFormatInfo
  ): void {
    const columnCounts: number[] = [];
    
    lines.forEach((line, index) => {
      if (line.trim()) {
        const columns = line.split(delimiter);
        columnCounts.push(columns.length);
        
        // Check for potential issues in specific lines
        if (columns.some(col => col.includes('\n'))) {
          result.issues.push({
            type: 'warning',
            code: 'MALFORMED_CSV',
            message: `Line ${index + 1} may contain unescaped line breaks.`,
            suggestion: 'Ensure multiline data is properly quoted.',
            line: index + 1,
          });
        }
      }
    });

    if (columnCounts.length === 0) return;

    // Check for consistent column count
    const firstRowColumns = columnCounts[0];
    const inconsistentRows = columnCounts.map((count, index) => ({ index, count }))
      .filter(({ count }) => count !== firstRowColumns);

    if (inconsistentRows.length > 0) {
      const maxInconsistent = 3; // Show up to 3 examples
      const examples = inconsistentRows.slice(0, maxInconsistent)
        .map(({ index, count }) => `Line ${index + 1}: ${count} columns`)
        .join(', ');

      result.issues.push({
        type: 'warning',
        code: 'MALFORMED_CSV',
        message: `Inconsistent column count. Header has ${firstRowColumns} columns, but some rows differ.`,
        suggestion: `Check data consistency. Examples: ${examples}`,
      });
    }
  }

  /**
   * Helper methods
   */
  private static matchesMagicNumber(bytes: Uint8Array, magicNumber: number[]): boolean {
    if (bytes.length < magicNumber.length) return false;
    return magicNumber.every((byte, index) => bytes[index] === byte);
  }

  private static getFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  }

  private static isCSVFile(extension: string, mimeType: string): boolean {
    return extension === '.csv' || mimeType.includes('csv') || mimeType === 'text/plain';
  }

  private static isExcelFile(extension: string, mimeType: string): boolean {
    return ['.xlsx', '.xls'].includes(extension) || 
           mimeType.includes('excel') || 
           mimeType.includes('spreadsheetml');
  }

  private static calculateConfidence(result: FileFormatInfo): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for correct extension
    if (['.csv', '.xlsx', '.xls'].includes(result.extension)) {
      confidence += 0.2;
    }

    // Boost confidence for correct MIME type
    if (this.SUPPORTED_MIME_TYPES.includes(result.mimeType)) {
      confidence += 0.2;
    }

    // Boost confidence for detected encoding
    if (result.encoding !== 'unknown') {
      confidence += 0.1;
    }

    // Reduce confidence for issues
    const errorCount = result.issues.filter(issue => issue.type === 'error').length;
    const warningCount = result.issues.filter(issue => issue.type === 'warning').length;
    
    confidence -= errorCount * 0.3;
    confidence -= warningCount * 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}