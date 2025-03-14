import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client } = pkg;

// This function fetches the live table structure
export async function fetchUserTables(supabaseServiceRole, userId) {
  // Retrieve the encrypted database connection string from your own app’s config table
  const { data, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', userId)
    .eq('app', 'supabase')
    .eq('enabled', '1')
    .single();

  if (dbError || !data) {
    throw new Error('Failed to retrieve database configuration');
  }

  const decryptedConfig = JSON.parse(decrypt(data.config));
  const connectionString = decryptedConfig.connectionString;

  if (!connectionString) {
    throw new Error('Database connection string not found');
  }

  let client;
  try {
    let ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
    console.log(`SSL: ` + ssl);
    client = new Client({ connectionString, ssl });
    await client.connect();

    // Query the live structure of tables from pg_class and related catalogs, excluding vh_ prefixed tables
    const res = await client.query(`
      SELECT
        c.relname AS name,
        obj_description(c.oid) AS description,
        c.reltuples AS row_estimate,
        json_agg(json_build_object(
          'column_name', a.attname,
          'data_type', pg_catalog.format_type(a.atttypid, a.atttypmod),
          'description', col_description(a.attrelid, a.attnum)
        )) AS columns
      FROM
        pg_class c
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      WHERE
        c.relkind = 'r'
        AND n.nspname = 'public'
        AND c.relname NOT LIKE 'vh_%'
      GROUP BY
        c.relname, c.oid, c.reltuples
      ORDER BY
        c.relname;
    `);

    const tables = res.rows.map((row) => ({
      name: row.name,
      description: row.description || '',
      row_estimate: Math.max(parseInt(row.row_estimate, 10), 0),
      columns: row.columns || []
    }));

    await client.end();
    return tables;
  } catch (err) {
    console.error('Error fetching live tables:', err);
    if (client) await client.end();
    throw new Error('Failed to fetch tables from the database');
  }
}

// This function fetches the stored configuration from the vh_tables table
export async function fetchConfigTables(supabaseServiceRole, userId) {
  // We use the same encrypted connection details from user_services
  const { data, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', userId)
    .eq('app', 'supabase')
    .single();

  if (dbError || !data) {
    throw new Error('Failed to retrieve database configuration for config tables');
  }

  const decryptedConfig = JSON.parse(decrypt(data.config));
  const connectionString = decryptedConfig.connectionString;

  if (!connectionString) {
    throw new Error('Database connection string not found');
  }

  let client;
  try {
    let ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
    client = new Client({ connectionString, ssl });
    await client.connect();

    // Assume each stored config record corresponds to a table in vh_tables
    const res = await client.query(`SELECT * FROM vh_tables;`);
    await client.end();
    return res.rows;
  } catch (err) {
    console.error('Error fetching config tables:', err);
    if (client) await client.end();
    throw new Error('Failed to fetch configuration from vh_tables');
  }
}


/**
 * Fetch user data dynamically from their own database.
 * @param {any} supabaseServiceRole - Supabase service role client
 * @param {string} userId - The user's ID
 * @param {string} tableName - The table to query
 * @param {number} limit - Number of rows to fetch (default: 50)
 * @param {number} offset - Offset for pagination (default: 0)
 * @returns {Promise<any[]>} - Returns the user's data from their database
 */
export async function fetchSingleTable(
  supabaseServiceRole: any,
  userId: string,
  tableName: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  // Step 1: Retrieve the encrypted database connection string
  const { data, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', userId)
    .eq('app', 'supabase')
    .single();

  if (dbError || !data) {
    throw new Error('Failed to retrieve database configuration for user');
  }

  // Step 2: Decrypt the credentials to get the connection string
  const decryptedConfig = JSON.parse(decrypt(data.config));
  const connectionString = decryptedConfig.connectionString;

  if (!connectionString) {
    throw new Error('Database connection string not found');
  }

  let client;
  try {
    // Step 3: Establish a database connection
    let ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
    client = new Client({ connectionString, ssl });
    await client.connect();

    // Step 4: Query the user’s table data
    const queryText = `SELECT * FROM public.${tableName} LIMIT $1 OFFSET $2`;
    const res = await client.query(queryText, [limit, offset]);

    await client.end();

    return res.rows;
  } catch (err) {
    console.error(`Error fetching data from user database (Table: ${tableName}):`, err);
    if (client) await client.end();
    throw new Error(`Failed to fetch data from ${tableName}`);
  }
}