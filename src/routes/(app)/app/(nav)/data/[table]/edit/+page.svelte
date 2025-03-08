<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
  import { enhance } from "$app/forms"
  import { goto } from "$app/navigation"

  // Get props using the new $props rune.
  let { data } = $props()
  let {
    table,
    columns,
    user_facing_name,
    table_description,
    audit_logging_enabled,
  } = data

  // Create deep reactive state for columns using $state.
  let columnList = $state(
    columns.map((col, i) => ({
      ...col,
      id: col.column_name, // use the column name as a unique id
      index: i,
      include_in_forms:
        col.include_in_forms !== undefined ? col.include_in_forms : true,
    })),
  )

  // Deep reactive state for the currently selected column.
  let selectedColumn = $state(null)

  // Table-level settings as reactive state.
  let userFacingName = $state(user_facing_name)
  let tableDescription = $state(table_description)

  // Whether audit logging is enabled
  let auditLoggingEnabled = $state(audit_logging_enabled)

  // Derived state for column count.
  let columnCount = $derived(() => columnList.length)

  // Automatically select the first column if none is selected.
  $effect(() => {
    if (selectedColumn === null && columnList.length > 0) {
      selectedColumn = columnList[0]
    }
  })

  function navigateBack() {
    goto("/app/data")
  }

  // Update the selected column.
  function selectColumn(col) {
    selectedColumn = col
  }

  const tallyMappingOptions = {
    text: {
      options: [
        { value: "INPUT_TEXT", label: "📝 Short Text" },
        { value: "TEXTAREA", label: "📚 Long Text" },
        { value: "INPUT_LINK", label: "🔗 URL" },
        { value: "INPUT_PHONE_NUMBER", label: "☎️ Phone Number" },
        { value: "INPUT_EMAIL", label: "✉️ Email Address" },
      ],
      extraFields: [],
    },
    integer: {
      options: [{ value: "INPUT_NUMBER", label: "Input Number" }],
      extraFields: [
        { name: "min", label: "Minimum Value", type: "number" },
        { name: "max", label: "Maximum Value", type: "number" },
        { name: "step", label: "Step", type: "number" },
      ],
    },
    boolean: {
      options: [{ value: "CHECKBOX", label: "☑️ Checkbox" }],
      extraFields: [],
    },
    timestamptz: {
      options: [{ value: "INPUT_DATE", label: "Input Date" }],
      extraFields: [],
    },
    date: {
      options: [{ value: "INPUT_DATE", label: "Input Date" }],
      extraFields: [],
    },
    timestamp: {
      options: [{ value: "INPUT_DATE", label: "Input Date" }],
      extraFields: [],
    },
    uuid: {
      options: [{ value: "INPUT_TEXT", label: "Input Text" }],
      extraFields: [],
    },
  }

  // Derived state for allowed mapping based on the selected column.
  let allowedMapping = $derived.by(() => {
    if (selectedColumn) {
      return (
        tallyMappingOptions[selectedColumn.data_type] || {
          options: [{ value: "INPUT_TEXT", label: "Input Text" }],
          extraFields: [],
        }
      )
    }
    return { options: [], extraFields: [] }
  })

  // Update an extra setting for the selected column.
  function updateExtraField(fieldName, value) {
    selectedColumn.tally_specific_options = {
      ...(selectedColumn.tally_specific_options || {}),
      [fieldName]: value,
    }
  }
</script>

<Breadcrumbs />

