import { error } from '@sveltejs/kit';
import { fetchConfigTables, fetchUserTables } from '$lib/server/supabaseTables';
import { compareTables } from '$lib/server/syncUtils';

export async function load({ locals }) {
  const { user, supabaseServiceRole } = locals;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  try {
    // Fetch live tables and filter out vh_ prefixed ones
    let liveTables = await fetchUserTables(supabaseServiceRole, user.id);

    if (liveTables.error) {
      console.error('Failed to fetch saved config:', liveTables.error);
    }

    // Fetch saved configuration from vh_tables (or however your saved config is structured)
    let configTables = await fetchConfigTables(supabaseServiceRole, user.id);

    if (configTables.error) {
      console.error('Failed to fetch saved config:', configTables.error);
    }

    // Compare the live and saved configurations
    const differences = compareTables(liveTables, configTables);
    console.log(differences);
    const syncRequired = differences.length > 0;

    return { tables: liveTables, syncRequired, differences };
  } catch (err: any) {
    console.error(err);
    throw error(500, err.message);
  }
}