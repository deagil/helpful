// src/routes/app/data/[table]/edit/+page.server.js
import { error } from '@sveltejs/kit';
import pkg from 'pg';
import { decrypt } from '$lib/crypto';

const { Client } = pkg;

export async function load({ params, locals }) {
  const { table } = params;
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

  // Connect to the user's database and fetch columns
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

    // Fetch columns and their metadata
    const res = await client.query(
      `
      SELECT
        a.attnum AS ordinal_position,
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
        col_description(a.attrelid, a.attnum) AS description,
        a.attnotnull AS not_null,
        pg_get_expr(ad.adbin, ad.adrelid) AS default_value
      FROM
        pg_attribute a
        LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
      WHERE
        a.attrelid = $1::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY
        a.attnum;
      `,
      [table]
    );

    const columns = res.rows.map((row) => ({
      ordinal_position: parseInt(row.ordinal_position, 10),
      column_name: row.column_name,
      data_type: row.data_type,
      description: row.description || '',
      not_null: row.not_null,
      default_value: row.default_value,
    }));

    await client.end();

    return { table, columns };
  } catch (err) {
    console.error('Error fetching columns:', err);
    if (client) {
      await client.end();
    }
    throw error(500, 'Failed to fetch columns for the table');
  }
}