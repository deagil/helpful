import { error } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client } = pkg;

/**
 * Load the function metadata from config.functions and the actual DB routine
 * from information_schema, matching the `functionName` route param.
 */
export const load = async ({ params, locals }) => {
  const { user, supabaseServiceRole } = locals;
  const { functionName } = params;

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
    const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
    client = new Client({ connectionString, ssl });
    await client.connect();

    // 1) Fetch from info_schema to see if the function actually exists in config schema
    const dbFuncRes = await client.query(
      `
      SELECT 
        routine_name,
        routine_schema
      FROM information_schema.routines
      WHERE 
        routine_schema = 'config'
        AND routine_name = $1
      LIMIT 1
      `,
      [functionName]
    );
    const dbFunction = dbFuncRes.rows[0] || null;

    // 2) Fetch metadata from config.functions (or step_functions if you like)
    const metaFuncRes = await client.query(
      `
      SELECT
        name,
        input_params,
        output_params,
        description
      FROM config.functions
      WHERE name = $1
      LIMIT 1
      `,
      [functionName]
    );
    const metadataFunction = metaFuncRes.rows[0] || null;

    await client.end();

    // Return the function data (both actual DB function & metadata)
    return {
      dbFunction,
      metadataFunction
    };
  } catch (err) {
    console.error('Error loading function detail:', err);
    if (client) {
      await client.end();
    }
    throw error(500, 'Failed to load function detail');
  }
};