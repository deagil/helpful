import { error } from '@sveltejs/kit';
import { decrypt } from '$lib/server/crypto';

export async function load({ params, locals, url }) {
  const formId = params.form;
  if (!formId) {
    throw error(400, 'Missing form ID');
  }

  const { user, supabaseServiceRole } = locals;
  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Retrieve the user's Tally configuration from Supabase (app: "tally")
  const { data: configData, error: configError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'tally')
    .single();

  if (configError || !configData) {
    throw error(404, 'Tally configuration not found');
  }

  const decryptedConfig = JSON.parse(decrypt(configData.config));
  const apiKey = decryptedConfig.apiKey;
  if (!apiKey) {
    throw error(400, 'Missing Tally API key');
  }

  // Get current page from query parameters (default to 1)
  const currentPage = Number(url.searchParams.get('page')) || 1;

  // Build the Tally submissions endpoint URL using the form ID and page number
  const tallyEndpoint = `https://api.tally.so/forms/${formId}/submissions?page=${currentPage}`;

  try {
    const response = await fetch(tallyEndpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const tallyData = await response.json();

    if (!response.ok) {
      throw new Error(tallyData.error || 'Failed to fetch submissions');
    }

    // Destructure data from the Tally response
    const { submissions, page, limit, totalNumberOfSubmissionsPerFilter } = tallyData;
    const totalSubmissions = totalNumberOfSubmissionsPerFilter.all || 0;
    const totalPages = Math.ceil(totalSubmissions / limit);

    return {
      submissions,
      currentPage: page,
      totalPages
    };
  } catch (err: any) {
    throw error(500, err.message);
  }
}