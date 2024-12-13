<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
  import { goto } from "$app/navigation"
  import { getContext } from "svelte"
  import { onMount } from "svelte"

  export let data
  let tables = data.tables

  let dropdownOpenIndex: number | null = null

  function toggleDropdown(event: Event, index: number) {
    event.stopPropagation()
    dropdownOpenIndex = dropdownOpenIndex === index ? null : index
  }

  function closeDropdown() {
    dropdownOpenIndex = null
  }

  function navigateToEdit(tableName: string) {
    goto(`/app/data/${tableName}/edit`)
  }

  onMount(() => {
    // Ensure this runs only in the client
    document.addEventListener("click", closeDropdown)

    return () => {
      document.removeEventListener("click", closeDropdown)
    }
  })

  const adminSection = getContext("adminSection")
  adminSection.set("data")
</script>

<Breadcrumbs />

<!-- Page Header -->
<div class="flex justify-between items-center mb-4">
  <h1 class="text-2xl font-bold">Data</h1>
  <button class="btn btn-primary" on:click={() => goto("/app/data/new")}>
    Create New Table
  </button>
</div>

<!-- Data Table -->
<table class="table-auto w-full">
  <thead>
    <tr>
      <th class="font-[Departure] uppercase text-left px-4 py-2 text-xs"
        >Table Name</th
      >
      <th class="font-[Departure] uppercase text-left px-4 py-2 text-xs"
        >Description</th
      >
      <th class="font-[Departure] uppercase text-right px-4 py-2 text-xs"
        >Columns</th
      >
      <th class="font-[Departure] uppercase text-right px-4 py-2 text-xs"
        >Rows</th
      >
    </tr>
  </thead>
  <tbody>
    {#each tables as table, index}
      <tr
        class="cursor-pointer hover:bg-gray-50"
        on:click={() => goto(`/app/data/${table.table_name}`)}
      >
        <td class="px-4 py-2">{table.table_name}</td>
        <td class="px-4 py-2">{table.description || "No description"}</td>
        <td class="px-4 py-2 text-right">{table.column_count}</td>
        <td class="px-4 py-2 text-right">{table.row_estimate}</td>
        <td class="px-4 py-2 text-right relative">
          <div class="dropdown dropdown-end">
            <button
              class={`btn btn-sm border border-gray-300 ${
                dropdownOpenIndex === index
                  ? "bg-base-100 text-base-content rounded-b-none"
                  : "bg-white"
              }`}
              on:click={(e) => toggleDropdown(e, index)}
              aria-expanded={dropdownOpenIndex === index}
            >
              <span class="invisible">Actions</span>
              <span class="absolute inset-0 flex items-center justify-center">
                {dropdownOpenIndex === index ? "Close" : "Actions"}
              </span>
            </button>
            {#if dropdownOpenIndex === index}
              <ul
                class="dropdown-content menu p-2 shadow-lg bg-base-100 border border-gray-300 rounded-t-lg w-52 z-5"
                on:click={(e) => e.stopPropagation()}
              >
                <li>
                  <a
                    href="#"
                    on:click={(e) => {
                      e.preventDefault()
                      navigateToEdit(table.table_name)
                    }}
                    ><span class="text-lg">✍️</span>
                    Edit
                  </a>
                </li>
                <li>
                  <a href="#" on:click={(e) => e.preventDefault()}
                    ><span class="text-lg">🗑️</span>Delete</a
                  >
                </li>
              </ul>
            {/if}
          </div>
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .btn {
    transition: all 0.2s ease-in-out;
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    text-transform: none;
    cursor: pointer;
  }

  button {
    position: relative;
    display: inline-block;
  }

  .btn-sm:hover {
    background-color: hsl(0, 0%, 90%);
  }

  .dropdown-content {
    transition: all 0.2s ease-in-out;
    border-top-right-radius: 0px;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    position: absolute; /* Ensures dropdown escapes parent boundaries */
    top: 100%;
    left: auto;
    right: 0;
    z-index: 50;
  }

  tr.cursor-pointer {
    transition: background-color 0.2s;
  }

  tr.cursor-pointer:hover {
    background-color: #f0f0f0;
  }

  .invisible {
    visibility: hidden; /* This element sets the button width but remains invisible */
    pointer-events: none;
  }

  ul {
    margin-top: -1px; /* Remove the gap between button and menu */
  }
</style>
