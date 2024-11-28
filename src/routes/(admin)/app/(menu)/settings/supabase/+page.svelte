<script lang="ts">
  import { onMount } from "svelte"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  let integrationDetails = {
    name: "Supabase",
    subtitle:
      "Connect your database with Supabase using a Postgres connection string.",
    logo: "/static/images/supabase-logo-icon.png",
    connectionString: "",
    useSSL: true,
    fields: {
      host: "",
      port: "",
      databaseName: "",
      username: "",
      password: "",
    },
  }

  let connectionStatus = "" // Holds the result of the connection test
  let isTestingConnection = false // Indicates if a connection test is in progress

  function parseConnectionString(connectionString: string) {
    try {
      const url = new URL(connectionString)
      return {
        host: url.hostname,
        port: url.port,
        databaseName: url.pathname.replace("/", ""),
        username: url.username,
        password: decodeURIComponent(url.password),
      }
    } catch (error) {
      console.error("Invalid connection string:", error)
      return null
    }
  }

  function updateConnectionDetails() {
    const parsed = parseConnectionString(integrationDetails.connectionString)
    if (parsed) {
      integrationDetails.fields = parsed
    } else {
      alert(
        "Invalid connection string. Please ensure it follows the correct format.",
      )
    }
  }

  async function fetchExistingConfig() {
    try {
      const response = await fetch("/api/save-credentials")
      if (response.ok) {
        const { config } = await response.json()
        integrationDetails.connectionString = config.connectionString
        integrationDetails.fields = config.fields
        integrationDetails.useSSL = config.useSSL ?? true
        await testConnection() // Test connection on page load
      } else {
        console.log("No existing config found.")
      }
    } catch (error) {
      console.error("Error fetching existing config:", error)
    }
  }

  async function testConnection() {
    updateConnectionDetails()

    isTestingConnection = true
    connectionStatus = ""

    try {
      const response = await fetch("/api/test-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionString: integrationDetails.connectionString,
          useSSL: integrationDetails.useSSL,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        connectionStatus = "Connection successful"
        // Display success notification or update UI accordingly
        alert("Connection successful")
      } else {
        connectionStatus = "Connection failed: " + result.error
        // Display error notification or update UI accordingly
        alert("Connection failed: " + result.error)
      }
    } catch (error) {
      connectionStatus = "Connection failed: " + error.message
      console.error("Error testing connection:", error)
      alert("An error occurred while testing the connection.")
    } finally {
      isTestingConnection = false
    }
  }

  async function saveCredentials() {
    updateConnectionDetails()

    const payload = {
      app: "supabase",
      config: {
        connectionString: integrationDetails.connectionString,
        fields: integrationDetails.fields,
        useSSL: integrationDetails.useSSL,
      },
    }

    try {
      const response = await fetch("/api/save-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok) {
        alert("Details saved successfully.")
      } else {
        console.error("Error saving credentials:", result.error)
        alert("Failed to save credentials.")
      }
    } catch (error) {
      console.error("Network error:", error)
      alert("An error occurred while saving credentials.")
    }
  }

  onMount(() => {
    fetchExistingConfig()
  })
</script>

<svelte:head>
  <title>Supabase Settings</title>
</svelte:head>

<Breadcrumbs />

<h1 class="text-2xl font-bold flex items-center mb-4">
  <img
    src="/images/supabase-logo-icon.png"
    alt="Supabase logo"
    class="inline-block w-10 h-10 mr-3"
  />
  {integrationDetails.name} Settings
</h1>
<p class="text-gray-600 mb-6">{integrationDetails.subtitle}</p>

<div class="bg-base-200 rounded-lg p-6 max-w-3xl">
  <form class="space-y-6" on:submit|preventDefault={saveCredentials}>
    <!-- Input for Connection String -->
    <div>
      <label
        for="connectionString"
        class="block text-xs font-semibold text-gray-500 uppercase font-[Departure]"
      >
        Postgres Connection String
      </label>
      <input
        id="connectionString"
        type="text"
        bind:value={integrationDetails.connectionString}
        placeholder="postgresql://username:password@host:port/database"
        class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
      />
    </div>

    <!-- SSL Connection Option -->
    <div class="flex items-center mb-4">
      <span
        class="text-lg text-gray-500"
        title="Disable SSL for local connections (e.g. when using localhost)."
      >
        <input
          id="useSSL"
          type="checkbox"
          bind:checked={integrationDetails.useSSL}
          class="mr-2 cursor-pointer"
        />
        <label
          for="useSSL"
          class="text-sm text-gray-700 font-[Departure] uppercase cursor-pointer"
        >
          Use SSL
        </label>
      </span>
    </div>

    <!-- Display connection status -->
    {#if connectionStatus}
      <div
        role="alert"
        class="mb-4 p-3 rounded-lg alert font-[Departure] uppercase {connectionStatus.startsWith(
          'Connection successful',
        )
          ? 'alert-success'
          : 'alert-warning'}"
      >
        {connectionStatus}
      </div>
    {/if}

    <!-- Display Individual Fields -->
    {#if integrationDetails.fields.host}
      <div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              for="host"
              class="block text-xs font-semibold text-gray-500 font-[Departure] text-transform: uppercase"
            >
              Host
            </label>
            <input
              id="host"
              type="text"
              readonly
              value={integrationDetails.fields.host}
              class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg bg-gray-100 text-transform: uppercase"
            />
          </div>
          <div>
            <label
              for="port"
              class="block text-xs font-semibold text-gray-500 font-[Departure] text-transform: uppercase"
            >
              Port
            </label>
            <input
              id="port"
              type="text"
              readonly
              value={integrationDetails.fields.port}
              class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label
              for="databaseName"
              class="block text-xs font-semibold text-gray-500 font-[Departure] text-transform: uppercase"
            >
              Database Name
            </label>
            <input
              id="databaseName"
              type="text"
              readonly
              value={integrationDetails.fields.databaseName}
              class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg bg-base-200"
            />
          </div>
          <div>
            <label
              for="username"
              class="block text-xs font-semibold text-gray-500 font-[Departure] text-transform: uppercase"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              readonly
              value={integrationDetails.fields.username}
              class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div class="col-span-2">
            <label
              for="password"
              class="block text-xs font-semibold text-gray-500 font-[Departure] text-transform: uppercase"
            >
              Password
            </label>
            <input
              id="password"
              type="text"
              readonly
              value={integrationDetails.fields.password}
              class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
        </div>
      </div>
    {/if}

    <!-- Test Connection Button -->
    <button
      type="button"
      on:click={testConnection}
      class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md transition duration-200"
      disabled={isTestingConnection}
    >
      {isTestingConnection ? "Testing Connection..." : "Test Connection"}
    </button>

    <!-- Save Settings Button -->
    <button
      type="submit"
      class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg shadow-md transition duration-200"
    >
      Save Settings
    </button>
  </form>
</div>
