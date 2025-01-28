import { error, json } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client } = pkg;

export const actions = {
  default: async ({ request, locals }) => {
    const { user, supabaseServiceRole } = locals;

    if (!user) {
      throw error(401, 'Unauthorized');
    }

    // Read the incoming data
    const data = await request.json();
    const {
      name,
      description,
      inputParams,
      outputParams,
      functionBody
    } = data;

    if (!name) {
      return json({ message: 'Function name is required.' }, { status: 400 });
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

    let client;
    try {
      let ssl;
      if (decryptedConfig.useSSL) {
        ssl = { rejectUnauthorized: false };
      } else {
        ssl = false;
      }

      client = new Client({ connectionString, ssl });
      await client.connect();

      // 1) Create or replace the actual Postgres function in the config schema
      // Here we assume a single TEXT return for demonstration. Adjust as needed.
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION config.${name}()
        RETURNS TEXT
        LANGUAGE plpgsql
        AS $$
        ${functionBody}
        $$;
      `;

      await client.query(createFunctionSQL);

      // 2) Insert function metadata into config.functions
      // Convert string inputParams/outputParams to JSON if needed
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
        name,
        inputParams,
        outputParams,
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
};