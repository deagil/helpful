<script lang="ts">
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"

  interface Integration {
    id: string
    name: string
    subtitle: string
    logo: string
    connected: boolean
    available: boolean
  }

  let integrations: Integration[] = []
  let loadingIntegrations = true

  onMount(async () => {
    try {
      const response = await fetch("/api/services")
      if (response.ok) {
        const data = await response.json()
        integrations = data.services
        console.log("Fetched integrations:", integrations)
      } else {
        console.error("Failed to fetch integrations")
      }
    } catch (error) {
      console.error("Error fetching integrations:", error)
    } finally {
      loadingIntegrations = false
    }
  })

  async function requestIntegration(serviceId: string) {
    try {
      const response = await fetch("/api/request-service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serviceId }),
      })

      const result = await response.json()

      if (response.ok) {
        alert("Thank you! Your request has been submitted.")
      } else {
        console.error("Error requesting service:", result.error)
        alert("Failed to submit service request.")
      }
    } catch (error) {
      console.error("Network error:", error)
      alert("An error occurred while submitting your request.")
    }
  }

  function handleIntegrationClick(integration: Integration) {
    if (integration.available) {
      if (integration.connected) {
        // Navigate to the manage page for the integration
        goto(`/app/settings/${integration.id}`)
      } else {
        // Navigate to the setup/connect page for the integration
        goto(`/app/settings/${integration.id}`)
      }
    } else {
      // Do nothing; the integration is not available
    }
  }
</script>

{#if loadingIntegrations}
  <p>Loading integrations...</p>
{:else}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each integrations as integration}
      <div
        class="border rounded-lg p-4 flex items-center transition-shadow bg-base-200 cursor-pointer"
        on:click={() => handleIntegrationClick(integration)}
      >
        <img
          src="/images/{integration.logo}"
          alt="{integration.name} logo"
          class="w-12 h-12 mr-4"
        />
        <div class="flex-1">
          <h3 class="text-lg font-semibold">{integration.name}</h3>
          <p class="text-sm text-gray-500">{integration.subtitle}</p>
          {#if integration.available}
            {#if integration.connected}
              <span
                class="mt-2 text-green-500 text-sm font-medium uppercase block font-[Departure]"
              >
                Connected
              </span>
            {:else}
              <span
                class="mt-2 text-gray-400 text-sm font-medium uppercase block font-[Departure]"
              >
                Not Connected
              </span>
            {/if}
          {:else}
            <span
              class="mt-2 text-gray-400 text-sm font-medium uppercase block"
            >
              <button
                class="btn btn-primary ml-4"
                on:click|stopPropagation={() =>
                  requestIntegration(integration.id)}
              >
                Request {integration.name}
              </button>
            </span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
