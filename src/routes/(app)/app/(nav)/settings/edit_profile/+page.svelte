<script lang="ts">
  import SettingsModule from "../../settings_module.svelte"
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("settings")/../../edit_profile/$types.js

  let { data } = $props()

  let { profile } = data
</script>

<svelte:head>
  <title>Edit Profile</title>
</svelte:head>

<Breadcrumbs></Breadcrumbs>

<SettingsModule
  editable={true}
  title="Edit Profile"
  successTitle="Saved Profile"
  formTarget="/app/api?/updateProfile"
  fields={[
    {
      id: "fullName",
      label: "Name",
      initialValue: profile?.full_name ?? "",
      placeholder: "Your full name",
      maxlength: 50,
    },
    {
      id: "companyName",
      label: "Company Name",
      initialValue: profile?.company_name ?? "",
      maxlength: 50,
    },
    {
      id: "website",
      label: "Company Website",
      initialValue: profile?.website ?? "",
      maxlength: 50,
    },
  ]}
/>
