import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/crypto'; // Adjust the import path as necessary

const { Pool } = pkg;

export const actions: Actions = {
  createTable: async ({ request, locals }) => {
    const formData = await request.formData();
    const tableName = formData.get('tableName') as string;
    const description = formData.get('description') as string;
    const enableRLS = formData.has('enableRLS');
    const addUpdatedAtTrigger = formData.has('addUpdatedAtTrigger');

    if (!tableName) {
      return fail(400, { errorMessage: 'Table name is required.' });
    }

    // Validate table name to prevent SQL injection
    const validTableName = /^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName);
    if (!validTableName) {
      throw new Error('Invalid table name.');
    }

    const {supabaseServiceRole} = locals;

    try {
      // Fetch user's database connection details from your system's database
      const userId = locals.user.id;
      const { data: userConfig, error: fetchError } = await supabaseServiceRole
        .from('user_services')
        .select('config')
        .eq('user_id', userId)
        .eq('app', 'supabase')
        .single();

      if (fetchError || !userConfig) {
        console.error('Error fetching user configuration:', fetchError);
        return fail(500, { errorMessage: 'Error fetching user configuration.' });
      }

      // Decrypt the user's connection string
      const decryptedConfig = JSON.parse(decrypt(userConfig.config));
      const userDbConnectionString = decryptedConfig.connectionString;

      if (!userDbConnectionString) {
        return fail(400, { errorMessage: 'User database connection string is missing.' });
      }

      // Connect to the user's PostgreSQL database
      const userPool = new Pool({
        connectionString: userDbConnectionString,
        ssl: { rejectUnauthorized: false }, // Adjust SSL settings as needed
      });

      const client = await userPool.connect();

      try {
        // Begin transaction
        await client.query('BEGIN');

        // Create table
        let createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (id uuid PRIMARY KEY DEFAULT uuid_generate_v4())`;
        await client.query(createTableSQL);

        // Add description if provided
        if (description) {
          // Sanitize the description to prevent SQL injection
          const sanitizedDescription = description.replace(/'/g, "''");

          let addCommentSQL = `COMMENT ON TABLE "${tableName}" IS '${sanitizedDescription}'`;
          await client.query(addCommentSQL);
        }

        // Enable RLS if selected
        if (enableRLS) {
          let enableRLSSQL = `ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY`;
          await client.query(enableRLSSQL);
        }

        // Add updated_at column and trigger if selected
        if (addUpdatedAtTrigger) {
          // Add updated_at column
          let addColumnSQL = `ALTER TABLE "${tableName}" ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()`;
          await client.query(addColumnSQL);

          // Create or replace the function for updating updated_at
          let createFunctionSQL = `
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = NOW();
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
          `;
          await client.query(createFunctionSQL);

          // Create trigger
          let createTriggerSQL = `
            CREATE TRIGGER update_${tableName}_updated_at
            BEFORE UPDATE ON "${tableName}"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          `;
          await client.query(createTriggerSQL);
        }

        // Commit transaction
        await client.query('COMMIT');

        // Redirect to the edit page
        throw redirect(303, `/app/data/${tableName}/edit`);
      } catch (err) {
        // Rollback transaction in case of error
        await client.query('ROLLBACK');
        console.error('Error executing queries:', err);
        return fail(500, { errorMessage: 'Error creating table.' });
      } finally {
        client.release();
        await userPool.end();
      }
    } catch (error) {
      console.error('Error connecting to user database:', error);
      return fail(500, { errorMessage: 'Error connecting to user database.' });
    }
  },
};