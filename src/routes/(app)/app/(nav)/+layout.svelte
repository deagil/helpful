<script lang="ts">
  import "../../../../app.css"
  import { writable } from "svelte/store"
  import { setContext } from "svelte"
  import { WebsiteName } from "../../../../config"
  import { onMount } from "svelte"
  import { page } from "$app/stores"

  const adminSectionStore = writable("")
  setContext("adminSection", adminSectionStore)
  let adminSection: string | undefined
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
  let servicesLoaded = false

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
    return service && service.connected === true
  }

  $: adminSection = page?.route?.id?.split("/").at(-1) || ""

  let submenuOpen = false
</script>

<div class="drawer lg:drawer-open">
  <input id="admin-drawer" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content">
    <!-- Navbar for Mobile -->
    <div class="navbar bg-base-100 lg:hidden">
      <div class="flex-1">
        <a class="btn btn-ghost normal-case text-xl" href="/">{WebsiteName}</a>
      </div>
      <div class="flex-none">
        <label for="admin-drawer" class="btn btn-ghost btn-circle text-lg">
          🍔
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

    <!-- Page Content -->
    <div class="container px-6 lg:px-12 py-3 lg:py-6">
      <slot />
    </div>
  </div>

  <!-- Drawer Sidebar -->
  <div class="drawer-side">
    <label for="admin-drawer" class="drawer-overlay"></label>
    <ul
      class="menu menu-lg p-4 w-80 min-h-full bg-base-200 lg:border-r text-base-content flex flex-col"
    >
      <!-- Sidebar Header -->
      <li>
        <div
          class="normal-case menu-title text-xl font-bold text-primary flex flex-row"
        >
          <a href="/" class="grow">{WebsiteName}</a>
          <label for="admin-drawer" class="lg:hidden ml-3"> &#x2715; </label>
        </div>
      </li>

      <!-- Menu Items -->
      <li>
        <a
          href="/app/home"
          class={adminSection === "home" ? "active" : ""}
          onclick={closeDrawer}
        >
          🏠 Home
        </a>
      </li>

      {#if servicesLoaded}
        {#if isServiceConnected("tally")}
          <li>
            <a
              href="/app/forms"
              class={adminSection === "forms" ? "active" : ""}
              onclick={closeDrawer}
            >
              📝 Forms
            </a>
          </li>
        {/if}
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
        {/if}
        <li>
          <a
            href="/app/workflows/events"
            class={adminSection === "events" ? "active" : ""}
            onclick={closeDrawer}
          >
            💥 Event Triggers
          </a>
        </li>
        <li>
          <a
            href="/app/workflows/actions"
            class={adminSection === "actions" ? "active" : ""}
            onclick={closeDrawer}
          >
            👂 Event Listeners
          </a>
        </li>
        <li>
          <a
            href="/app/workflows/functions"
            class={adminSection === "functions" ? "active" : ""}
            onclick={closeDrawer}
          >
            👨🏽‍💻 Functions
          </a>
        </li>
        <li>
          <a
            href="/app/workflows/flows"
            class={adminSection === "workflows" ? "active" : ""}
            onclick={closeDrawer}
          >
            ▶️ Workflows
          </a>
        </li>
        <li>
          <a
            href="/app/logs"
            class={adminSection === "logs" ? "active" : ""}
            onclick={closeDrawer}
          >
            🪵 Logs
          </a>
        </li>
        <li>
          <a
            href="/app/docs"
            class={adminSection === "docs" ? "active" : ""}
            onclick={closeDrawer}
          >
            📚 Docs
          </a>
        </li>
      {/if}

      <!-- Settings -->
      <li>
        <a
          href="/app/settings"
          class={adminSection === "settings" ? "active" : ""}
          onclick={closeDrawer}
        >
          ⚙️ Settings
        </a>
      </li>

      <!-- Sign Out Button -->
      <li class="mt-auto">
        <a href="/app/sign_out" class="text-base">Sign Out</a>
      </li>
    </ul>
  </div>
</div>
