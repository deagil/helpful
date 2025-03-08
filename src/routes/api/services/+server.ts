// src/routes/api/services/+server.js
import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
  try {
    const { user, supabase } = locals;

    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all supported services (could be static data)
    const supportedServices = [
      {
        id: 'supabase',
        name: 'Supabase',
        subtitle: 'Connect your database with Supabase to manage Postgres data.',
        logo: 'supabase-logo-icon.png',
        available: true,
      },
      {
        id: 'zapier',
        name: 'Zapier',
        subtitle: 'Automate workflows and integrations with Zapier.',
        logo: 'zapier-logo.svg',
        available: true,
      },
    ];

    // Fetch services not yet supported
    const unsupportedServices = [
      {
        id: 'sentry',
        name: 'Sentry',
        subtitle: 'Monitor and fix errors in your application with Sentry.',
        logo: 'sentry-logo.png',
        available: false,
      },
      {
        id: 'tally',
        name: 'Tally Forms',
        subtitle: 'Integrate Tally Forms to manage form submissions.',
        logo: 'tally-icon.svg',
        available: true,
      },
      {
        id: "posthog",
        name: "PostHog",
        subtitle: "Track product analytics and usage with PostHog.",
        logo: "posthog-logo.svg",
        available: false,
      },
      {
        id: "twenty",
        name: "Twenty CRM",
        subtitle: "Track product analytics and usage with PostHog.",
        logo: "twenty-crm-logo.jpg",
        available: false,
      },
    ];

    // Fetch user's connected services using the anonymous key
    const { data: connectedServicesData, error } = await supabase
      .from('user_services')
      .select('app')
      .eq('user_id', user.id);

    console.log(`Connected services for user ${user.id}: `, connectedServicesData);

    if (error) {
      console.error('Error fetching connected services:', error);
      return json({ error: 'Failed to fetch connected services' }, { status: 500 });
    }

    const connectedServices = connectedServicesData.map((service) => service.app);

    // Combine and mark services as connected or not
    const allServices = [...supportedServices, ...unsupportedServices];
    const servicesWithStatus = allServices.map((service) => ({
      ...service,
      connected: connectedServices.includes(service.id),
    }));

    return json({ services: servicesWithStatus });
  } catch (error) {
    console.error('Server error:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}