// src/routes/api/save-credentials/+server.js
import { json, fail, error } from '@sveltejs/kit';
import { encrypt, decrypt } from '$lib/server/crypto';

export async function POST({ request, locals }) {
  try {
    const { app, config } = await request.json();

    //console.log('Received app:', app);
    //console.log('Received config:', config);

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

export async function GET({ url, locals }) {

  //console.log('testing tally')

  const { user, supabaseServiceRole } = locals;

  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Extract the "app" parameter from the query string
  const app = url.searchParams.get('app');
  if (!app) {
    return json({ error: 'Missing app parameter' }, { status: 400 });
  }

  //console.log('Received app:', app);

  // Query the database for the given user's service config for the specified app
  const { data, error } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', app)
    .single();

  if (error || !data) {
    return json({ error: 'No config found' }, { status: 404 });
  }

  // Decrypt the stored configuration
  const decryptedConfig = JSON.parse(decrypt(data.config));

  //console.log('Decrypted config:', decryptedConfig);

  // Support both { apiKey } or { config: { apiKey } } payload shapes.
  const apiKey = decryptedConfig.apiKey || (decryptedConfig.config && decryptedConfig.config.apiKey);
  if (!apiKey) {
    return fail(400, { error: "API key is required." });
  }

  //console.log('API key:', apiKey);

  try {
    const response = await fetch("https://api.tally.so/users/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    const data = await response.json();
    //console.log('Tally response:', data);

    if (!response.ok) {
      return fail(response.status, {
        error: data.error || "Failed to validate API key.",
        data
      });
    }
    return json({ data });
  } catch (error) {
    console.error("Error testing Tally API key:", error);
    return fail(500, { error: error.message });
  }
}


// -------------------------------
// Tally-related actions below
// -------------------------------

// // Test the provided Tally API key by fetching the user's data from Tally.
// testTally: async ({ request, locals: { safeGetSession } }) => {
//   const { session } = await safeGetSession();
//   if (!session) {
//     throw redirect(303, "/login");
//   }

//   let payload;
//   try {
//     payload = await request.json();
//   } catch (err) {
//     return fail(400, { error: "Invalid JSON payload." });
//   }

//   // Support both { apiKey } or { config: { apiKey } } payload shapes.
//   const apiKey = payload.apiKey || (payload.config && payload.config.apiKey);
//   if (!apiKey) {
//     return fail(400, { error: "API key is required." });
//   }

//   try {
//     const response = await fetch("https://api.tally.so/users/me", {
//       method: "GET",
//       headers: {
//         "Authorization": `Bearer ${apiKey}`
//       }
//     });

//     const data = await response.json();
//     if (!response.ok) {
//       return fail(response.status, {
//         error: data.error || "Failed to validate API key.",
//         data
//       });
//     }
//     return { data };
//   } catch (error) {
//     console.error("Error testing Tally API key:", error);
//     return fail(500, { error: error.message });
//   }
// },

// // Save the provided Tally API key to the user's profile.
// saveTally: async ({ request, locals: { supabase, safeGetSession } }) => {
//   const { session } = await safeGetSession();
//   if (!session) {
//     throw redirect(303, "/login");
//   }

//   let payload;
//   try {
//     payload = await request.json();
//   } catch (err) {
//     return fail(400, { error: "Invalid JSON payload." });
//   }

//   const apiKey = payload.config?.apiKey;
//   if (!apiKey) {
//     return fail(400, { error: "API key is required." });
//   }

//   const { error } = await supabase
//     .from("profiles")
//     .update({ tally_api_key: apiKey })
//     .eq("id", session.user.id);

//   if (error) {
//     console.error("Error saving Tally API key:", error);
//     return fail(500, { error: "Failed to save Tally API key." });
//   }

//   return { success: true };
// }