// src/lib/server/logger.ts

import { dev } from '$app/environment';
import { decrypt } from '$lib/server/crypto'; // Ensure this is server-side only
import pkg from 'pg';
import type { RequestEvent } from '@sveltejs/kit';
//import * as Sentry from '@sentry/node'; // For Sentry integration

const { Client } = pkg;

interface LoggerOptions {
  event?: RequestEvent;
  error?: Error;
  context?: Record<string, any>;
}

export async function logError(
  message: string,
  options: LoggerOptions = {}
): Promise<void> {
  const { event, error, context } = options;

  // Prepare the log entry
  const logEntry = {
    level: 'error',
    message,
    timestamp: new Date().toISOString(),
    stack: error?.stack || null,
    context: {
      ...context,
      url: event?.url?.toString() || null,
      userId: event?.locals?.user?.id || null,
    },
  };

  // Log to console in development
  //todo
  if (dev) {
    console.error(message, error);
  }

  // Log to user's database if connected
  if (event?.locals?.user) {
    await logToUserDatabase(logEntry, event);
  }

  // Log to Sentry if configured
  //await logToSentry(logEntry, event);
}

// Helper function to log to the user's database
async function logToUserDatabase(logEntry: any, event: RequestEvent) {
  const user = event.locals.user;
  const { supabaseServiceRole } = event.locals;

  const { data, error: dbError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'supabase')
    .single();

  if (dbError || !data) {
    console.error('Error fetching user database configuration:', dbError);
    return;
  }

  try {
    const decryptedConfig = JSON.parse(decrypt(data.config));
    const connectionString = decryptedConfig.connectionString;

    if (!connectionString) {
      console.error("User's database connection string is missing.");
      return;
    }

    const client = new Client({
      connectionString,
      ssl: decryptedConfig.useSSL ? { rejectUnauthorized: false } : false,
    });

    await client.connect();

    // Ensure the error_logs table exists
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS config;
      CREATE TABLE IF NOT EXISTS config.error_logs (
        id SERIAL PRIMARY KEY,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        context JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Insert the log entry
    await client.query(
      `
      INSERT INTO config.error_logs (severity, message, stack, context, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `,
      [
        logEntry.level,
        logEntry.message,
        logEntry.stack,
        JSON.stringify(logEntry.context),
      ]
    );

    await client.end();
  } catch (err) {
    console.error("Failed to log error to user's database:", err);
  }
}

// Helper function to log to Sentry
async function logToSentry(logEntry: any, event: RequestEvent) {
  const user = event.locals.user;
  const { supabaseServiceRole } = event.locals;

  // Fetch user's Sentry configuration
  const { data, error: sentryError } = await supabaseServiceRole
    .from('user_services')
    .select('config')
    .eq('user_id', user.id)
    .eq('app', 'sentry') // Assuming 'sentry' is the app name
    .single();

  if (sentryError || !data) {
    // Sentry not configured for this user
    return;
  }

  // try {
  //   const sentryConfig = JSON.parse(decrypt(data.config));
  //   const { dsn } = sentryConfig;

  //   if (!dsn) {
  //     console.error("User's Sentry DSN is missing.");
  //     return;
  //   }

  //   Sentry.init({
  //     dsn,
  //     tracesSampleRate: 1.0, // Adjust based on your needs
  //   });

  //   const sentryError = new Error(logEntry.message);
  //   sentryError.stack = logEntry.stack;

  //   Sentry.captureException(sentryError, {
  //     user: { id: logEntry.context.userId },
  //     extra: logEntry.context,
  //   });
  // } catch (err) {
  //   console.error('Failed to log error to Sentry:', err);
  // }
}