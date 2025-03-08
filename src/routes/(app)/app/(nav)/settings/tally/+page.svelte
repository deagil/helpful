<script lang="ts">
  import { onMount } from "svelte"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  let integrationDetails = {
    name: "Tally",
    subtitle: "Connect your Tally account by providing your API key.",
    logo: "/static/images/tally-logo-icon.png", // Ensure this path points to your Tally logo
    apiKey: "",
  }

  let apiKeyStatus = "" // Holds the result of the API key test
  let isTestingKey = false // Indicates if a key test is in progress
  let tallyPreview: any = null // Will store the returned Tally data preview

  // Utility function to compute initials
  function getInitials(firstName: string, lastName: string): string {
    const firstInitial = firstName ? firstName[0].toUpperCase() : ""
    const lastInitial = lastName ? lastName[0].toUpperCase() : ""
    return firstInitial + lastInitial
  }

  async function fetchExistingConfig() {
    try {
      const response = await fetch("/api/save-credentials?app=tally")
      if (response.ok) {
        const { config } = await response.json()
        integrationDetails.apiKey = config.apiKey
      } else {
        console.log("No existing Tally config found.")
      }
    } catch (error) {
      console.error("Error fetching Tally config:", error)
    }
  }

  async function testApiKey() {
    isTestingKey = true
    apiKeyStatus = ""
    tallyPreview = null // Clear any previous preview

    try {
      const response = await fetch("/api/test-connection-tally?app=tally", {
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (response.ok) {
        apiKeyStatus = "API key is valid."
        tallyPreview = result.data // Store the returned data preview
        alert("API key is valid.")
      } else {
        apiKeyStatus = "API key validation failed: " + result.error
        alert("API key validation failed: " + result.error)
      }
    } catch (error) {
      apiKeyStatus = "Exception: API key validation failed: " + error.message
      console.error("Error testing Tally API key:", error)
      alert("An error occurred while testing the API key.")
    } finally {
      isTestingKey = false
    }
  }

  async function saveCredentials() {
    const payload = {
      app: "tally",
      config: {
        apiKey: integrationDetails.apiKey,
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
        alert("Tally API key saved successfully.")
      } else {
        console.error("Error saving Tally API key:", result.error)
        alert("Failed to save Tally API key.")
      }
    } catch (error) {
      console.error("Network error:", error)
      alert("An error occurred while saving the API key.")
    }
  }

  onMount(() => {
    fetchExistingConfig()
  })
</script>

<svelte:head>
  <title>Tally API Key Settings</title>
</svelte:head>

<Breadcrumbs />

<h1 class="text-2xl font-bold flex items-center mb-4">
  <img
    src="/images/tally-icon.svg"
    alt="Tally logo"
    class="inline-block w-10 h-10 mr-3"
  />
  {integrationDetails.name} Settings
</h1>
<p class="text-gray-600 mb-6">{integrationDetails.subtitle}</p>

<div class="bg-base-200 rounded-lg p-6 max-w-3xl">
  <form class="space-y-6" on:submit|preventDefault={saveCredentials}>
    <!-- Input for Tally API Key -->
    <div>
      <label
        for="apiKey"
        class="block text-xs font-semibold text-gray-500 uppercase font-[Departure]"
      >
        Tally API Key
      </label>
      <code>
        <input
          id="apiKey"
          type="text"
          bind:value={integrationDetails.apiKey}
          placeholder="Enter your Tally API key"
          class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
        />
      </code>
    </div>

    <!-- Display API Key Test Status -->
    {#if apiKeyStatus}
      <div
        role="alert"
        class="mb-4 p-3 rounded-lg alert font-[Departure] uppercase {apiKeyStatus.startsWith(
          'API key is valid',
        )
          ? 'alert-success'
          : 'alert-warning'}"
      >
        {apiKeyStatus}
      </div>
    {/if}

    <!-- Test API Key Button -->
    <button
      type="button"
      on:click={testApiKey}
      class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md transition duration-200"
      disabled={isTestingKey}
    >
      {isTestingKey ? "Testing API Key..." : "Test API Key"}
    </button>

    <!-- Preview Card for Returned Tally Data -->
    {#if tallyPreview}
      <div
        class="mt-4 card bg-base-100 shadow-lg p-4 flex items-center space-x-4"
      >
        {#if tallyPreview.avatarUrl}
          <img
            src={tallyPreview.avatarUrl}
            alt="Avatar"
            class="w-16 h-16 rounded-full object-cover"
          />
        {:else}
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center bg-gray-300 text-gray-800 text-xl font-bold"
          >
            {getInitials(tallyPreview.firstName, tallyPreview.lastName)}
          </div>
        {/if}
        <div>
          <h2 class="card-title text-lg">{tallyPreview.fullName}</h2>
          <p class="text-sm text-gray-600">{tallyPreview.email}</p>
        </div>
      </div>
    {/if}

    <!-- Save Settings Button -->
    <button
      type="submit"
      class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg shadow-md transition duration-200"
    >
      Save Settings
    </button>
  </form>
</div>
