// src/routes/(admin)/app/(menu)/logs/+page.server.js
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

  // Connect to the user's database and fetch error logs
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

    // Fetch error logs
    const res = await client.query(`
      SELECT
        id,
        severity,
        message,
        stack,
        context,
        created_at
      FROM
        config.error_logs
      ORDER BY
        created_at DESC
      LIMIT 100; -- Adjust the limit as needed
    `);

    const errorLogs = res.rows.map((row) => ({
      id: row.id,
      severity: row.severity,
      message: row.message,
      stack: row.stack,
      context: row.context,
      created_at: row.created_at,
    }));

    await client.end();

    return { errorLogs };
  } catch (err) {
    console.error('Error fetching error logs:', err);
    if (client) {
      await client.end();
    }
    throw error(500, 'Failed to fetch error logs from the database');
  }
}