<script lang="ts">
  import { onMount } from "svelte"
  import { writable } from "svelte/store"

  export let selectedColumn

  let tables = []
  let columns = writable([])

  onMount(async () => {
    await fetchTables()
    if (
      selectedColumn.data_type === "foreign_key" &&
      selectedColumn.foreign_table
    ) {
      await fetchColumns(selectedColumn.foreign_table)
    }
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

  async function fetchColumns(tableName) {
    console.log("fetchColumns called with tableName:", tableName)
    let url = "/api/columns/" + tableName
    try {
      const response = await fetch(url)
      const data = await response.json()
      if (data.columns) {
        columns.set(data.columns)
      } else {
        console.error("Error fetching columns:", data.error)
      }
    } catch (error) {
      console.error("Error fetching columns:", error)
    }
  }

  $: if (
    selectedColumn &&
    selectedColumn.data_type === "foreign_key" &&
    selectedColumn.foreign_table
  ) {
    console.log(`Fetching columns for ${selectedColumn.foreign_table} table`)
    fetchColumns(selectedColumn.foreign_table)
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target
    if (type === "checkbox") {
      selectedColumn[name] = checked
    } else {
      selectedColumn[name] = value
    }

    // Reset foreign key fields if data type changes away from foreign_key
    if (name === "data_type") {
      if (value !== "foreign_key") {
        delete selectedColumn.foreign_table
        delete selectedColumn.foreign_column
      }
      // Reset default-related fields if data type changes
      delete selectedColumn.default_value_option
      delete selectedColumn.default_value
      delete selectedColumn.computed_value
    }
  }

  function handleDefaultValueChange(event) {
    const { name, value } = event.target
    selectedColumn[name] = value
  }

  function handleQoLChange(event) {
    const { name, checked } = event.target
    selectedColumn[name] = checked
  }
</script>

<div>
  <!-- Internal Field Name -->
  <div class="mb-4">
    <label class="block font-medium text-sm uppercase font-[Departure]"
      >Internal Field Name</label
    >
    <code
      ><input
        type="text"
        name="column_name"
        bind:value={selectedColumn.column_name}
        on:input={handleInputChange}
        class="input input-bordered w-full"
      /></code
    >
    <p class="text-xs text-gray-500 mt-1">
      This is the database column name used internally.
    </p>
  </div>

  <!-- User Facing Field Name -->
  <div class="mb-4">
    <label class="block font-medium text-sm uppercase font-[Departure]"
      >User Facing Field Name</label
    >
    <input
      type="text"
      name="user_facing_label"
      bind:value={selectedColumn.user_facing_label}
      on:input={handleInputChange}
      class="input input-bordered w-full"
    />
    <p class="text-xs text-gray-500 mt-1">
      A friendly label for end-users. Appears in forms and UI.
    </p>
  </div>

  <!-- Description (DB comment) -->
  <div class="mb-4">
    <label class="block font-medium text-sm uppercase font-[Departure]"
      >Description</label
    >
    <textarea
      name="description"
      bind:value={selectedColumn.description}
      on:input={handleInputChange}
      class="textarea textarea-bordered w-full"
    ></textarea>
    <p class="text-xs text-gray-500 mt-1">
      A database-level comment describing this column’s purpose.
    </p>
  </div>

  <!-- Help Text -->
  <div class="mb-4">
    <label class="block font-medium text-sm uppercase font-[Departure]"
      >Help Text</label
    >
    <textarea
      name="help_text"
      bind:value={selectedColumn.help_text}
      on:input={handleInputChange}
      class="textarea textarea-bordered w-full"
    ></textarea>
    <p class="text-xs text-gray-500 mt-1">
      Short instructions or clarifications shown to users.
    </p>
  </div>

  <!-- Data Type -->
  <div class="mb-4">
    <label class="block font-medium text-sm uppercase font-[Departure]"
      >Data Type</label
    >
    <select
      name="data_type"
      bind:value={selectedColumn.data_type}
      on:change={handleInputChange}
      class="select select-bordered w-full"
    >
      <option value="text">Text</option>
      <option value="integer">Integer</option>
      <option value="date">Date</option>
      <option value="timestamp">Timestamp</option>
      <option value="uuid">UUID</option>
      <option value="boolean">Boolean</option>
      <option value="foreign_key">Foreign Key</option>
    </select>
    <details class="mt-2">
      <summary class="text-sm text-blue-500 cursor-pointer"
        >Data Type Help</summary
      >
      <div class="text-sm text-gray-500 mt-1 space-y-1">
        <p>
          <strong>Text:</strong> Arbitrary strings, set length or defaults as needed.
        </p>
        <p>
          <strong>Integer:</strong> Numeric values, can specify min/max, defaults.
        </p>
        <p>
          <strong>Date / Timestamp:</strong> Store dates/times, often paired with
          computed defaults like NOW().
        </p>
        <p>
          <strong>UUID:</strong> Unique identifiers, often default to gen_random_uuid().
        </p>
        <p>
          <strong>Boolean:</strong> True/False values. Can add QoL features like
          timestamping changes.
        </p>
        <p>
          <strong>Foreign Key:</strong> Link to another table’s record for relational
          data modeling.
        </p>
      </div>
    </details>
  </div>

  <!-- Data-type specific fields -->
  {#if selectedColumn.data_type === "integer"}
    <div class="mb-4">
      <label class="block font-medium text-sm uppercase font-[Departure]"
        >Minimum Value</label
      >
      <input
        type="number"
        name="min_value"
        bind:value={selectedColumn.min_value}
        on:input={handleInputChange}
        class="input input-bordered w-full"
      />
    </div>
    <div class="mb-4">
      <label class="block font-medium text-sm uppercase font-[Departure]"
        >Maximum Value</label
      >
      <input
        type="number"
        name="max_value"
        bind:value={selectedColumn.max_value}
        on:input={handleInputChange}
        class="input input-bordered w-full"
      />
    </div>
  {:else if selectedColumn.data_type === "text"}
    <div class="mb-4">
      <label class="block font-medium text-sm uppercase font-[Departure]"
        >Maximum Length</label
      >
      <input
        type="number"
        name="max_length"
        bind:value={selectedColumn.max_length}
        on:input={handleInputChange}
        class="input input-bordered w-full"
      />
    </div>
  {:else if selectedColumn.data_type === "foreign_key"}
    <div class="mb-4">
      <label class="block font-medium text-sm uppercase font-[Departure]"
        >Link to which object?</label
      >
      <select
        name="foreign_table"
        bind:value={selectedColumn.foreign_table}
        on:change={handleInputChange}
        class="select select-bordered w-full"
      >
        <option value="" disabled selected>Select a table</option>
        {#each tables as t}
          <option value={t}>{t}</option>
        {/each}
      </select>
      <p class="text-xs text-gray-500 mt-1">
        Choose the table this foreign key references.
      </p>
    </div>
    {#if selectedColumn.foreign_table}
      <div class="mb-4">
        <label class="block font-medium text-sm uppercase font-[Departure]"
          >Identifying field in {selectedColumn.foreign_table}</label
        >
        <select
          name="foreign_column"
          bind:value={selectedColumn.foreign_column}
          on:change={handleInputChange}
          class="select select-bordered w-full"
        >
          <option value="" disabled selected>Select a column</option>
          {#each $columns as colName}
            <option value={colName}>{colName}</option>
          {/each}
        </select>
        <p class="text-xs text-gray-500 mt-1">
          Which column in the linked table identifies the related record?
        </p>
      </div>
    {/if}
  {/if}

  <!-- Constraints -->
  <div class="mb-4">
    <div class="space-x-4 flex items-center">
      <label class="inline-flex items-center">
        <input
          type="checkbox"
          name="not_null"
          bind:checked={selectedColumn.not_null}
          on:change={handleInputChange}
          class="checkbox"
        />
        <span class="ml-2">Not Null</span>
      </label>
      <label class="inline-flex items-center">
        <input
          type="checkbox"
          name="is_unique"
          bind:checked={selectedColumn.is_unique}
          on:change={handleInputChange}
          class="checkbox"
        />
        <span class="ml-2">Unique</span>
      </label>
    </div>
    <details class="mt-2">
      <summary class="text-sm text-blue-500 cursor-pointer"
        >Constraints Info</summary
      >
      <div class="text-sm text-gray-500 mt-1 space-y-1">
        <p><strong>Not Null:</strong> Field must always have a value.</p>
        <p>
          <strong>Unique:</strong> All values must be distinct; no duplicates allowed.
        </p>
      </div>
    </details>
  </div>

  <!-- Default Value -->
  <div class="mb-4">
    <label class="block font-medium text-sm uppercase font-[Departure]"
      >Default Value</label
    >
    <select
      name="default_value_option"
      bind:value={selectedColumn.default_value_option}
      on:change={handleInputChange}
      class="select select-bordered w-full"
    >
      <option value="">No value</option>
      <option value="computed">Computed</option>
      <option value="manual">Manual</option>
    </select>
    <details class="mt-2">
      <summary class="text-sm text-blue-500 cursor-pointer"
        >Default & Computed Values Info</summary
      >
      <div class="text-sm text-gray-500 mt-1 space-y-1">
        <p><strong>No value:</strong> Must be provided manually.</p>
        <p>
          <strong>Computed:</strong> Automatically generated (e.g., NOW(), gen_random_uuid()).
        </p>
        <p><strong>Manual:</strong> A fixed value you supply.</p>
      </div>
    </details>
  </div>

  {#if selectedColumn.default_value_option === "computed"}
    <div class="mb-4">
      <label class="block font-medium text-sm uppercase font-[Departure]"
        >Computed Value</label
      >
      <select
        name="computed_value"
        bind:value={selectedColumn.computed_value}
        on:change={handleDefaultValueChange}
        class="select select-bordered w-full"
      >
        {#if selectedColumn.data_type === "uuid"}
          <option value="gen_random_uuid()">Generate Random UUID</option>
        {:else if selectedColumn.data_type === "date" || selectedColumn.data_type === "timestamp"}
          <option value="NOW()">Current Date/Time (NOW)</option>
          <option value="CURRENT_TIMESTAMP">CURRENT_TIMESTAMP</option>
        {:else if selectedColumn.data_type === "text"}
          <option value="current_user">Current User</option>
        {/if}
        <!-- Add more computed options if needed -->
      </select>
    </div>
  {:else if selectedColumn.default_value_option === "manual"}
    <div class="mb-4">
      <label class="block font-medium text-sm uppercase font-[Departure]"
        >Manual Default Value</label
      >
      <input
        type="text"
        name="default_value"
        bind:value={selectedColumn.default_value}
        on:input={handleDefaultValueChange}
        class="input input-bordered w-full"
      />
      <p class="text-xs text-gray-500 mt-1">Provide a static default value.</p>
    </div>
  {/if}

  {#if selectedColumn.data_type === "boolean"}
    <div class="mb-4">
      <label class="inline-flex items-center">
        <input
          type="checkbox"
          name="add_timestamp"
          bind:checked={selectedColumn.add_timestamp}
          on:change={handleQoLChange}
          class="checkbox"
        />
        <span class="ml-2">Add timestamp when toggled</span>
      </label>
      {#if selectedColumn.add_timestamp}
        <div class="mt-2">
          <label class="block font-medium text-sm uppercase font-[Departure]"
            >Timestamp Field Name</label
          >
          <input
            type="text"
            name="timestamp_field_name"
            bind:value={selectedColumn.timestamp_field_name}
            on:input={handleInputChange}
            class="input input-bordered w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            When this boolean changes, record the time of change in another
            column.
          </p>
        </div>
      {/if}
    </div>
  {/if}
</div>
