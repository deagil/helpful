import { error, fail } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client, Pool } = pkg;

const tableConfigCache = new Map();

export async function load({ params, locals }) {
  const { table } = params;
  const { user, supabaseServiceRole } = locals;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  const { data, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'supabase')
    .single();

  if (dbError || !data) {
    throw error(500, 'Failed to retrieve database configuration');
  }

  const decryptedConfig = JSON.parse(decrypt(data.config));
  const connectionString = decryptedConfig.connectionString;

  if (!connectionString) {
    throw error(500, 'Database connection string not found');
  }

  let ssl = false;
  if (decryptedConfig.useSSL) {
    ssl = { rejectUnauthorized: false };
  }

  let client;
  try {
    client = new Client({ connectionString, ssl });
    await client.connect();

    // Fetch columns
    const columnRes = await client.query(
      `
    SELECT
      a.attnum AS ordinal_position,
      a.attname AS column_name,
      CASE
        WHEN pg_catalog.format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
        WHEN pg_catalog.format_type(a.atttypid, a.atttypmod) = 'timestamp without time zone' THEN 'timestamp'
        ELSE pg_catalog.format_type(a.atttypid, a.atttypmod)
      END AS data_type,
      col_description(a.attrelid, a.attnum) AS description,
      a.attnotnull AS not_null,
      pg_get_expr(ad.adbin, ad.adrelid) AS default_value
    FROM  
      pg_attribute a
      LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
    WHERE
      a.attrelid = $1::regclass
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY
      a.attnum;
        `,
      [table]
    );

    const columns = columnRes.rows.map((row) => ({
      ordinal_position: parseInt(row.ordinal_position, 10),
      column_name: row.column_name,
      data_type: row.data_type,
      description: row.description || '',
      not_null: row.not_null,
      default_value: row.default_value,
    }));

    // Check cache
    let tableConfig = tableConfigCache.get(table);
    if (!tableConfig) {
      const configRes = await client.query(
        `SELECT user_facing_name, description, settings
         FROM config.tables
         WHERE table_name = $1`,
        [table]
      );

      if (configRes.rows.length > 0) {
        tableConfig = configRes.rows[0];
      } else {
        tableConfig = null;
      }

      tableConfigCache.set(table, tableConfig);
    }

    await client.end();

    // Merge config columns into columns array
    let settings = tableConfig?.settings || {};
    let columnsSettings = settings.columns || {};
    const mergedColumns = columns.map(col => {
      const colSettings = columnsSettings[col.column_name] || {};
      return {
        ...col,
        user_facing_label: colSettings.user_facing_label || col.column_name,
        help_text: colSettings.help_text || '',
        some_technical_option: colSettings.some_technical_option || 'default_value'
      };
    });

    return {
      table,
      columns: mergedColumns,
      user_facing_name: tableConfig?.user_facing_name || table,
      table_description: tableConfig?.description || '',
      settings
    };
  } catch (err) {
    console.error('Error fetching columns or config:', err);
    if (client) {
      await client?.end();
    }
    throw error(500, 'Failed to fetch columns or table configuration');
  }
}

export const actions = {
  updateConfig: async ({ request, locals, params }) => {
    const { table } = params;
    const { user, supabaseServiceRole } = locals;

    if (!user) {
      return fail(401, { errorMessage: 'Unauthorized' });
    }

    const formData = await request.formData();
    const columnCount = parseInt(formData.get('columnCount') as string, 10);

    // Reconstruct columns config
    const columnsSettings: Record<string, any> = {};
    for (let i = 0; i < columnCount; i++) {
      const prefix = `col_${i}_`;
      const colName = formData.get(prefix + 'column_name') as string;
      columnsSettings[colName] = {
        user_facing_label: formData.get(prefix + 'user_facing_label') || colName,
        help_text: formData.get(prefix + 'help_text') || '',
        some_technical_option: formData.get(prefix + 'some_technical_option') || 'default_value'
      };
    }

    // Fetch existing config
    const { data, error: fetchError } = await supabaseServiceRole
      .from('user_services')
      .select('config')
      .eq('user_id', user.id)
      .eq('app', 'supabase')
      .single();

    if (fetchError || !data) {
      return fail(500, { errorMessage: 'Error fetching user configuration.' });
    }

    const decryptedConfig = JSON.parse(decrypt(data.config));
    const userDbConnectionString = decryptedConfig.connectionString;

    if (!userDbConnectionString) {
      return fail(400, { errorMessage: 'User database connection string is missing.' });
    }

    const userPool = new Pool({
      connectionString: userDbConnectionString,
      ssl: decryptedConfig.useSSL ? { rejectUnauthorized: false } : false,
    });

    const client = await userPool.connect();

    try {
      // Load existing table config
      const cfgRes = await client.query(
        `SELECT user_facing_name, description, settings FROM config.tables WHERE table_name = $1`,
        [table]
      );

      let user_facing_name = table;
      let description = '';
      let settings = { columns: {} };

      if (cfgRes.rows.length > 0) {
        const row = cfgRes.rows[0];
        user_facing_name = row.user_facing_name || table;
        description = row.description || '';
        settings = row.settings || { columns: {} };
      }

      // Update settings with new column configurations
      settings.columns = columnsSettings;

      await client.query(`
        INSERT INTO config.tables (table_name, user_facing_name, description, settings)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (table_name) DO UPDATE SET
            user_facing_name = EXCLUDED.user_facing_name,
            description = EXCLUDED.description,
            settings = EXCLUDED.settings;
      `, [table, user_facing_name, description, JSON.stringify(settings)]);

      await client.end();

      return { success: true };
    } catch (err) {
      await client.end();
      await logError('Error updating table configuration', { event: { locals }, error: err });
      return fail(500, { errorMessage: 'Error updating configuration.' });
    }
  }
};