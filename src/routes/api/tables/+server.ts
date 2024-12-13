// src/routes/api/tables/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import pkg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '$lib/server/crypto'; // Assuming you have a `decrypt` function in `$lib/crypto`
import { PUBLIC_SUPABASE_URL } from "$env/static/public"
import { PUBLIC_SUPABASE_ANON_KEY } from "$env/static/public"
import { PRIVATE_SUPABASE_SERVICE_ROLE } from '$env/static/private';

const { Pool } = pkg;

// Supabase client setup
const supabaseUrl = PUBLIC_SUPABASE_URL; // Your Supabase URL
const supabasePublicKey = PRIVATE_SUPABASE_SERVICE_ROLE; // Your Supabase service role key
const supabase = createClient(supabaseUrl, supabasePublicKey);

export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Fetch user's PostgreSQL connection details
    const userId = locals.user.id; // Assuming you have user ID in `locals`
    const { data: userConfig, error: fetchError } = await supabase
      .from('user_services')
      .select('config')
      .eq('user_id', userId)
      .eq('app', 'supabase') // Assuming `app` identifies the service type
      .single();

    if (fetchError || !userConfig) {
      console.error('Error fetching user configuration:', fetchError);
      return json({ error: 'Error fetching user configuration' }, { status: 500 });
    }

    // Decrypt the user's connection string
    const decryptedConfig = JSON.parse(decrypt(userConfig.config));
    const userDbConnectionString = decryptedConfig.connectionString;

    if (!userDbConnectionString) {
      return json({ error: 'User database connection string is missing' }, { status: 400 });
    }

    // Connect to the user's PostgreSQL database
    const userPool = new Pool({
      connectionString: userDbConnectionString,
    });

    const client = await userPool.connect();
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    client.release();

    const tables = res.rows.map((row) => row.table_name);

    // Close the user's pool
    await userPool.end();

    return json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return json({ error: 'Error fetching tables' }, { status: 500 });
  }
};