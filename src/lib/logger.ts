// src/lib/client/logger.ts

export async function logErrorToServer(
  error: Error | string,
  context: Record<string, any> = {}
) {
  try {
    const errorDetails = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? null : error.stack,
      context,
    };

    const response = await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorDetails),
    });

    if (!response.ok) {
      console.error('Failed to log error to server:', response.statusText);
    }
  } catch (err) {
    console.error('Error sending log to server:', err);
  }
}