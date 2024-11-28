// src/routes/api/test-credentials/+server.js
import { json } from '@sveltejs/kit';
import pkg from 'pg';
const { Client } = pkg;

export async function POST({ request, locals }) {
  try {
    const { connectionString, useSSL } = await request.json();
    const { user, supabaseServiceRole } = locals;

    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!connectionString) {
      return json({ error: 'Connection string is required' }, { status: 400 });
    }

    let ssl;
    if (useSSL) {
      ssl = { rejectUnauthorized: false };
    } else {
      ssl = false;
    }

    const client = new Client({
      connectionString,
      ssl,
    });

    await client.connect();
    await client.end();

    // Update the status in the database
    await supabaseServiceRole
      .from('user_services')
      .update({
        status: 'connected',
        last_checked: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('app', 'supabase');

    return json({ message: 'Connection successful' });
  } catch (error) {
    console.error('Connection test error:', error);

    // Update the status in the database
    await locals.supabaseServiceRole
      .from('user_services')
      .update({
        status: 'error',
        last_checked: new Date().toISOString(),
      })
      .eq('user_id', locals.user.id)
      .eq('app', 'supabase');

    return json(
      { error: 'Connection failed: ' + error.message },
      { status: 500 }
    );
  }
}