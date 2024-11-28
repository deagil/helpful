<script lang="ts">
  import { writable } from "svelte/store"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
  import ColumnItem from "./ColumnItem.svelte"
  import ColumnDetails from "./ColumnDetails.svelte"

  export let data
  let { table, columns } = data

  // Generate a unique ID for each column
  function generateUniqueId() {
    return "_" + Math.random().toString(36).substr(2, 9)
  }

  // Ensure each column has a unique 'id'
  columns = columns.map((col) => ({ ...col, id: generateUniqueId() }))

  // State for the selected column
  let selectedColumn = null

  // Writable store for columns
  let columnList = writable(columns)

  // State to control which tab is active: 'edit', 'add', or 'config'
  let activeTab = "edit"

  const templateFields = [
    { type: "text", label: "Text" },
    { type: "integer", label: "Number" },
    { type: "date", label: "Date" },
    { type: "uuid", label: "UUID" },
    { type: "boolean", label: "Boolean" },
    { type: "foreign_key", label: "Relationship" },
  ]

  function switchTab(tabName) {
    activeTab = tabName
  }

  function selectColumn(event) {
    selectedColumn = event.detail
    activeTab = "edit"
  }

  async function saveChanges() {
    // Save changes logic here
  }

  function addFieldFromTemplate(field) {
    const newColumn = {
      id: generateUniqueId(),
      ordinal_position: $columnList.length + 1,
      column_name: "",
      data_type: field.type,
      description: "",
      not_null: false,
      default_value: null,
      is_new: true,
    }

    columnList.update((cols) => [...cols, newColumn])
    selectedColumn = newColumn
    activeTab = "edit"
  }
</script>

<Breadcrumbs />

<div class="top-bar flex justify-between items-center">
  <!-- Table Title -->
  <h1 class="text-2xl font-bold">
    <code>{table}</code>
  </h1>

  <!-- Save Changes Button -->
  <button
    class="btn btn-primary text-sm uppercase font-[Departure]"
    on:click={saveChanges}>Save Changes</button
  >
</div>

<div class="flex">
  <!-- Left Pane: Column List -->
  <div
    class="w-1/3 border-r pr-4 overflow-y-auto"
    style="max-height: calc(100vh - 12rem);"
  >
    <ul>
      {#each $columnList as column (column.id)}
        <ColumnItem {column} {selectedColumn} on:selectColumn={selectColumn} />
      {/each}
    </ul>
  </div>

  <!-- Right Pane: Tabbed Content -->
  <div class="w-2/3 pl-4">
    <!-- Tabs -->
    <div class="flex mb-4 border-b">
      <button
        class="px-4 py-2 -mb-px border-b-2 font-medium uppercase focus:outline-none font-[Departure] {activeTab ===
        'edit'
          ? 'border-blue-500 text-blue-500'
          : 'border-transparent'}"
        on:click={() => switchTab("edit")}
      >
        Edit Field
      </button>
      <button
        class="px-4 py-2 -mb-px border-b-2 font-medium uppercase focus:outline-none font-[Departure] {activeTab ===
        'add'
          ? 'border-green-500 text-green-500'
          : 'border-transparent'}"
        on:click={() => switchTab("add")}
      >
        Add Field
      </button>
      <button
        class="px-4 py-2 -mb-px border-b-2 font-medium uppercase focus:outline-none font-[Departure] {activeTab ===
        'link'
          ? 'border-yellow-500 text-yellow-500'
          : 'border-transparent'}"
        on:click={() => switchTab("link")}
      >
        Data Linking
      </button>
      <button
        class="px-4 py-2 -mb-px border-b-2 font-medium uppercase focus:outline-none font-[Departure] {activeTab ===
        'config'
          ? 'border-pink-500 text-pink-500'
          : 'border-transparent'}"
        on:click={() => switchTab("config")}
      >
        Configure
      </button>
    </div>

    <!-- Tab Content -->
    <div class="overflow-y-auto" style="max-height: calc(100vh - 15rem);">
      {#if activeTab === "edit"}
        {#if selectedColumn}
          <ColumnDetails bind:selectedColumn />
        {:else}
          <div class="p-4">
            <p class="text-gray-600">
              Select a field to view and edit details.
            </p>
          </div>
        {/if}
      {:else if activeTab === "add"}
        <div class="p-4">
          <p class="mb-4 text-gray-600">
            Click a field type to add it to your table.
          </p>
          <ul>
            {#each templateFields as field}
              <li class="mb-2">
                <button
                  class="p-2 w-full text-left border rounded bg-gray-50 hover:bg-gray-100 focus:outline-none"
                  on:click={() => addFieldFromTemplate(field)}
                >
                  {field.label}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {:else if activeTab === "link"}
        <div class="p-4">
          <p class="mb-4 text-gray-600">
            Link objects together to create meaning and richer data.
          </p>
        </div>
      {:else if activeTab === "config"}
        <div class="p-4">
          <p class="mb-4 text-gray-600">
            Configure additional settings for this table or integration.
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .top-bar {
    margin-bottom: 1rem;
  }

  .btn-primary {
    background-color: orange;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
  }

  .btn-primary:hover {
    background-color: darkorange;
  }
</style>
