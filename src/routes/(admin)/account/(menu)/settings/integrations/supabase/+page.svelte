<script lang="ts">
  let integrationDetails = {
    name: "Supabase",
    subtitle: "Connect your database with Supabase to manage Postgres data.",
    logo: "/static/images/supabase-logo-icon.png",
    fields: [
      { id: "host", label: "Host", initialValue: "" },
      { id: "port", label: "Port", initialValue: "" },
      { id: "databaseName", label: "Database Name", initialValue: "" },
      { id: "username", label: "Username", initialValue: "" },
      { id: "password", label: "Password", initialValue: "" },
    ],
  }
</script>

<svelte:head>
  <title>Supabase Settings</title>
</svelte:head>

<div class="bg-white shadow-md rounded-lg p-6 max-w-3xl mx-auto">
  <h1 class="text-2xl font-bold flex items-center mb-4">
    <img
      src="/images/supabase-logo-icon.png"
      alt="Supabase logo"
      class="inline-block w-10 h-10 mr-3"
    />
    {integrationDetails.name} Settings
  </h1>
  <p class="text-gray-600 mb-6">{integrationDetails.subtitle}</p>

  <form class="space-y-6">
    {#each integrationDetails.fields as field}
      <div>
        <label for={field.id} class="block text-sm font-semibold text-gray-700">
          {field.label}
        </label>
        <input
          id={field.id}
          type="text"
          value={field.initialValue}
          class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
          placeholder={`Enter ${field.label}`}
        />
      </div>
    {/each}

    <button
      type="submit"
      class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md transition duration-200"
    >
      Save Settings
    </button>
  </form>
</div>
