import { error } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client } = pkg;

export async function load({ params, locals }) {
  const { user, supabaseServiceRole } = locals;
  const { table, record } = params;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Fetch the encrypted database connection string
  const { data, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'supabase')
    .single();

  if (dbError || !data) {
    throw error(500, 'Failed to retrieve database configuration');
  }

  // Decrypt the config to get the connection string
  const decryptedConfig = JSON.parse(decrypt(data.config));
  const connectionString = decryptedConfig.connectionString;
  if (!connectionString) {
    throw error(500, 'Database connection string not found');
  }

  let client: any;
  try {
    const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
    client = new Client({ connectionString, ssl });
    await client.connect();

    // 1) Fetch the single record from the user’s table
    const recordQuery = `SELECT * FROM public."${table}" WHERE id = $1 LIMIT 1`;
    const recordRes = await client.query(recordQuery, [record]);
    if (recordRes.rows.length === 0) {
      throw error(404, `Record ${record} not found in table ${table}`);
    }
    const rowData = recordRes.rows[0];

    // 2) Fetch up to 5 recent changes from vh_audit_log
    //    (where record_table = table, record_id = record)
    const auditQuery = `
      SELECT *
      FROM public.vh_audit_log
      WHERE record_table = $1
        AND record_id = $2
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const auditRes = await client.query(auditQuery, [table, record]);
    const recentChanges = auditRes.rows;

    // 3) Fetch the table config from vh_tables
    const configQuery = `SELECT * FROM vh_tables WHERE name = $1 LIMIT 1`;
    const configRes = await client.query(configQuery, [table]);
    const tableConfigRow = configRes.rows[0] || null;

    // 4) If no config found, you can default or skip
    //    For example, skip or create a blank config
    const tableConfig = tableConfigRow || {
      name: table,
      label: table,
      description: '',
      model: {}
    };

    await client.end();

    return {
      table,
      recordId: record,
      rowData,
      recentChanges,
      tableConfig
      // placeholders for upcoming workflows, related records, etc.
      // you could also fetch them here if you had the logic ready
    };
  } catch (err) {
    console.error(`Error loading record ${record} from table ${table}:`, err);
    if (client) await client.end();
    throw error(500, `Failed to load record ${record} from table ${table}`);
  }
}