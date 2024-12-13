<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { writable } from "svelte/store"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
  import { enhance } from "$app/forms"

  export let data
  let { table, columns, user_facing_name, table_description, settings } = data

  function generateUniqueId() {
    return "_" + Math.random().toString(36).substr(2, 9)
  }

  columns = columns.map((col, i) => ({
    ...col,
    id: generateUniqueId(),
    index: i,
    is_new: false,
  }))

  let selectedColumn = null
  let activeMainTab: "fields" | "tableSettings" | "integrations" = "fields"
  let showAddFieldModal = false
  let templateSearch = ""

  const columnList = writable(columns)
  let currentColumns = []
  const unsubCols = columnList.subscribe((cols) => {
    currentColumns = cols
  })
  onDestroy(unsubCols)

  const templateFields = [
    { type: "text", label: "Text" },
    { type: "integer", label: "Number" },
    { type: "date", label: "Date" },
    { type: "timestamp", label: "Date & Time" },
    { type: "uuid", label: "UUID" },
    { type: "boolean", label: "Boolean" },
    { type: "foreign_key", label: "Relationship" },
  ]

  const typeMetadata = {
    text: {
      icon: "📝",
      color: "bg-blue-100",
      label: "Text",
      description: "For arbitrary strings, such as names or descriptions.",
    },
    integer: {
      icon: "🔢",
      color: "bg-green-100",
      label: "Integer",
      description: "For numeric values without decimals, like counts or IDs.",
    },
    date: {
      icon: "📅",
      color: "bg-yellow-100",
      label: "Date",
      description: "For storing calendar dates without time of day.",
    },
    timestamp: {
      icon: "⏰",
      color: "bg-purple-100",
      label: "Timestamp",
      description:
        "For storing specific moments in time, often with computed defaults like NOW().",
    },
    uuid: {
      icon: "🔑",
      color: "bg-indigo-100",
      label: "UUID",
      description:
        "Unique identifiers, often used as primary keys for distributed systems.",
    },
    boolean: {
      icon: "☑️",
      color: "bg-pink-100",
      label: "Boolean",
      description: "True/False values, useful for toggles or flags.",
    },
    foreign_key: {
      icon: "🔗",
      color: "bg-gray-100",
      label: "Foreign Key",
      description:
        "References another table’s record, linking data sets together.",
    },
  }

  let tables = []
  let foreignColumns = writable([])
  let foreignCols = []
  const foreignUnsub = foreignColumns.subscribe((c) => (foreignCols = c))
  onDestroy(foreignUnsub)

  onMount(async () => {
    await fetchTables()
  })

  async function fetchTables() {
    try {
      const response = await fetch("/api/tables")
      const data = await response.json()
      if (data.tables) {
        tables = data.tables
      } else {
        console.error("Error fetching tables:", data.error)
      }
    } catch (error) {
      console.error("Error fetching tables:", error)
    }
  }

  async function fetchColumnsForForeignKey(tableName: string) {
    if (!tableName) return
    try {
      const response = await fetch("/api/columns/" + tableName)
      const data = await response.json()
      if (data.columns) {
        foreignColumns.set(data.columns)
      } else {
        console.error("Error fetching columns:", data.error)
      }
    } catch (error) {
      console.error("Error fetching columns:", error)
    }
  }

  function selectColumn(column) {
    selectedColumn = column
    if (
      selectedColumn.data_type === "foreign_key" &&
      selectedColumn.foreign_table
    ) {
      fetchColumnsForForeignKey(selectedColumn.foreign_table)
    }
  }

  async function saveChanges() {
    const form = document.getElementById("configForm") as HTMLFormElement
    form.requestSubmit()
  }

  function addFieldFromTemplate(field) {
    const newColumn = {
      id: generateUniqueId(),
      ordinal_position: 999,
      column_name: "",
      data_type: field.type,
      description: "",
      not_null: false,
      default_value: null,
      user_facing_label: field.label,
      help_text: "",
      some_technical_option: "default_value",
      is_new: true,
      index: Date.now(),
    }
    columnList.update((cols) => [...cols, newColumn])
    selectedColumn = newColumn
    showAddFieldModal = false
  }

  function moveColumnUp(col) {
    columnList.update((cols) => {
      const idx = cols.findIndex((c) => c.id === col.id)
      if (!col.is_new) return cols
      const newIndices = cols
        .map((c, i) => (c.is_new ? i : -1))
        .filter((i) => i !== -1)
      if (idx === newIndices[0]) return cols // topmost new field
      const temp = cols[idx]
      cols[idx] = cols[idx - 1]
      cols[idx - 1] = temp
      return cols
    })
  }

  function moveColumnDown(col) {
    columnList.update((cols) => {
      const idx = cols.findIndex((c) => c.id === col.id)
      if (!col.is_new) return cols
      const newIndices = cols
        .map((c, i) => (c.is_new ? i : -1))
        .filter((i) => i !== -1)
      if (idx === newIndices[newIndices.length - 1]) return cols // bottommost new field
      const temp = cols[idx]
      cols[idx] = cols[idx + 1]
      cols[idx + 1] = temp
      return cols
    })
  }

  function handleInputChange(event) {
    if (!selectedColumn) return
    const { name, value, type, checked } = event.target
    selectedColumn[name] = type === "checkbox" ? checked : value

    if (name === "data_type") {
      if (value !== "foreign_key") {
        delete selectedColumn.foreign_table
        delete selectedColumn.foreign_column
      }
      delete selectedColumn.default_value_option
      delete selectedColumn.default_value
      delete selectedColumn.computed_value

      if (value === "foreign_key" && selectedColumn.foreign_table) {
        fetchColumnsForForeignKey(selectedColumn.foreign_table)
      }
    }

    // Update $columnList so changes reflect immediately
    columnList.update((cols) => {
      const idx = cols.findIndex((c) => c.id === selectedColumn.id)
      if (idx !== -1) {
        cols[idx] = {
          ...cols[idx],
          [name]: type === "checkbox" ? checked : value,
        }
      }
      return cols
    })
  }

  function handleDefaultValueChange(event) {
    if (!selectedColumn) return
    const { name, value } = event.target
    selectedColumn[name] = value
    columnList.update((cols) => {
      const idx = cols.findIndex((c) => c.id === selectedColumn.id)
      if (idx !== -1) {
        cols[idx] = { ...cols[idx], [name]: value }
      }
      return cols
    })
  }

  function handleQoLChange(event) {
    if (!selectedColumn) return
    const { name, checked } = event.target
    selectedColumn[name] = checked
    columnList.update((cols) => {
      const idx = cols.findIndex((c) => c.id === selectedColumn.id)
      if (idx !== -1) {
        cols[idx] = { ...cols[idx], [name]: checked }
      }
      return cols
    })
  }

  function canMoveUp(col) {
    if (!col.is_new) return false
    const idx = currentColumns.findIndex((c) => c.id === col.id)
    const newIndices = currentColumns
      .map((c, i) => (c.is_new ? i : -1))
      .filter((i) => i !== -1)
    return idx !== newIndices[0] // can move up if not topmost new field
  }

  function canMoveDown(col) {
    if (!col.is_new) return false
    const idx = currentColumns.findIndex((c) => c.id === col.id)
    const newIndices = currentColumns
      .map((c, i) => (c.is_new ? i : -1))
      .filter((i) => i !== -1)
    return idx !== newIndices[newIndices.length - 1] // can move down if not bottommost new field
  }

  function filteredTemplateFields() {
    const s = templateSearch.toLowerCase()
    return templateFields.filter(
      (f) =>
        !s ||
        f.label.toLowerCase().includes(s) ||
        (typeMetadata[f.type].description &&
          typeMetadata[f.type].description.toLowerCase().includes(s)),
    )
  }