<form method="POST" use:enhance>
  <div class="flex justify-between items-center mb-4">
    <h1 class="text-2xl font-bold">
      Edit Table Config: <code>{table}</code>
    </h1>
    <button type="button" class="btn btn-secondary" on:click={navigateBack}>
      Back
    </button>
  </div>

  <!-- Table-level Settings -->
  <div class="mb-6">
    <label class="block font-medium mb-1" for="userFacingName">
      User Facing Table Name
    </label>
    <input
      type="text"
      id="userFacingName"
      name="user_facing_name"
      bind:value={userFacingName}
      class="input input-bordered w-full"
    />
  </div>

  <div class="mb-6">
    <label class="block font-medium mb-1" for="tableDescription">
      Table Description
    </label>
    <textarea
      id="tableDescription"
      name="table_description"
      bind:value={tableDescription}
      class="textarea textarea-bordered w-full"
    ></textarea>
  </div>

  <!-- New Checkbox: Enable Audit Log -->
  <div class="mb-6">
    <label class="inline-flex items-center">
      <input
        type="checkbox"
        name="audit_logging_enabled"
        bind:checked={auditLoggingEnabled}
        class="checkbox"
      />
      <span class="ml-2">Enable Audit Log</span>
    </label>
  </div>

  <!-- Two Column Layout for Column Settings -->
  <div class="flex space-x-4">
    <!-- Left column: list of columns with emoji styling -->
    <div class="w-1/3 border-r pr-2">
      <h2 class="text-xl font-bold mb-2">Columns</h2>
      <ul>
        {#each columnList as col (col.id)}
          {@const meta = tallyMappingOptions[col.data_type]
            ? tallyMappingOptions[col.data_type].options[0]
            : { icon: "❓", color: "bg-gray-50", label: "Unknown" }}
          <li
            class="p-2 cursor-pointer hover:bg-gray-100 rounded mb-1 {selectedColumn &&
            selectedColumn.id === col.id
              ? 'bg-gray-200'
              : ''}"
            on:click={() => selectColumn(col)}
          >
            <span class="{meta.color} px-2 py-1 rounded inline-block">
              {meta.icon}
            </span>
            <span class="ml-2">
              {#if col.user_facing_label}
                <span class="font-medium">{col.user_facing_label}</span>
                {#if col.column_name}
                  <code>[{col.column_name}]</code>
                {/if}
              {:else if col.column_name}
                <span class="font-medium">{col.column_name}</span>
              {:else}
                <code>Unnamed {meta.label} field</code>
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Right column: details for selected column -->
    <div class="w-2/3 pl-2">
      {#if selectedColumn}
        <h2 class="text-xl font-bold mb-2">
          Edit Column: <code>{selectedColumn.column_name}</code>
        </h2>
        <!-- Hidden field for column name -->
        <input
          type="hidden"
          name={"col_" + selectedColumn.index + "_column_name"}
          value={selectedColumn.column_name}
        />

        <div class="mb-4">
          <label
            class="block font-medium"
            for={"col_" + selectedColumn.index + "_user_facing_label"}
            >User Facing Label</label
          >
          <input
            type="text"
            id={"col_" + selectedColumn.index + "_user_facing_label"}
            name={"col_" + selectedColumn.index + "_user_facing_label"}
            bind:value={selectedColumn.user_facing_label}
            class="input input-bordered w-full"
          />
        </div>

        <div class="mb-4">
          <label
            class="block font-medium"
            for={"col_" + selectedColumn.index + "_help_text"}>Help Text</label
          >
          <textarea
            id={"col_" + selectedColumn.index + "_help_text"}
            name={"col_" + selectedColumn.index + "_help_text"}
            bind:value={selectedColumn.help_text}
            class="textarea textarea-bordered w-full"
          ></textarea>
        </div>

        <!-- Tally Field Type -->
        <div class="mb-4">
          <label
            class="block font-medium"
            for={"col_" + selectedColumn.index + "_tally_field_type"}
            >Tally Field Type</label
          >
          <select
            id={"col_" + selectedColumn.index + "_tally_field_type"}
            name={"col_" + selectedColumn.index + "_tally_field_type"}
            bind:value={selectedColumn.tally_field_type}
            class="select select-bordered w-full"
          >
            {#each allowedMapping.options as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <!-- Checkbox: Include in Forms -->
        <div class="mb-4">
          <label class="inline-flex items-center">
            <input
              type="checkbox"
              name={"col_" + selectedColumn.index + "_include_in_forms"}
              bind:checked={selectedColumn.include_in_forms}
              class="checkbox"
            />
            <span class="ml-2">Include in forms</span>
          </label>
        </div>

        <!-- Extra Settings -->
        {#if allowedMapping.extraFields.length > 0}
          <div class="mb-4">
            <label class="block font-medium mb-2">Extra Settings</label>
            {#each allowedMapping.extraFields as field}
              <div class="mb-2">
                <label
                  class="block text-sm font-medium"
                  for={"col_" + selectedColumn.index + "_" + field.name}
                  >{field.label}</label
                >
                <input
                  type={field.type}
                  id={"col_" + selectedColumn.index + "_" + field.name}
                  class="input input-bordered w-full"
                  value={selectedColumn.tally_specific_options[field.name] ||
                    ""}
                  on:input={(e) => updateExtraField(field.name, e.target.value)}
                />
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <p>Select a column to view and edit its settings.</p>
      {/if}
    </div>
  </div>

  <!-- Hidden field for column count -->
  <input type="hidden" name="columnCount" value={columnCount} />

  <!-- Hidden field with the complete column configuration as JSON -->
  <input type="hidden" name="all_columns" value={JSON.stringify(columnList)} />

  <div class="flex justify-end mt-6">
    <button type="submit" formaction="?/updateConfig" class="btn btn-primary">
      Save Configuration
    </button>
  </div>
</form>

<style>
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
  .btn-primary {
    background-color: orange;
    color: white;
  }
  .btn-secondary {
    background-color: gray;
    color: white;
  }
  .input,
  .select,
  .textarea {
    margin-top: 0.25rem;
  }
</style>
