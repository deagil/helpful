// src/routes/api/columns/[table]/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import pkg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '$lib/server/crypto'; // Assuming you have a `decrypt` function in `$lib/crypto`
import { PUBLIC_SUPABASE_URL } from "$env/static/public"
import { PRIVATE_SUPABASE_SERVICE_ROLE } from '$env/static/private';

const { Pool } = pkg;

// Supabase client setup
const supabase = createClient(PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SERVICE_ROLE);

export const GET: RequestHandler = async ({ params, locals }) => {
  console.log("Params object:", params); // Debugging log
  const tableName = params.table; // Use the correct key from `params`

  if (!tableName) {
    console.error("Table name is missing");
    throw error(400, "Table name is required");
  }

  try {
    // Fetch user's PostgreSQL connection details
    const userId = locals.user.id;
    const { data: userConfig, error: fetchError } = await supabase
      .from('user_services')
      .select('config')
      .eq('user_id', userId)
      .eq('app', 'supabase')
      .single();

    if (fetchError || !userConfig) {
      console.error("Error fetching user configuration:", fetchError);
      throw error(500, "Error fetching user configuration");
    }

    // Decrypt the user's connection string
    const decryptedConfig = JSON.parse(decrypt(userConfig.config));
    const userDbConnectionString = decryptedConfig.connectionString;

    if (!userDbConnectionString) {
      throw error(400, "User database connection string is missing");
    }

    // Connect to the user's PostgreSQL database
    const userPool = new Pool({ connectionString: userDbConnectionString });
    const client = await userPool.connect();

    const res = await client.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
      `,
      [tableName]
    );
    client.release();

    console.log("Column query result:", res.rows); // Debug log

    const columns = res.rows.map((row) => row.column_name);

    if (columns.length === 0) {
      console.error(`No columns found for table: ${tableName}`);
      throw error(404, `No columns found for table: ${tableName}`);
    }

    // Close the user's pool
    await userPool.end();

    return json({ columns });
  } catch (err) {
    console.error("Error fetching columns:", err);
    return json({ error: "Error fetching columns" }, { status: 500 });
  }
};