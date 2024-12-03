<script lang="ts">
  import "../../../../app.css"
  import { writable } from "svelte/store"
  import { setContext } from "svelte"
  import { WebsiteName } from "../../../../config"
  import { onMount } from "svelte"
  import { page } from "$app/stores"

  interface Props {
    children?: import("svelte").Snippet
  }

  let { children }: Props = $props()

  const adminSectionStore = writable("")
  setContext("adminSection", adminSectionStore)
  let adminSection: string | undefined = $state()
  adminSectionStore.subscribe((value) => {
    adminSection = value
  })

  function closeDrawer(): void {
    const adminDrawer = document.getElementById(
      "admin-drawer",
    ) as HTMLInputElement
    if (adminDrawer) {
      adminDrawer.checked = false
    }
  }

  let services = []
  let servicesLoaded = $state(false)

  onMount(async () => {
    const response = await fetch("/api/services")
    if (response.ok) {
      const data = await response.json()
      services = data.services
    } else {
      console.error("Failed to fetch services")
    }
    servicesLoaded = true
  })

  const isServiceConnected = (appName: string) => {
    const service = services.find((s) => s.id === appName)
    console.log(service)
    return service && service.connected === true
  }
</script>

<div class="drawer lg:drawer-open">
  <input id="admin-drawer" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content">
    <div class="navbar bg-base-100 lg:hidden">
      <div class="flex-1">
        <a class="btn btn-ghost normal-case text-xl" href="/">{WebsiteName}</a>
      </div>
      <div class="flex-none">
        <div class="dropdown dropdown-end">
          <label for="admin-drawer" class="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </label>
        </div>
      </div>
    </div>
    <div class="container px-6 lg:px-12 py-3 lg:py-6">
      {@render children?.()}
    </div>
  </div>

  <div class="drawer-side">
    <label for="admin-drawer" class="drawer-overlay"></label>
    <ul
      class="menu menu-lg p-4 w-80 min-h-full bg-base-200 lg:border-r text-base-content"
    >
      <li>
        <div
          class="normal-case menu-title text-xl font-bold text-primary flex flex-row"
        >
          <a href="/" class="grow">{WebsiteName}</a>
          <label for="admin-drawer" class="lg:hidden ml-3"> &#x2715; </label>
        </div>
      </li>
      <li>
        <a
          href="/app/home"
          class={adminSection === "home" ? "active" : ""}
          onclick={closeDrawer}
        >
          🏠 Home
        </a>
      </li>

      <!-- Show "Data" menu item only if Supabase is connected -->
      {#if servicesLoaded}
        {#if isServiceConnected("supabase")}
          <li>
            <a
              href="/app/data"
              class={adminSection === "data" ? "active" : ""}
              onclick={closeDrawer}
            >
              💾 Data
            </a>
          </li>
        {:else}
          <!-- Optionally, show a disabled menu item or nothing -->
          <li>
            <a
              href="/app/settings/supabase"
              class="cursor-not-allowed opacity-50"
              onclick={(e) => {
                e.preventDefault()
                closeDrawer()
              }}
              title="Connect Supabase to access Data"
            >
              💾 Data
            </a>
          </li>
        {/if}

        <!-- Show "Workflows" menu item only if Zapier is connected -->
        {#if true}
          <!-- //isServiceConnected("zapier")} -->
          <li>
            <a
              href="/app/workflows"
              class={adminSection === "workflows" ? "active" : ""}
              onclick={closeDrawer}
            >
              📨 Workflows
            </a>
          </li>
        {:else}
          <!-- Optionally, show a disabled menu item or nothing -->
          <li>
            <a
              href="/app/settings/zapier"
              class="cursor-not-allowed opacity-50"
              onclick={(e) => {
                e.preventDefault()
                closeDrawer()
              }}
              title="Connect Zapier to access Workflows"
            >
              📨 Workflows
            </a>
          </li>
        {/if}
      {:else}
        <!-- Optionally, show a loading state or placeholders -->
        <li>
          <span>Loading services...</span>
        </li>
      {/if}

      <li>
        <a
          href="/app/settings"
          class={adminSection === "settings" ? "active" : ""}
          onclick={closeDrawer}
        >
          ⚙️ Settings
        </a>
      </li>

      <li class="mt-auto">
        <a href="/app/sign_out" class="mt-auto text-base">Sign Out</a>
      </li>
    </ul>
  </div>
</div>
