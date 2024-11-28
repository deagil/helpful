<script lang="ts">
  import { onMount } from "svelte"
  import { writable } from "svelte/store"

  export let selectedColumn

  // Stores for tables and columns
  let tables = []
  let columns = writable([])

  // Fetch list of tables on component mount
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

  async function fetchColumns(tableName) {
    console.log("fetchColumns called with tableName:", tableName) // Debugging log

    let testvar = "/api/columns/" + tableName

    try {
      const response = await fetch(testvar)
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

  // Reactive statement to fetch columns when a table is selected
  $: if (selectedColumn.foreign_table) {
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

    // Reset foreign key fields if data type changes
    if (name === "data_type" && value !== "foreign_key") {
      delete selectedColumn.foreign_table
      delete selectedColumn.foreign_column
    }

    // Reset default value fields if data type changes
    if (name === "data_type") {
      delete selectedColumn.default_value_option
      delete selectedColumn.default_value
      delete selectedColumn.computed_value
    }
  }

  function handleDefaultValueChange(event) {
    const { name, value } = event.target
    selectedColumn[name] = value
  }

  // Function to handle quality-of-life features
  function handleQoLChange(event) {
    const { name, checked } = event.target
    selectedColumn[name] = checked
  }
</script>

<div>
  <!-- Column Name -->
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
  </div>

  <!-- Column Label -->
  <div class="mb-4">
    <label class="block font-medium text-sm uppercase font-[Departure]"
      >User Facing Field Name</label
    >
    <input
      type="text"
      name="column_label"
      bind:value={selectedColumn.column_label}
      on:input={handleInputChange}
      class="input input-bordered w-full"
    />
  </div>

  <!-- Description -->
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
      <!-- Add more data types as needed -->
    </select>
  </div>

  <!-- Conditional Fields Based on Data Type -->
  {#if selectedColumn.data_type === "integer"}
    <!-- Integer Specific Options -->
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
    <!-- Text Specific Options -->
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
    <!-- Foreign Key Specific Options -->
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
        {#each tables as table}
          <option value={table}>{table}</option>
        {/each}
      </select>
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
          {#each $columns as column}
            <option value={column}>{column}</option>
          {/each}
        </select>
      </div>
    {/if}
  {/if}

  <!-- Common Constraints -->
  <div class="mb-4">
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
  </div>
  <div class="mb-4">
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
      <option value="manual">Manually set default value</option>
    </select>
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
          <option value="NOW()">Current Date/Time</option>
        {:else if selectedColumn.data_type === "text"}
          <option value="current_user">Current User</option>
        {/if}
        <!-- Add more computed options as needed -->
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
    </div>
  {/if}

  <!-- Quality-of-Life Features -->
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
        <span class="ml-2">Add timestamp when set</span>
      </label>
    </div>
    {#if selectedColumn.add_timestamp}
      <div class="mb-4">
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
      </div>
    {/if}
  {/if}
</div>
