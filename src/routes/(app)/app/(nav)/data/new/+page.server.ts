import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';
import { logError } from '$lib/server/logger';

const { Pool } = pkg;

export const actions: Actions = {
  createTable: async ({ request, locals }) => {
    const formData = await request.formData();

    const tableName = formData.get('tableName') as string;
    const description = formData.get('description') as string;
    const idType = formData.get('idType') as string || 'uuid';
    const softDelete = formData.has('softDelete');
    const enableRLS = formData.has('enableRLS');
    const enableAudit = formData.has('enableAudit');

    if (!tableName) {
      return fail(400, { errorMessage: 'Table name is required.' });
    }

    const validTableName = /^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName);
    if (!validTableName) {
      return fail(400, { errorMessage: 'Invalid table name.' });
    }

    const { supabaseServiceRole, user } = locals;
    if (!user) {
      return fail(401, { errorMessage: 'Unauthorized' });
    }

    let idColumnDefinition: string;

    switch (idType) {
      case 'auto_inc':
        // Use a bigserial primary key
        idColumnDefinition = `id BIGSERIAL PRIMARY KEY`;
        break;
      case 'text_slug':
        // Use text as primary key
        idColumnDefinition = `id TEXT PRIMARY KEY`;
        break;
      case 'uuid':
      default:
        // Default: uuid with gen
        idColumnDefinition = `id uuid PRIMARY KEY DEFAULT uuid_generate_v4()`;
        break;
    }

    try {
      const { data: userConfig, error: fetchError } = await supabaseServiceRole
        .from('user_services')
        .select('config')
        .eq('user_id', user.id)
        .eq('app', 'supabase')
        .single();

      if (fetchError || !userConfig) {
        return fail(500, { errorMessage: 'Error fetching user configuration.' });
      }

      const decryptedConfig = JSON.parse(decrypt(userConfig.config));
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
        await client.query('BEGIN');

        // Base table creation with required columns
        let createTableSQL = `
          CREATE TABLE IF NOT EXISTS "${tableName}" (
            ${idColumnDefinition},
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        `;

        // If soft delete enabled, add a deleted_at column
        if (softDelete) {
          createTableSQL += `,
            deleted_at TIMESTAMPTZ
          `;
        }

        // If audit enabled, add a revision column
        if (enableAudit) {
          createTableSQL += `,
            revision INT DEFAULT 1
          `;
        }

        createTableSQL += `
          )
        `;

        await client.query(createTableSQL);

        // Add description if provided
        if (description) {
          const sanitizedDescription = description.replace(/'/g, "''");
          await client.query(`COMMENT ON TABLE "${tableName}" IS '${sanitizedDescription}'`);
        }

        // Enable RLS if requested
        if (enableRLS) {
          await client.query(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY`);
        }

        // Create or replace function for updating updated_at
        await client.query(`
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

        await client.query(`
          CREATE TRIGGER update_${tableName}_updated_at
          BEFORE UPDATE ON "${tableName}"
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

        // If audit enabled, add a trigger to increment revision on updates
        if (enableAudit) {
          await client.query(`
            CREATE OR REPLACE FUNCTION increment_revision()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.revision = OLD.revision + 1;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
          `);

          await client.query(`
            CREATE TRIGGER increment_${tableName}_revision
            BEFORE UPDATE ON "${tableName}"
            FOR EACH ROW
            EXECUTE FUNCTION increment_revision();
          `);
        }

        // Additional QoL suggestions (uncomment if needed):
        // Example: Add index on created_at for sorting:
        // await client.query(`CREATE INDEX ON "${tableName}" (created_at)`);

        await client.query(`
          INSERT INTO vh_tables (name, label, description, settings)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (name) DO UPDATE SET
              label = EXCLUDED.label,
              description = EXCLUDED.description,
              settings = EXCLUDED.settings;
        `, [
          tableName,
          tableName, // or some user_facing_name from the form if you add that input
          description || '',
          JSON.stringify({
            soft_delete: softDelete,
            audit_enabled: enableAudit,
            // other QoL settings here
          })
        ]);

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        await logError('Error executing new page creation', { event: { locals }, error: err });
        return fail(500, { errorMessage: 'Error creating table.' });
      } finally {
        client.release();
        await userPool.end();
      }
    } catch (error) {
      await logError('Database connection or unexpected error', { event: { locals }, error });
      return fail(500, { errorMessage: 'An unexpected error occurred.' });
    }

    // On success, redirect to the edit page
    return redirect(303, `/app/data/${tableName}/edit`);
  },
};