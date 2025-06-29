/**
 * AG Grid module registration for Data Alchemist
 * Registers all required community modules globally
 */

import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import { CsvExportModule } from '@ag-grid-community/csv-export';

// Register all community modules globally
ModuleRegistry.registerModules([ClientSideRowModelModule, CsvExportModule]);

// Export modules for individual registration if needed
export { ClientSideRowModelModule, CsvExportModule, ModuleRegistry };
