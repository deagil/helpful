// src/routes/app/data/+page.server.js
import { error } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/server/crypto';

const { Client } = pkg;

export async function load({ locals }) {
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

  // Connect to the user's database and fetch tables
  let client;
  try {
    let ssl;
    if (decryptedConfig.useSSL) {
      ssl = { rejectUnauthorized: false };
    } else {
      ssl = false;
    }

    client = new Client({
      connectionString,
      ssl,
    });

    await client.connect();

    // Fetch table details
    const res = await client.query(`
      SELECT
        c.relname AS table_name,
        obj_description(c.oid) AS description,
        c.reltuples AS row_estimate,
        COUNT(a.attname) AS column_count
      FROM
        pg_class c
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      WHERE
        c.relkind = 'r'
        AND n.nspname = 'public'
      GROUP BY
        c.relname, c.oid, c.reltuples
      ORDER BY
        c.relname;
    `);

    const tables = res.rows.map((row) => ({
      table_name: row.table_name,
      description: row.description || '',
      row_estimate: Math.max(parseInt(row.row_estimate, 10),0),
      column_count: Math.max(parseInt(row.column_count, 10),0)
    }));

    await client.end();

    return { tables };
  } catch (err) {
    console.error('Error fetching tables:', err);
    if (client) {
      await client.end();
    }
    throw error(500, 'Failed to fetch tables from the database');
  }
}