</script>

<Breadcrumbs />

<form
  id="configForm"
  method="POST"
  action="?/updateConfig"
  use:enhance
  on:submitpreventdefault
>
  <div class="top-bar flex justify-between items-center mb-4">
    <h1 class="text-2xl font-bold"><code>{table}</code></h1>
    <button
      type="button"
      class="btn-primary text-sm uppercase font-[Departure]"
      on:click={saveChanges}
    >
      Save Changes
    </button>
  </div>

  <!-- Main Tabs -->
  <div class="flex space-x-4 mb-4 border-b pb-2">
    <button
      type="button"
      on:click={() => (activeMainTab = "fields")}
      class="{activeMainTab === 'fields'
        ? 'border-b-2 border-orange-500 text-orange-500'
        : ''} uppercase text-sm font-[Departure]"
    >
      Fields
    </button>
    <button
      type="button"
      on:click={() => (activeMainTab = "tableSettings")}
      class="{activeMainTab === 'tableSettings'
        ? 'border-b-2 border-pink-500 text-pink-500'
        : ''} uppercase text-sm font-[Departure]"
    >
      Table Settings
    </button>
    <button
      type="button"
      on:click={() => (activeMainTab = "integrations")}
      class="{activeMainTab === 'integrations'
        ? 'border-b-2 border-blue-500 text-blue-500'
        : ''} uppercase text-sm font-[Departure]"
    >
      Integrations
    </button>
  </div>

  {#if activeMainTab === "fields"}
    <div
      class="flex gap-4"
      style="max-height:calc(100vh - 12rem); overflow:auto;"
    >
      <!-- Left Pane: Fields -->
      <div class="w-1/3 border-r pr-4 pl-1">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold">Fields</span>
          <button
            type="button"
            class="text-blue-500 text-sm underline"
            on:click={() => (showAddFieldModal = true)}>Add Field</button
          >
        </div>
        <ul>
          {#each currentColumns as col (col.id)}
            <li
              class="p-2 mb-2 border rounded flex items-center space-x-2 {selectedColumn &&
              selectedColumn.id === col.id
                ? 'ring-2 ring-blue-400'
                : ''}"
              style="background-color: {typeMetadata[col.data_type]?.color ||
                '#f8f9fa'};"
              on:click={() => selectColumn(col)}
            >
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style="background-color: inherit;"
              >
                <span class="text-2xl"
                  >{typeMetadata[col.data_type]?.icon || "❓"}</span
                >
              </div>
              <div class="flex-1">
                {#if col.user_facing_label}
                  <span class="font-medium">{col.user_facing_label}</span>
                  {#if col.column_name}
                    <code class="ml-2 text-gray-500">[{col.column_name}]</code>
                  {/if}
                {:else if col.column_name}
                  <span class="font-medium">{col.column_name}</span>
                {:else}
                  <code>Unnamed Field</code>
                {/if}
              </div>
              {#if col.is_new}
                <button
                  type="button"
                  on:click={(e) => {
                    e.stopPropagation()
                    moveColumnUp(col)
                  }}
                  disabled={!canMoveUp(col)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  on:click={(e) => {
                    e.stopPropagation()
                    moveColumnDown(col)
                  }}
                  disabled={!canMoveDown(col)}
                >
                  ↓
                </button>
              {:else}
                <span>🔒</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>

      <!-- Right Pane: Selected Column -->
      <div class="w-2/3 pl-4 pr-1">
        {#if selectedColumn}
          <div class="mb-4">
            <label for="column_name" class="block font-medium text-sm uppercase"
              >Internal Column Name</label
            >
            <input
              id="column_name"
              type="text"
              class="input input-bordered w-full"
              name="column_name"
              bind:value={selectedColumn.column_name}
              on:input={handleInputChange}
            />
            <p class="text-xs text-gray-500 mt-1">The actual DB column name.</p>
          </div>

          <div class="mb-4">
            <label
              for="user_facing_label"
              class="block font-medium text-sm uppercase"
              >User Facing Name</label
            >
            <input
              id="user_facing_label"
              type="text"
              class="input input-bordered w-full"
              name="user_facing_label"
              bind:value={selectedColumn.user_facing_label}
              on:input={handleInputChange}
            />
            <p class="text-xs text-gray-500 mt-1">
              Friendly label for end-users.
            </p>
          </div>

          <div class="mb-4">
            <label for="description" class="block font-medium text-sm uppercase"
              >Field Description</label
            >
            <textarea
              id="description"
              class="textarea textarea-bordered w-full"
              name="description"
              bind:value={selectedColumn.description}
              on:input={handleInputChange}
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">
              What does this field represent?
            </p>
          </div>

          <div class="mb-4">
            <label for="data_type" class="block font-medium text-sm uppercase"
              >Data Type</label
            >
            <select
              id="data_type"
              name="data_type"
              class="select select-bordered w-full"
              bind:value={selectedColumn.data_type}
              on:change={handleInputChange}
            >
              {#each Object.entries(typeMetadata) as [t, meta]}
                <option value={t}>{meta.icon} {meta.label}</option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">Underlying DB column type.</p>
          </div>

          <div class="mb-4">
            <label
              for="default_value"
              class="block font-medium text-sm uppercase">Default Value</label
            >
            <input
              id="default_value"
              type="text"
              name="default_value"
              class="input input-bordered w-full"
              bind:value={selectedColumn.default_value}
              on:input={handleDefaultValueChange}
            />
            <p class="text-xs text-gray-500 mt-1">
              Value if none provided by user.
            </p>
          </div>
        {:else}
          <div class="p-4">
            <p class="text-gray-600">
              Select a field to view and edit details.
            </p>
          </div>
        {/if}
      </div>
    </div>
  {:else if activeMainTab === "tableSettings"}
    <div class="p-4">
      <p class="mb-4 text-gray-600">Configure table-level settings here.</p>
      <!-- Add table settings fields here -->
    </div>
  {:else if activeMainTab === "integrations"}
    <div class="p-4">
      <p class="mb-4 text-gray-600">Integrations or future features go here.</p>
    </div>
  {/if}

  <!-- Add Field Modal -->
  {#if showAddFieldModal}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white p-4 rounded shadow max-w-lg w-full">
        <h2 class="text-lg font-bold mb-2">Add a New Field</h2>
        <input
          type="text"
          placeholder="Filter field types..."
          class="input input-bordered w-full mb-4"
          bind:value={templateSearch}
        />
        <ul class="space-y-2 mb-4">
          {#each filteredTemplateFields() as field}
            <li
              class="p-2 border rounded bg-gray-50 hover:bg-gray-100 focus:outline-none"
            >
              <button
                type="button"
                class="w-full text-left"
                on:click={() => addFieldFromTemplate(field)}
              >
                <div class="flex items-center space-x-2">
                  <span
                    class="{typeMetadata[field.type]
                      .color} px-2 py-1 rounded inline-block"
                  >
                    {typeMetadata[field.type].icon}
                  </span>
                  <span class="font-medium">{field.label}</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  {typeMetadata[field.type].description}
                </p>
              </button>
            </li>
          {/each}
        </ul>
        <button
          type="button"
          class="text-sm text-red-500 underline"
          on:click={() => (showAddFieldModal = false)}
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- Hidden fields for non-selected columns -->
  <input type="hidden" name="columnCount" value={currentColumns.length} />
  {#each currentColumns as col (col.id)}
    <input
      type="hidden"
      name={`col_${col.index}_column_name`}
      value={col.column_name}
    />
    {#if !(selectedColumn && selectedColumn.id === col.id)}
      <input
        type="hidden"
        name={`col_${col.index}_user_facing_label`}
        value={col.user_facing_label}
      />
      <input
        type="hidden"
        name={`col_${col.index}_help_text`}
        value={col.help_text}
      />
      <input
        type="hidden"
        name={`col_${col.index}_some_technical_option`}
        value={col.some_technical_option}
      />
      {#if col.foreign_table}
        <input
          type="hidden"
          name={`col_${col.index}_foreign_table`}
          value={col.foreign_table}
        />
      {/if}
      {#if col.foreign_column}
        <input
          type="hidden"
          name={`col_${col.index}_foreign_column`}
          value={col.foreign_column}
        />
      {/if}
      {#if col.data_type}
        <input
          type="hidden"
          name={`col_${col.index}_data_type`}
          value={col.data_type}
        />
      {/if}
      {#if col.default_value_option}
        <input
          type="hidden"
          name={`col_${col.index}_default_value_option`}
          value={col.default_value_option}
        />
      {/if}
      {#if col.default_value}
        <input
          type="hidden"
          name={`col_${col.index}_default_value`}
          value={col.default_value}
        />
      {/if}
      {#if col.computed_value}
        <input
          type="hidden"
          name={`col_${col.index}_computed_value`}
          value={col.computed_value}
        />
      {/if}
      {#if col.not_null}
        <input type="hidden" name={`col_${col.index}_not_null`} value="true" />
      {/if}
      {#if col.is_unique}
        <input type="hidden" name={`col_${col.index}_is_unique`} value="true" />
      {/if}
      {#if col.min_value}
        <input
          type="hidden"
          name={`col_${col.index}_min_value`}
          value={col.min_value}
        />
      {/if}
      {#if col.max_value}
        <input
          type="hidden"
          name={`col_${col.index}_max_value`}
          value={col.max_value}
        />
      {/if}
      {#if col.max_length}
        <input
          type="hidden"
          name={`col_${col.index}_max_length`}
          value={col.max_length}
        />
      {/if}
      {#if col.add_timestamp}
        <input
          type="hidden"
          name={`col_${col.index}_add_timestamp`}
          value="true"
        />
      {/if}
      {#if col.timestamp_field_name}
        <input
          type="hidden"
          name={`col_${col.index}_timestamp_field_name`}
          value={col.timestamp_field_name}
        />
      {/if}
    {/if}
  {/each}
</form>

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

  details summary {
    outline: none;
  }

  details summary:hover {
    text-decoration: underline;
  }

  .fixed {
    position: fixed;
  }
</style>
