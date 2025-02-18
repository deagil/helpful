import { json, error } from '@sveltejs/kit';
import { fetchUserTables, fetchConfigTables } from '$lib/server/supabaseTables';
import { decrypt } from '$lib/server/crypto';
import { compareTables } from '$lib/server/syncUtils';
import pkg from 'pg';
const { Client } = pkg;

/**
 * Helper: Given a live table’s column array (each with column_name and data_type),
 * return a "model" object keyed by column name containing default values for:
 *  - label (user facing column name)
 *  - comment (Postgres comment; not available from the query by default)
 *  - data_type (from Postgres)
 *  - tallyBlockType (for tally forms; default is null)
 *  - any extra settings (empty object by default)
 */
function transformColumns(columns: any[]): Record<string, any> {
  const model: Record<string, any> = {};
  for (const col of columns) {
    // You might later want to look up a comment or allow user customization.
    model[col.column_name] = {
      label: col.column_name,
      description: '',
      data_type: col.data_type,
      tallyBlockType: null,
      // add any other column-related settings as needed
    };
  }
  return model;
}

/**
 * Compares live tables against saved config.
 * Both arrays are assumed to be arrays of objects keyed by table name.
 * Returns an array of differences.
 */
// function compareTables(liveTables: any[], savedTables: any[]) {
//   const liveMap = new Map(liveTables.map((t) => [t.table_name, t]));
//   const savedMap = new Map(savedTables.map((t) => [t.name, t])); // saved table's primary key is 'name'

//   const differences: any[] = [];

//   // Check for new tables or changes in existing tables.
//   for (const [tableName, live] of liveMap) {
//     if (!savedMap.has(tableName)) {
//       differences.push({
//         type: 'new_table',
//         name: tableName,
//         message: `Table '${tableName}' exists in the live database but is not saved in configuration.`
//       });
//     } else {
//       const saved = savedMap.get(tableName);
//       // Compare fields; here we compare description and model.
//       if (live.description !== saved.description) {
//         differences.push({
//           type: 'description_change',
//           name: tableName,
//           message: `Table '${tableName}' description has changed.`
//         });
//       }
//       const liveModel = transformColumns(live.columns);
//       // A simple stringification comparison for the model.
//       if (JSON.stringify(liveModel) !== JSON.stringify(saved.model)) {
//         differences.push({
//           type: 'model_change',
//           name: tableName,
//           message: `Table '${tableName}' model has changed.`
//         });
//       }
//       // You might add further field comparisons (e.g. label, settings) if needed.
//     }
//   }

//   // Check for tables that exist in saved config but not in the live database.
//   for (const [tableName] of savedMap) {
//     if (!liveMap.has(tableName)) {
//       differences.push({
//         type: 'deleted_table',
//         name: tableName,
//         message: `Table '${tableName}' is saved in configuration but no longer exists in the live database.`
//       });
//     }
//   }

//   return differences;
// }

export async function GET({ locals }) {
  const { user, supabaseServiceRole } = locals;
  if (!user) throw error(401, 'Unauthorized');

  try {
    // Fetch live tables from the user's database.
    const liveTables = await fetchUserTables(supabaseServiceRole, user.id);
    // Ignore tables that begin with "vh_"
    const userTables = liveTables.filter((t) => !t.name.startsWith('vh_'));

    // Fetch saved configuration from the user's database.
    const configTables = await fetchConfigTables(supabaseServiceRole, user.id);
    // Note: saved config is expected to have fields: name, label, description, model, settings.
    // (If stored differently, adjust accordingly.)
    const differences = compareTables(userTables, configTables);
    const syncRequired = differences.length > 0;

    return json({ tables: userTables, syncRequired, differences });
  } catch (err: any) {
    console.error(err);
    throw error(500, err.message);
  }
}

export async function POST({ locals }) {
  const { user, supabaseServiceRole } = locals;
  if (!user) throw error(401, 'Unauthorized');

  let liveTables;
  try {
    // Fetch live tables from the user's database.
    liveTables = await fetchUserTables(supabaseServiceRole, user.id);
    // Filter out tables starting with "vh_"
    liveTables = liveTables.filter((t) => !t.name.startsWith('vh_'));
  } catch (err) {
    console.error('Error fetching live tables:', err);
    throw error(500, 'Failed to fetch live tables');
  }

  // Retrieve the connection configuration (encrypted in user_services) and decrypt it.
  const { data, error: configError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'supabase')
    .single();

  if (configError || !data) {
    throw error(500, 'Failed to retrieve database configuration');
  }
  const decryptedConfig = JSON.parse(decrypt(data.config));
  const connectionString = decryptedConfig.connectionString;
  if (!connectionString) {
    throw error(500, 'Database connection string not found');
  }

  let client;
  try {
    const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
    client = new Client({ connectionString, ssl });
    await client.connect();

    // Upsert each live table record into vh_tables.
    for (const table of liveTables) {
      const model = transformColumns(table.columns);
      // For the table-level settings, you might later derive these from the live database;
      // for now we default to an empty JSON object.
      const settings = {};

      await client.query(
        `INSERT INTO vh_tables (name, label, description, model, settings)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name)
         DO UPDATE SET label = EXCLUDED.label,
                       description = EXCLUDED.description,
                       model = EXCLUDED.model,
                       settings = EXCLUDED.settings;`,
        [
          table.name,            // name (primary key)
          table.name,            // label (default to table name)
          table.description || '',     // description (Postgres comment)
          JSON.stringify(model),       // model (transformed columns)
          JSON.stringify(settings)     // settings (default empty object)
        ]
      );
    }

    // Delete any configuration records in vh_tables for tables that are no longer live.
    const liveNames = liveTables.map((t) => t.name);
    await client.query(
      `DELETE FROM vh_tables WHERE name <> ALL($1::text[])`,
      [liveNames]
    );

    await client.end();
    return json({ success: true, tables: liveTables });
  } catch (err: any) {
    console.error('Error syncing configuration:', err);
    if (client) await client.end();
    throw error(500, 'Failed to update configuration');
  }
}