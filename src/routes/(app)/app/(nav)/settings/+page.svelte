<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "./settings_module.svelte"
  import IntegrationsGrid from "$lib/components/IntegrationsGrid.svelte"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("settings")

  let { data } = $props()
  let { profile, user } = data
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<Breadcrumbs></Breadcrumbs>

<h1 class="text-2xl font-bold mb-4">Settings</h1>
<p class="text-gray-600 mb-6">
  Manage your account, integrations and system behaviour.
</p>

<section class="mt-12">
  <h2 class="text-xl font-bold">Profile</h2>
</section>
<SettingsModule
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
  editLink="/app/settings/edit_profile"
/>

<section class="mt-12">
  <h2 class="text-xl font-bold mb-4">Integrations</h2>
  <p class="text-gray-600 mb-6">Manage all your connected services.</p>
  <IntegrationsGrid />
</section>

<SettingsModule
  title="Billing"
  editable={false}
  fields={[{ id: "email", initialValue: user?.email || "" }]}
  editButtonTitle="Manage Billing"
  editLink="/app/settings/billing"
/>

<SettingsModule
  title="Email"
  editable={false}
  fields={[{ id: "email", initialValue: user?.email || "" }]}
  editButtonTitle="Change Email"
  editLink="/app/settings/change_email"
/>

<SettingsModule
  title="Password"
  editable={false}
  fields={[{ id: "password", initialValue: "••••••••••••••••" }]}
  editButtonTitle="Change Password"
  editLink="/app/settings/change_password"
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
  editLink="/app/settings/change_email_subscription"
/>

<SettingsModule
  title="Danger Zone"
  editable={false}
  dangerous={true}
  fields={[]}
  editButtonTitle="Delete Account"
  editLink="/app/settings/delete_account"
/>
