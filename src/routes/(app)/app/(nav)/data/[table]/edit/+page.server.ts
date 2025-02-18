import { error, fail } from '@sveltejs/kit';
import { fetchUserTables, fetchConfigTables } from '$lib/server/supabaseTables.js';

// Helper function to map Postgres data types to default Tally field types.
function mapToTallyFieldType(dataType) {
  const mapping = {
    text: 'INPUT_TEXT',
    integer: 'INPUT_NUMBER',
    boolean: 'CHECKBOX',
    uuid: 'INPUT_TEXT',
    timestamptz: 'INPUT_DATE',
    date: 'INPUT_DATE',
    timestamp: 'INPUT_DATE',
  };
  return mapping[dataType] || 'INPUT_TEXT';
}

// Helper: Build a Tally form payload from column settings.
function buildTallyFormPayload(columnsSettings) {
  return {
    status: 'PUBLISHED',
    blocks: Object.entries(columnsSettings).map(([colName, colSettings]) => ({
      uuid: generateUuid(),
      type: colSettings.tally_field_type,
      groupUuid: generateUuid(),
      payload: {
        html: colSettings.user_facing_label,
        help_text: colSettings.help_text,
        ...colSettings.tally_specific_options,
      },
    })),
  };
}

// Helper: Generate a UUID.
function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Stub: Sync with Tally – implement as needed.
async function syncWithTally(table, payload) {
  console.log(`Syncing Tally form for table ${table}:`, payload);
  return Promise.resolve();
}

export async function load({ params, locals }) {
  const { table } = params;
  const { user, supabaseServiceRole } = locals;
  if (!user) throw error(401, 'Unauthorized');

  // Get live table structure.
  const liveTables = await fetchUserTables(supabaseServiceRole, user.id);
  const liveTable = liveTables.find((t) => t.name === table);
  if (!liveTable) throw error(404, 'Live table not found');

  // Get saved configuration.
  const configTables = await fetchConfigTables(supabaseServiceRole, user.id);
  const tableConfig = configTables.find((cfg) => cfg.name === table) || { settings: {} };
  const settings = tableConfig.settings || {};

  // Merge per‑column settings: use the live columns array and, for each column, apply saved settings if available.
  const mergedColumns = (liveTable.columns || []).map((col) => {
    const columnSettings = settings.columns?.[col.column_name] || {};
    return {
      ...col,
      user_facing_label: columnSettings.user_facing_label || col.column_name,
      help_text: columnSettings.help_text || '',
      tally_field_type: columnSettings.tally_field_type || mapToTallyFieldType(col.data_type),
      tally_specific_options: columnSettings.tally_specific_options || {},
    };
  });

  return {
    table,
    columns: mergedColumns,
    user_facing_name: tableConfig.user_facing_name || table,
    table_description: tableConfig.description || '',
    settings,
  };
}

export const actions = {
  updateConfig: async ({ request, locals, params }) => {
    const { table } = params;
    const { user, supabaseServiceRole } = locals;
    if (!user) return fail(401, { errorMessage: 'Unauthorized' });

    const formData = await request.formData();

    // Parse the complete columns configuration from the hidden field.
    const allColumnsJSON = formData.get('all_columns');
    let allColumns;
    try {
      allColumns = JSON.parse(allColumnsJSON);
    } catch (e) {
      console.error('Failed to parse all_columns JSON:', e);
      return fail(400, { errorMessage: 'Invalid columns data.' });
    }

    // Build columnsSettings from the parsed array.
    const columnsSettings = {};
    for (const col of allColumns) {
      const colName = col.column_name;
      columnsSettings[colName] = {
        user_facing_label: col.user_facing_label || colName,
        help_text: col.help_text || '',
        tally_field_type: col.tally_field_type,
        tally_specific_options: col.tally_specific_options || {},
        include_in_forms: col.include_in_forms
      };
    }

    const userFacingName = formData.get('user_facing_name') || table;
    const tableDescription = formData.get('table_description') || '';

    console.log('Updating configuration for table:', table);
    console.log('New configuration:', { userFacingName, tableDescription, columnsSettings });

    // Now update the configuration record.
    // (Uncomment and adjust this section according to your Supabase setup)
    /*
    const { error: updateError } = await supabaseServiceRole
      .from('vh_tables')
      .upsert({
        name: table,
        user_facing_name: userFacingName,
        description: tableDescription,
        settings: { columns: columnsSettings }
      });
    if (updateError) return fail(500, { errorMessage: 'Failed to update configuration.' });
    */

    // Optionally, build and sync a Tally form payload.
    const tallyFormPayload = buildTallyFormPayload(columnsSettings);
    await syncWithTally(table, tallyFormPayload);

    return { success: true };
  }
};