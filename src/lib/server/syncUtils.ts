export function compareTables(liveTables: any[], savedTables: any[]) {
  // Create maps keyed by the table's identifier:
  const liveTableMap = new Map(liveTables.map((table) => [table.name, table]));
  const savedTableMap = new Map(savedTables.map((table) => [table.name, table]));

  let differences: any[] = [];

  // For each live table, compare to the saved record
  for (const [tableName, live] of liveTableMap) {
    if (!savedTableMap.has(tableName)) {
      differences.push({
        type: 'new_table',
        name: tableName,
        message: `Table '${tableName}' exists in the live database but is not saved in configuration.`
      });
    } else {
      const saved = savedTableMap.get(tableName);
      // Convert the saved model (an object) into an array of column objects.
      const savedColumns = getColumnsFromModel(saved.model);
      // If live.columns is not defined, default to an empty array.
      const liveColumns = live.columns || [];
      const columnDifferences = compareColumns(liveColumns, savedColumns, tableName);
      differences.push(...columnDifferences);
    }
  }

  // Detect tables that exist in config but not in the live data.
  for (const [tableName] of savedTableMap) {
    if (!liveTableMap.has(tableName)) {
      differences.push({
        type: 'deleted_table',
        table_name: tableName,
        message: `Table '${tableName}' is saved in configuration but no longer exists in the live database.`
      });
    }
  }

  return differences;
}

/**
 * Helper: Convert a saved model object (with keys as column names) to an array
 * where each element is an object that includes the column_name and its settings.
 */
function getColumnsFromModel(model: any): any[] {
  if (!model) return [];
  return Object.entries(model).map(([column_name, colData]) => ({ column_name, ...colData }));
}

export function compareColumns(liveColumns: any[], savedColumns: any[], tableName: string) {
  const liveColumnMap = new Map(liveColumns.map((col) => [col.column_name, col]));
  const savedColumnMap = new Map(savedColumns.map((col) => [col.column_name, col]));

  let columnDifferences: any[] = [];

  // Detect new or modified columns in the live data.
  for (const [colName, liveCol] of liveColumnMap) {
    if (!savedColumnMap.has(colName)) {
      columnDifferences.push({
        type: 'new_column',
        column_name: colName,
        message: `${tableName} has a new ${liveCol.data_type} column '${colName}'.`
      });
    } else {
      const savedCol = savedColumnMap.get(colName);
      if (liveCol.data_type !== savedCol.data_type) {
        columnDifferences.push({
          type: 'data_type_change',
          column_name: colName,
          message: `Column '${colName}' data type changed from ${savedCol.data_type} to ${liveCol.data_type}.`
        });
      }
    }
  }

  // Detect columns that have been removed from the live database.
  for (const [colName] of savedColumnMap) {
    if (!liveColumnMap.has(colName)) {
      columnDifferences.push({
        type: 'deleted_column',
        column_name: colName,
        message: `Column '${colName}' has been removed.`
      });
    }
  }

  return columnDifferences;
}