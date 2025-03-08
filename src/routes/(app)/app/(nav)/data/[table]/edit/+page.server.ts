import { error, fail } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';
import { fetchUserTables, fetchConfigTables } from '$lib/server/supabaseTables.js';

const { Client } = pkg;

function mapToTallyFieldType(dataType: string) {
  const mapping: Record<string, string> = {
    text: 'INPUT_TEXT',
    integer: 'INPUT_NUMBER',
    boolean: 'CHECKBOX',
    uuid: 'INPUT_TEXT',
    timestamptz: 'INPUT_DATE',
    date: 'INPUT_DATE',
    timestamp: 'INPUT_DATE'
  };
  return mapping[dataType] || 'INPUT_TEXT';
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export async function load({ params, locals }) {
  const { user, supabaseServiceRole } = locals;
  const { table } = params;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // 1) fetch user’s DB connection from supabase
  const { data, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'supabase')
    .single();

  if (dbError || !data) {
    throw error(500, 'Failed to retrieve database configuration');
  }

  // 2) decrypt connection info
  const decryptedConfig = JSON.parse(decrypt(data.config));
  const connectionString = decryptedConfig.connectionString;
  if (!connectionString) {
    throw error(500, 'Database connection string not found');
  }

  let client: any;
  try {
    // 3) connect to user’s database
    const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
    client = new Client({ connectionString, ssl });
    await client.connect();

    // 4) fetch table config + actual columns
    const [vhTablesRes, columnsRes] = await Promise.all([
      client.query(`SELECT * FROM vh_tables WHERE name = $1 LIMIT 1`, [table]),
      client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
      `, [table])
    ]);

    const tableConfigRow = vhTablesRes.rows[0];
    const liveColumns = columnsRes.rows || [];

    if (!tableConfigRow) {
      throw error(404, `Table config not found in vh_tables for '${table}'`);
    }

    // Merge the stored model with the actual columns
    const existingModel = tableConfigRow.model || {};
    const mergedColumns = liveColumns.map((col: any) => {
      const colName = col.column_name;
      const configForCol = existingModel[colName] || {};
      return {
        column_name: colName,
        data_type: col.data_type,
        user_facing_label: configForCol.label || colName,
        help_text: configForCol.description || '',
        tally_field_type: configForCol.tallyBlockType || mapToTallyFieldType(col.data_type)
      };
    });

    await client.end();

    // Return data to your Svelte edit page
    // Include both 'audit_logging_enabled' and 'audit_trigger_created'
    const audit_logging_enabled = tableConfigRow.settings?.audit_logging_enabled ?? false;
    const audit_trigger_created = tableConfigRow.settings?.audit_trigger_created ?? false;

    return {
      table,
      user_facing_name: tableConfigRow.label || table,
      table_description: tableConfigRow.description || '',
      columns: mergedColumns,
      audit_logging_enabled,
      audit_trigger_created
    };
  } catch (err) {
    console.error(`Error loading edit page for table ${table}:`, err);
    if (client) await client.end();
    throw error(500, `Failed to load edit page for '${table}'`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS: updateConfig
// ─────────────────────────────────────────────────────────────────────────────
export const actions = {
  updateConfig: async ({ request, locals, params }) => {
    const { table } = params;
    const { user, supabaseServiceRole } = locals;

    if (!user) return fail(401, { errorMessage: 'Unauthorized' });

    const formData = await request.formData();
    // We'll assume there's a checkbox or similar named "audit_logging_enabled"
    const auditLoggingEnabled = formData.has('audit_logging_enabled');

    // Parse the complete columns configuration
    const allColumnsJSON = formData.get('all_columns');
    let allColumns: any[];
    try {
      allColumns = JSON.parse(allColumnsJSON as string);
    } catch (e) {
      console.error('Failed to parse all_columns JSON:', e);
      return fail(400, { errorMessage: 'Invalid columns data.' });
    }

    // 1) fetch user’s DB connection from supabase
    const { data, error: dbError } = await supabaseServiceRole
      .from('user_services')
      .select('config')
      .eq('user_id', user.id)
      .eq('app', 'supabase')
      .single();

    if (dbError || !data) {
      console.error('Failed to retrieve database credentials:', dbError);
      return fail(500, { errorMessage: 'Could not retrieve database credentials.' });
    }

    // 2) decrypt connection info
    const decryptedConfig = JSON.parse(decrypt(data.config));
    const connectionString = decryptedConfig.connectionString;

    if (!connectionString) {
      return fail(500, { errorMessage: 'Database connection string missing.' });
    }

    let client: any;
    try {
      // 3) connect to user’s database
      const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
      client = new Client({ connectionString, ssl });
      await client.connect();

      // 4) fetch existing config from vh_tables
      const { rows: existingConfigRows } = await client.query(
        `SELECT model, settings FROM vh_tables WHERE name = $1 LIMIT 1`,
        [table]
      );
      if (!existingConfigRows?.length) {
        console.error(`No vh_tables row found for table ${table}`);
        return fail(404, { errorMessage: 'Table config not found.' });
      }

      const existingModel = existingConfigRows[0].model || {};
      const existingSettings = existingConfigRows[0].settings || {};

      // 5) merge new column settings into the existing model
      const updatedModel: Record<string, any> = { ...existingModel };
      for (const col of allColumns) {
        const colName = col.column_name;
        updatedModel[colName] = {
          ...existingModel[colName],
          label: col.user_facing_label || existingModel[colName]?.label || colName,
          description: col.help_text || existingModel[colName]?.description || '',
          tallyBlockType: col.tally_field_type || existingModel[colName]?.tallyBlockType || null
        };
      }

      // 6) store the new user-facing name and table description
      const userFacingName = formData.get('user_facing_name') || table;
      const tableDescription = formData.get('table_description') || '';

      // 7) handle the audit logging setting
      // We also track whether the trigger has been created in the DB
      let audit_trigger_created = !!existingSettings.audit_trigger_created;

      const triggerName = `${table}_audit_log`;

      if (auditLoggingEnabled) {
        // If the trigger was never created before, create it now
        if (!audit_trigger_created) {
          await client.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_trigger
                WHERE tgname = '${triggerName}'
              ) THEN
                EXECUTE 'CREATE TRIGGER ${triggerName}
                  AFTER INSERT OR DELETE OR UPDATE
                  ON public.${table}
                  FOR EACH ROW
                  EXECUTE PROCEDURE vh_record_audit_log()';
              END IF;
            END$$;
          `);
          audit_trigger_created = true;
        }
        // Now enable the trigger
        await client.query(`ALTER TABLE public."${table}" ENABLE TRIGGER "${triggerName}"`);
      } else {
        // If the user wants to disable logs but the trigger was previously created, disable it
        if (audit_trigger_created) {
          // This won't error out if the trigger is already disabled, but that's fine
          await client.query(`ALTER TABLE public."${table}" DISABLE TRIGGER "${triggerName}"`);
        }
      }

      // Update settings
      existingSettings.audit_logging_enabled = auditLoggingEnabled;
      existingSettings.audit_trigger_created = audit_trigger_created;

      // 8) update vh_tables with the new configuration
      await client.query(
        `UPDATE vh_tables
         SET label = $1, description = $2, model = $3, settings = $4
         WHERE name = $5`,
        [userFacingName, tableDescription, updatedModel, existingSettings, table]
      );

      await client.end();
      console.log('Successfully updated table configuration (including audit logging).');

      return { success: true };
    } catch (err) {
      console.error('Error updating table configuration:', err);
      if (client) await client.end();
      return fail(500, { errorMessage: 'Failed to update table configuration.' });
    }
  }
};