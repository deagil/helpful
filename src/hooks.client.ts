import { logErrorToServer } from '$lib/logger';

export const handleError = ({ error, event }) => {
  // Check if the error is a redirect
  if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
    // It's a redirect, do not log it as an error
    return;
  }
  // Log the error to the server
  logErrorToServer(error, { route: event.route.id });

  // Optionally, return a custom error message
  return {
    message: 'An unexpected error occurred. Please try again later.',
  };
};