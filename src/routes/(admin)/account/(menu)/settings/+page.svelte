<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "./settings_module.svelte"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("settings")

  let { data } = $props()
  let { profile, user } = data
  // Simulate which integrations are connected
  let integrations = [
    {
      id: "supabase",
      name: "Supabase",
      subtitle: "Connect your database with Supabase to manage Postgres data.",
      logo: "supabase-logo-icon.png",
      connected: true, // Example: connected integration
      settingsLink: "/account/settings/integrations/supabase",
    },
    {
      id: "zapier",
      name: "Zapier",
      subtitle: "Automate workflows and integrations with Zapier.",
      logo: "zapier-logo.svg",
      connected: false,
      //settingsLink: "/account/settings/integrations/zapier",
    },
    {
      id: "sentry",
      name: "Sentry",
      subtitle: "Monitor and fix errors in your application with Sentry.",
      logo: "sentry-logo.png",
      connected: false,
      //settingsLink: "/account/settings/integrations/sentry",
    },
    {
      id: "tally-forms",
      name: "Tally Forms",
      subtitle: "Integrate Tally Forms to manage form submissions.",
      logo: "tally-icon.svg",
      connected: false,
      //settingsLink: "/account/settings/integrations/tally-forms",
    },
    {
      id: "twenty-crm",
      name: "Twenty CRM",
      subtitle: "Manage your customer relationships with Twenty CRM.",
      logo: "twenty-crm-logo.jpg",
      connected: false,
      //settingsLink: "/account/settings/integrations/twenty-crm",
    },
    {
      id: "posthog",
      name: "PostHog",
      subtitle: "Track product analytics and usage with PostHog.",
      logo: "posthog-logo.svg",
      connected: false,
      //settingsLink: "/account/settings/integrations/posthog",
    },
  ]
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Settings</h1>

<SettingsModule
  title="Profile"
  editable={false}
  fields={[
    { id: "fullName", label: "Name", initialValue: profile?.full_name ?? "" },
    {
      id: "companyName",
      label: "Company Name",
      initialValue: profile?.company_name ?? "",
    },
    {
      id: "website",
      label: "Company Website",
      initialValue: profile?.website ?? "",
    },
  ]}
  editButtonTitle="Edit Profile"
  editLink="/account/settings/edit_profile"
/>

<SettingsModule
  title="Email"
  editable={false}
  fields={[{ id: "email", initialValue: user?.email || "" }]}
  editButtonTitle="Change Email"
  editLink="/account/settings/change_email"
/>

<SettingsModule
  title="Password"
  editable={false}
  fields={[{ id: "password", initialValue: "••••••••••••••••" }]}
  editButtonTitle="Change Password"
  editLink="/account/settings/change_password"
/>

<SettingsModule
  title="Email Subscription"
  editable={false}
  fields={[
    {
      id: "subscriptionStatus",
      initialValue: profile?.unsubscribed ? "Unsubscribed" : "Subscribed",
    },
  ]}
  editButtonTitle="Change Subscription"
  editLink="/account/settings/change_email_subscription"
/>

<section class="mt-12">
  <h2 class="text-xl font-bold mb-4">Integrations</h2>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each integrations as integration}
      <div
        class="border rounded-lg p-4 flex items-center hover:shadow-md transition-shadow"
      >
        <img
          src={`/images/${integration.logo}`}
          alt="{integration.name} logo"
          class="w-12 h-12 mr-4"
        />
        <div class="flex-1">
          <h3 class="text-lg font-semibold">{integration.name}</h3>
          <p class="text-sm text-gray-500">{integration.subtitle}</p>
          {#if integration.connected}
            <span class="text-green-500 text-sm font-medium">Connected</span>
          {:else}
            <span class="text-gray-400 text-sm font-medium">Not Connected</span>
          {/if}
        </div>
        <a
          href={integration.settingsLink}
          class="ml-4 text-blue-500 hover:underline"
          aria-label="Go to {integration.name} settings"
        >
          Settings →
        </a>
      </div>
    {/each}
  </div>
</section>

<SettingsModule
  title="Danger Zone"
  editable={false}
  dangerous={true}
  fields={[]}
  editButtonTitle="Delete Account"
  editLink="/account/settings/delete_account"
/>
