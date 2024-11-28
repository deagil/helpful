// src/routes/api/save-credentials/+server.js
import { json } from '@sveltejs/kit';
import { encrypt, decrypt } from '$lib/crypto';

export async function POST({ request, locals }) {
  try {
    const { app, config } = await request.json();

    console.log('Received app:', app);
    console.log('Received config:', config);

    if (!config) {
      throw new Error('Config is undefined.');
    }

    // Get the user ID from the session
    const user = locals.user;
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user_id = user.id;

    // Encrypt the credentials
    const encryptedCredentials = encrypt(JSON.stringify(config));

    // Insert into the database using locals.supabaseServiceRole
    const { error } = await locals.supabaseServiceRole
      .from('user_services')
      .upsert({
        user_id,
        app,
        config: encryptedCredentials,
      });

    if (error) {
      console.error('Database error:', error);
      return json({ error: error.message }, { status: 500 });
    }

    return json({ message: 'Config saved successfully' });
  } catch (error) {
    console.error('Server error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}

export async function GET({ locals }) {
  try {
    const { user, supabaseServiceRole } = locals;
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseServiceRole
      .from('user_services')
      .select('config')
      .eq('user_id', user.id)
      .eq('app', 'supabase')
      .single();

    if (error || !data) {
      return json({ error: 'No config found' }, { status: 404 });
    }

    const decryptedConfig = JSON.parse(decrypt(data.config));

    return json({ config: decryptedConfig });
  } catch (error) {
    console.error('Server error:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}