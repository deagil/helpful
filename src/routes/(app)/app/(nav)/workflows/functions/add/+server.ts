import { json, error } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client } = pkg;

/**
 * Handles POST /app/workflows/functions/add
 * Creates or replaces the Postgres function using (context JSONB) -> JSONB,
 * and inserts/updates metadata in config.functions.
 */
export async function POST({ request, locals }) {
  const { user, supabaseServiceRole } = locals;

  // Ensure the user is authenticated
  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Parse the request body
  const {
    functionName,   // e.g. "my_test_func"
    description,    // text describing the function
    inputParams,    // JSON string describing each input param's label, type, etc.
    outputParams,   // JSON string describing the return fields, if any
    functionBody    // the raw plpgsql code to run
  } = await request.json();

  // Basic validation
  if (!functionName || !functionBody) {
    return json({ message: 'Function name and body are required.' }, { status: 400 });
  }

  // Fetch the encrypted database connection string
  const { data: dbData, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'supabase')
    .single();

  if (dbError || !dbData) {
    throw error(500, 'Failed to retrieve database configuration');
  }

  // Decrypt the config
  const decryptedConfig = JSON.parse(decrypt(dbData.config));
  const connectionString = decryptedConfig.connectionString;

  if (!connectionString) {
    throw error(500, 'Database connection string not found');
  }

  let client: typeof Client | null = null;
  try {
    const ssl = decryptedConfig.useSSL ? { rejectUnauthorized: false } : false;
    client = new Client({ connectionString, ssl });
    await client.connect();

    // 1) Create or replace the actual Postgres function in the config schema.
    //    Each function takes a single JSONB param (context) and returns JSONB,
    //    matching your dynamic workflow calling pattern:
    //    EXECUTE format('SELECT %I($1)', step.task_function) USING resolved_inputs;
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION config.${functionName}(context JSONB)
      RETURNS JSONB
      LANGUAGE plpgsql
      AS $$
      ${functionBody}
      $$;
    `;
    await client.query(createFunctionSQL);

    // 2) Insert or update the metadata in config.functions.
    //    We store inputParams, outputParams, and description for your UI/editor.
    //    The columns could be (name TEXT, input_params JSONB, output_params JSONB, description TEXT).
    const insertMetadataSQL = `
      INSERT INTO config.functions (name, input_params, output_params, description)
      VALUES ($1, $2::jsonb, $3::jsonb, $4)
      ON CONFLICT (name)
      DO UPDATE SET
        input_params = EXCLUDED.input_params,
        output_params = EXCLUDED.output_params,
        description = EXCLUDED.description;
    `;
    await client.query(insertMetadataSQL, [
      functionName,
      inputParams,    // already a JSON string, or parse to JSON if needed
      outputParams,   // ditto
      description
    ]);

    await client.end();

    return json({ message: 'Function created successfully.' }, { status: 200 });
  } catch (err) {
    console.error('Error creating new function:', err);
    if (client) {
      await client.end();
    }
    throw error(500, 'Failed to create new function');
  }
}