import { error } from '@sveltejs/kit';
import { decrypt } from '$lib/server/crypto';

export async function load({ locals }) {
  const { user, supabaseServiceRole } = locals;
  if (!user) {
    throw error(401, 'Unauthorized');
  }

  console.log('testing tally')

  // Fetch the user's Tally config
  const { data, error: configError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'tally')
    .single();

  console.log(data);

  if (configError || !data) {
    throw error(404, 'Tally configuration not found');
  }

  const decryptedConfig = JSON.parse(decrypt(data.config));
  const apiKey = decryptedConfig.apiKey;

  console.log('Decrypted config:', decryptedConfig);
  console.log('API key:', apiKey);

  if (!apiKey) {
    throw error(400, 'Missing Tally API key');
  }

  // Fetch the user's forms from the Tally API
  try {
    const response = await fetch('https://api.tally.so/forms', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const forms = await response.json();
    console.log('Tally forms:', forms);
    if (!response.ok) {
      throw new Error(forms.error || 'Failed to fetch Tally forms');
    } else {
      console.log('Tally forms:', forms);
    }
    return { forms: forms.items };
  } catch (err: any) {
    throw error(500, err.message);
  }
}