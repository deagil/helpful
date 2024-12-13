// src/routes/api/log-error/+server.ts

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { logError } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request, locals, url }) => {
  // Check if the user is authenticated
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { message, stack, context } = await request.json();

    // Recreate the Error object
    const error = new Error(message);
    error.stack = stack;

    // Use the server-side logger to log the error
    await logError(message, {
      event: { request, locals, url },
      error,
      context,
    });

    return json({ success: true });
  } catch (err) {
    console.error('Failed to log client-side error:', err);
    return json({ success: false }, { status: 500 });
  }
};