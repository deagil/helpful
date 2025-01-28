import { error } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client } = pkg;

/**
 * SvelteKit 2 uses `export const load = async (event) => ...` for
 * server load functions in +page.server.ts
 */
export const load = async ({ locals }) => {
  const { user, supabaseServiceRole } = locals;

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

  let client;
  try {
    // If “useSSL” is present, add an SSL option
    const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
    client = new Client({ connectionString, ssl });
    await client.connect();

    // 1) Fetch actual Postgres functions from information_schema
    const dbFuncsRes = await client.query(`
      SELECT
        routine_name,
        routine_schema
      FROM information_schema.routines
      WHERE routine_schema = 'config'
      ORDER BY routine_name;
    `);

    // 2) Fetch metadata from config.functions
    const metaFuncsRes = await client.query(`
      SELECT
        name,
        input_params,
        output_params,
        description,
        created_at
      FROM config.functions
      ORDER BY name DESC;
    `);

    await client.end();

    return {
      dbFunctions: dbFuncsRes.rows,
      metadataFunctions: metaFuncsRes.rows
    };
  } catch (err) {
    console.error('Error fetching functions:', err);
    if (client) {
      await client.end();
    }
    throw error(500, 'Failed to fetch functions');
  }
};