import { error, fail } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client, Pool } = pkg;

const tableConfigCache = new Map();

export async function load({ params, locals }) {
  const { table } = params;
  const { user, supabaseServiceRole } = locals;

  if (!user) throw error(401, 'Unauthorized');

  const { data, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'supabase')
    .single();

  if (dbError || !data) throw error(500, 'Failed to retrieve database configuration');

  const decryptedConfig = JSON.parse(decrypt(data.config));
  const connectionString = decryptedConfig.connectionString;
  const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;

  let client;
  try {
    client = new Client({ connectionString, ssl });
    await client.connect();

    // Fetch table columns
    const columnRes = await client.query(`
      SELECT
        a.attnum AS ordinal_position,
        a.attname AS column_name,
        CASE
          WHEN pg_catalog.format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
          ELSE pg_catalog.format_type(a.atttypid, a.atttypmod)
        END AS data_type,
        col_description(a.attrelid, a.attnum) AS description,
        a.attnotnull AS not_null,
        pg_get_expr(ad.adbin, ad.adrelid) AS default_value
      FROM pg_attribute a
      LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
      WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum;
    `, [table]);

    const columns = columnRes.rows.map((row) => ({
      ordinal_position: parseInt(row.ordinal_position, 10),
      column_name: row.column_name,
      data_type: row.data_type,
      description: row.description || '',
      not_null: row.not_null,
      default_value: row.default_value,
    }));

    // Fetch table configuration
    const configRes = await client.query(`
      SELECT user_facing_name, description, settings
      FROM config.tables
      WHERE table_name = $1
    `, [table]);

    const tableConfig = configRes.rows[0] || { settings: {} };
    const settings = tableConfig.settings || {};

    // Merge column configs with user settings
    const mergedColumns = columns.map((col) => {
      const columnSettings = settings.columns?.[col.column_name] || {};
      return {
        ...col,
        user_facing_label: columnSettings.user_facing_label || col.column_name,
        help_text: columnSettings.help_text || '',
        tally_field_type: columnSettings.tally_field_type || mapToTallyFieldType(col.data_type),
        tally_specific_options: columnSettings.tally_specific_options || {},
      };
    });

    await client.end();
    return {
      table,
      columns: mergedColumns,
      user_facing_name: tableConfig.user_facing_name || table,
      table_description: tableConfig.description || '',
      settings,
    };
  } catch (err) {
    if (client) await client.end();
    console.error(err);
    throw error(500, 'Failed to fetch columns or table configuration');
  }
}

export const actions = {
  updateConfig: async ({ request, locals, params }) => {
    const { table } = params;
    const { user, supabaseServiceRole } = locals;

    if (!user) return fail(401, { errorMessage: 'Unauthorized' });

    const formData = await request.formData();
    const columnCount = parseInt(formData.get('columnCount'), 10);

    const columnsSettings = {};
    for (let i = 0; i < columnCount; i++) {
      const prefix = `col_${i}_`;
      const colName = formData.get(`${prefix}column_name`);
      columnsSettings[colName] = {
        user_facing_label: formData.get(`${prefix}user_facing_label`) || colName,
        help_text: formData.get(`${prefix}help_text`) || '',
        tally_field_type: formData.get(`${prefix}tally_field_type`),
        tally_specific_options: JSON.parse(formData.get(`${prefix}tally_specific_options`) || '{}'),
      };
    }

    const { data, error: fetchError } = await supabaseServiceRole
      .from('user_services')
      .select('config')
      .eq('user_id', user.id)
      .eq('app', 'supabase')
      .single();

    if (fetchError || !data) return fail(500, { errorMessage: 'Failed to fetch user configuration.' });

    const decryptedConfig = JSON.parse(decrypt(data.config));
    const userDbConnectionString = decryptedConfig.connectionString;
    const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;

    const userPool = new Pool({ connectionString: userDbConnectionString, ssl });
    const client = await userPool.connect();

    try {
      // Update Postgres Schema
      for (const [colName, colSettings] of Object.entries(columnsSettings)) {
        await client.query(`
          ALTER TABLE ${table}
          ALTER COLUMN ${colName}
          SET DATA TYPE ${colSettings.tally_field_type},
          SET NOT NULL ${colSettings.not_null ? 'TRUE' : 'FALSE'};
        `);
      }

      // Update Config
      await client.query(`
        INSERT INTO config.tables (table_name, settings)
        VALUES ($1, $2)
        ON CONFLICT (table_name) DO UPDATE SET settings = EXCLUDED.settings;
      `, [table, JSON.stringify({ columns: columnsSettings })]);

      // Synchronise with Tally
      const tallyFormPayload = buildTallyFormPayload(columnsSettings);
      await syncWithTally(table, tallyFormPayload);

      await client.end();
      return { success: true };
    } catch (err) {
      await client.end();
      console.error(err);
      return fail(500, { errorMessage: 'Failed to update configuration.' });
    }
  },
};

// Helper function to build Tally payload
function buildTallyFormPayload(columnsSettings) {
  return {
    status: 'PUBLISHED',
    blocks: Object.entries(columnsSettings).map(([colName, colSettings]) => ({
      uuid: generateUuid(),
      type: mapToTallyFieldType(colSettings.tally_field_type),
      groupUuid: generateUuid(),
      payload: {
        html: colSettings.user_facing_label,
        help_text: colSettings.help_text,
        ...colSettings.tally_specific_options,
      },
    })),
  };
}

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to map Postgres data types to Tally field types
function mapToTallyFieldType(dataType) {
  const mapping = {
    text: 'INPUT_TEXT',
    integer: 'INPUT_NUMBER',
    boolean: 'CHECKBOX',
    uuid: 'INPUT_TEXT',
    timestamptz: 'INPUT_DATE',
  };
  return mapping[dataType] || 'INPUT_TEXT';
}  