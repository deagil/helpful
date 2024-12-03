<!-- src/routes/app/data/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
  import type { Writable } from "svelte/store"
  import { getContext } from "svelte"

  // Get the tables from the server-side load function
  export let data
  let tables = data.tables

  // State to track open menus
  let openMenu: string | null = null

  // Functions for menu actions
  function toggleMenu(tableName: string) {
    openMenu = openMenu === tableName ? null : tableName
  }

  function editObject(tableName: string) {
    // Navigate to the edit object page
    goto(`/app/data/${tableName}/edit`)
  }

  function createTallyForm(tableName: string) {
    // Navigate to the create Tally form page
    goto(`/app/data/${tableName}/create-tally-form`)
  }

  function copyApiEndpoint(method: string, tableName: string) {
    const baseUrl = "https://your-supabase-url.supabase.co/rest/v1"
    const endpoint = `${baseUrl}/${tableName}`

    let methodText = method.toUpperCase()

    let apiDetails = `${methodText} ${endpoint}`

    // Copy the API details to the clipboard
    navigator.clipboard
      .writeText(apiDetails)
      .then(() => {
        alert(`${methodText} endpoint copied to clipboard`)
      })
      .catch((err) => {
        console.error("Failed to copy endpoint:", err)
        alert("Failed to copy endpoint to clipboard.")
      })
  }

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("data")
</script>

<Breadcrumbs />

<h1 class="text-2xl font-bold mb-4">Data</h1>

<!-- Action Toolbar -->
<div class="mb-4 flex justify-end">
  <button class="btn btn-primary" on:click={() => goto("/app/data/new")}>
    Create New Table
  </button>
</div>

<table class="table-auto w-full border">
  <thead>
    <tr class="bg-gray-100">
      <th class="px-4 py-2 text-left">Table Name</th>
      <th class="px-4 py-2 text-left">Description</th>
      <th class="px-4 py-2 text-right">Rows</th>
      <th class="px-4 py-2 text-right">Columns</th>
      <th class="px-4 py-2 text-right">Actions</th>
    </tr>
  </thead>
  <tbody>
    {#each tables as table}
      <tr class="border-t hover:bg-gray-50">
        <td class="px-4 py-2"><code>{table.table_name}</code></td>
        <td class="px-4 py-2">{table.description}</td>
        <td class="px-4 py-2 text-right">{table.row_estimate}</td>
        <td class="px-4 py-2 text-right">{table.column_count}</td>
        <td class="px-4 py-2 text-right relative">
          <!-- Actions Button -->
          <button
            class="btn btn-sm"
            on:click={() => toggleMenu(table.table_name)}
          >
            Actions ▼
          </button>

          <!-- Popout Menu -->
          {#if openMenu === table.table_name}
            <div
              class="absolute right-0 mt-2 w-48 bg-white border rounded shadow z-10"
            >
              <ul class="py-1">
                <li>
                  <button
                    class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    on:click={() => {
                      editObject(table.table_name)
                      toggleMenu(table.table_name)
                    }}
                  >
                    Edit Object
                  </button>
                </li>
                <li>
                  <button
                    class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    on:click={() => {
                      createTallyForm(table.table_name)
                      toggleMenu(table.table_name)
                    }}
                  >
                    Create Tally Form
                  </button>
                </li>
                <li class="relative group">
                  <button
                    class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    API →
                  </button>
                  <!-- Submenu -->
                  <div
                    class="absolute top-0 left-full ml-1 w-40 bg-white border rounded shadow z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ul class="py-1">
                      <li>
                        <button
                          class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                          on:click={() => {
                            copyApiEndpoint("GET", table.table_name)
                            toggleMenu(table.table_name)
                          }}
                        >
                          GET
                        </button>
                      </li>
                      <li>
                        <button
                          class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                          on:click={() => {
                            copyApiEndpoint("POST", table.table_name)
                            toggleMenu(table.table_name)
                          }}
                        >
                          INSERT
                        </button>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  /* Styling for the submenu */
  .group:hover .group-hover\:opacity-100 {
    opacity: 1;
  }
</style>
