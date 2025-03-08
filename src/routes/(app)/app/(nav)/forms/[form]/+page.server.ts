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

  // Retrieve the user's Tally configuration (app: "tally")
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

  // Fetch submissions (which include questions) from Tally
  const submissionsEndpoint = `https://api.tally.so/forms/${formId}/submissions?page=${currentPage}`;
  let submissionsData;
  try {
    const response = await fetch(submissionsEndpoint, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    submissionsData = await response.json();
    if (!response.ok) {
      throw new Error(submissionsData.error || 'Failed to fetch submissions');
    }
  } catch (err: any) {
    throw error(500, err.message);
  }
  const { questions, submissions, limit, totalNumberOfSubmissionsPerFilter } = submissionsData;
  const totalSubmissions = totalNumberOfSubmissionsPerFilter.all || 0;
  const totalPages = Math.ceil(totalSubmissions / limit);

  // Fetch rich form details for the selected form
  let formDetail;
  try {
    const formDetailRes = await fetch(`https://api.tally.so/forms/${formId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    formDetail = await formDetailRes.json();
    if (!formDetailRes.ok) {
      throw new Error(formDetail.error || 'Failed to fetch form details');
    }
  } catch (err: any) {
    throw error(500, err.message);
  }

  return {
    formDetail,
    questions,
    submissions,
    currentPage,
    totalPages
  };
}