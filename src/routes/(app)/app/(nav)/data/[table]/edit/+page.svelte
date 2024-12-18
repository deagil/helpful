<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
  import { enhance } from "$app/forms"
  import { writable } from "svelte/store"

  export let data
  let { table, columns, user_facing_name, table_description, settings } = data

  function generateUniqueId() {
    return "_" + Math.random().toString(36).substr(2, 9)
  }

  // Initial state for comparison
  let originalColumnList = []

  // Store for column data
  let columnList = writable(
    columns.map((col, i) => ({
      ...col,
      id: generateUniqueId(),
      index: i,
      is_new: false,
    })),
  )

  console.log(columns)

  // Save the original state
  originalColumnList = JSON.parse(
    JSON.stringify(columnList), // Deep copy of the initial state
  )

  // Check for changes
  function hasChanges() {
    const currentColumns = columnList
    return JSON.stringify(originalColumnList) !== JSON.stringify(currentColumns)
  }

  let selectedColumn = null
  let activeMainTab: "fields" | "tableSettings" | "integrations" = "fields"
  let showAddFieldModal = false // Toggle for Add Field modal
  let templateSearch = "" // Search filter for field templates

  // Field templates and metadata
  // Expanded Field Types with Emojis, Colors, and Descriptions
  const fieldTypes = {
    // Textual Types
    text: {
      icon: "📝",
      color: "bg-pink-200",
      label: "Text",
      description: "For strings like names, descriptions, or titles.",
    },
    // Numeric Types
    integer: {
      icon: "🔢",
      color: "bg-blue-100",
      label: "Number",
      description:
        "Whole numbers without decimals, like counts or IDs. (10 digits)",
      default: [{ label: "Zero", value: 0 }],
    },
    // Boolean
    boolean: {
      icon: "☑️",
      color: "bg-gray-200",
      label: "Boolean",
      description: "True/False values, useful for toggles or flags.",
      default: [
        { label: "Checked", value: true },
        { label: "Not Checked", value: false },
      ],
    },
    // Date and Time Types
    timestamptz: {
      icon: "🌍",
      color: "bg-red-100",
      label: "Datetime",
      description: "Timestamps including date, time and timezone information.",
      default: [{ label: "Current Timestamp", value: "now()" }],
    },
    foreign_key: {
      icon: "🔗",
      color: "bg-gray-100",
      label: "Relationship",
      description: "References another table’s record.",
    },
    uuid: {
      icon: "🔑",
      color: "bg-orange-100",
      label: "UUID",
      description: "Unique identifiers, often used as primary keys.",
      default: [{ label: "Auto-generate UUID", value: "uuid_generate_v4()" }],
    },
    jsonb: {
      icon: "📦",
      color: "bg-orange-200",
      label: "JSONB",
      description: "Binary JSON format for efficient queries.",
    },

    date: {
      icon: "📅",
      color: "bg-red-200",
      label: "Date Only",
      description: "For calendar dates without time.",
      default: [{ label: "Today", value: "CURRENT_DATE" }],
    },
    time: {
      icon: "⏰",
      color: "bg-red-200",
      label: "Time Only",
      description: "Time of day without date.",
    },
    interval: {
      icon: "📏",
      color: "bg-red-300",
      label: "Interval",
      description: "A time interval, like days or hours.",
    },
    smallint: {
      icon: "🤏",
      color: "bg-blue-200",
      label: "Small Number",
      description: "Smaller integers with limited range, +/- 32000.",
    },
    bigint: {
      icon: "🧠",
      color: "bg-blue-300",
      label: "Big Number",
      description: "Larger integers for massive numbers. (18 digits)",
    },
    float: {
      icon: "🛟",
      color: "bg-blue-400",
      label: "Float",
      description:
        "Decimal (floating-point) numbers for approximate values. 6 digits",
    },
    double: {
      icon: "🛟",
      color: "bg-blue-500",
      label: "Double",
      description:
        "High-precision Decimal (floating-point) numbers. 15 digits.",
    },

    // json: {
    //   icon: "📦",
    //   color: "bg-yellow-100",
    //   label: "JSON",
    //   description: "Structured data stored as JSON objects.",
    // },

    // Relationship Types

    // // Binary and Blob Types
    // bytea: {
    //   icon: "🗂️",
    //   color: "bg-gray-100",
    //   label: "Bytea",
    //   description: "Binary data, often used for files or images.",
    // },

    // // Spatial and Geometric Types
    // point: {
    //   icon: "📍",
    //   color: "bg-teal-100",
    //   label: "Point",
    //   description: "A geometric point (x, y).",
    // },
    // line: {
    //   icon: "📏",
    //   color: "bg-teal-200",
    //   label: "Line",
    //   description: "Infinite line in a geometric space.",
    // },
    // polygon: {
    //   icon: "🔺",
    //   color: "bg-teal-300",
    //   label: "Polygon",
    //   description: "A polygon shape, used for geographic data.",
    // },
    // circle: {
    //   icon: "⭕",
    //   color: "bg-teal-400",
    //   label: "Circle",
    //   description: "Circular shapes with a center and radius.",
    // },

    // // Networking Types
    // inet: {
    //   icon: "🌐",
    //   color: "bg-purple-100",
    //   label: "Inet",
    //   description: "IP addresses (IPv4 or IPv6).",
    // },
    // cidr: {
    //   icon: "🌐",
    //   color: "bg-purple-200",
    //   label: "CIDR",
    //   description: "Network blocks (IPv4 or IPv6).",
    // },
    // macaddr: {
    //   icon: "🖧",
    //   color: "bg-purple-300",
    //   label: "MAC Address",
    //   description: "Media Access Control (MAC) address.",
    // },

    // Array Types
    // array: {
    //   icon: "📚",
    //   color: "bg-orange-100",
    //   label: "Array",
    //   description: "Collection of items of the same type.",
    // },
  }

  // Handles selecting a column
  function selectColumn(column) {
    selectedColumn = column
  }

  // Handles adding a new column
  function addFieldFromTemplate(field) {
    const newColumn = {
      id: generateUniqueId(),
      column_name: "",
      user_facing_label: field.label,
      data_type: field.type,
      description: "",
      not_null: false,
      default_value: null,
      is_new: true,
      index: Date.now(),
    }
    columnList.update((cols) => [...cols, newColumn])
    selectedColumn = newColumn // Automatically select the newly added column
    showAddFieldModal = false // Close the modal
  }

  // Save changes
  function saveChanges() {
    const updatedColumns = []
    columnList.subscribe((cols) => {
      cols.forEach((col) => {
        if (
          col.is_new ||
          JSON.stringify(col) !==
            JSON.stringify(originalColumnList.find((c) => c.id === col.id))
        ) {
          updatedColumns.push(col)
        }
      })
    })

    fetch(`/api/tables/${table}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updatedColumns }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log("Save successful:", data)
          // Update the original state to match the saved state
          originalColumnList = JSON.parse(JSON.stringify(get(columnList)))
        }
      })
      .catch((error) => {
        console.error("Error saving changes:", error)
      })
  }

  // Dynamically determine emoji based on column datatype
  function getEmoji(dataType: string): string {
    return fieldTypes[dataType]?.icon || "❓"
  }
</script>

<Breadcrumbs />

<form id="configForm" method="POST" action="?/updateConfig" use:enhance>
  <div class="flex justify-between items-center mb-4">
    <h1 class="text-2xl font-bold"><code>{table}</code></h1>
    <button
      type="button"
      class="btn-primary text-sm uppercase"
      on:click={saveChanges}
    >
      Save Changes
    </button>
  </div>

  <div class="flex space-x-4 mb-4 border-b pb-2">
    <button
      type="button"
      class={activeMainTab === "fields" ? "border-b-2 border-orange-500" : ""}
      on:click={() => (activeMainTab = "fields")}
    >
      Fields
    </button>
    <button
      type="button"
      class={activeMainTab === "tableSettings"
        ? "border-b-2 border-pink-500"
        : ""}
      on:click={() => (activeMainTab = "tableSettings")}
    >
      Table Settings
    </button>
    <button
      type="button"
      class={activeMainTab === "integrations"
        ? "border-b-2 border-blue-500"
        : ""}
      on:click={() => (activeMainTab = "integrations")}
    >
      Integrations
    </button>
  </div>

  {#if activeMainTab === "fields"}
    <div class="flex gap-4">
      <div class="w-1/3 border-r">
        <div class="flex justify-between items-center mb-2">
          <span class="font-semibold">Fields</span>
          <button
            type="button"
            class="btn-secondary text-sm"
            on:click={() => (showAddFieldModal = true)}
          >
            Add Field
          </button>
        </div>
        <ul>
          {#each $columnList as col (col.id)}
            <li
              class="p-2 mb-2 border rounded cursor-pointer flex items-center"
              class:selected={selectedColumn && selectedColumn.id === col.id
                ? "bg-blue-100 border-blue-400"
                : ""}
              on:click={() => selectColumn(col)}
            >
              <!-- Icon -->
              <span class="mr-2">{fieldTypes[col.data_type]?.icon || "❓"}</span
              >

              <!-- Labels -->
              <strong>{col.user_facing_label || "Unnamed Field"}</strong>
              <code>{"[" + col.column_name + "]" || "Unnamed Field"}</code>
            </li>
          {/each}
        </ul>
      </div>

      <div class="w-2/3">
        {#if selectedColumn}
          <div class="mb-4">
            <label for="user_facing_label" class="block mb-1 font-semibold"
              >User Facing Label</label
            >
            <input
              id="user_facing_label"
              type="text"
              bind:value={selectedColumn.user_facing_label}
              class="input input-bordered w-full mb-4"
            />

            <label for="column_name" class="block mb-1 font-semibold"
              >Internal Name</label
            >
            <code
              ><input
                id="column_name"
                type="text"
                bind:value={selectedColumn.column_name}
                class="input input-bordered w-full mb-4"
              /></code
            >

            <label for="description" class="block mb-1 font-semibold"
              >Description</label
            >
            <textarea
              id="description"
              bind:value={selectedColumn.description}
              class="textarea textarea-bordered w-full"
            ></textarea>
          </div>

          <!-- Default Value Configuration -->
          <div class="mb-4">
            <label for="default_value_type" class="block mb-1 font-semibold">
              Default Value
            </label>
            <p class="text-sm text-gray-600 mb-2">
              Determines what happens if no value is provided when a record is
              added.
            </p>

            <!-- Dropdown Selector for Default Value Type -->
            <select
              id="default_value_type"
              class="select select-bordered w-full mb-2"
              bind:value={selectedColumn.default_value_type}
            >
              <option value="blank">Blank by default</option>
              <option value="preset">Use preset</option>
              <option value="manual">Set manually</option>
            </select>

            <!-- Preset Default Dropdown -->
            {#if selectedColumn.default_value_type === "preset" && fieldTypes[selectedColumn.data_type]?.default}
              <label for="preset_default" class="block mb-1 font-semibold">
                Preset Default
              </label>
              <select
                id="preset_default"
                class="select select-bordered w-full"
                bind:value={selectedColumn.default_value}
              >
                <option value={null} disabled>Select preset...</option>
                {#each fieldTypes[selectedColumn.data_type].default as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            {/if}

            <!-- Manual Default Input -->
            {#if selectedColumn.default_value_type === "manual"}
              <label for="manual_default" class="block mb-1 font-semibold">
                Manual Default
              </label>
              <input
                id="manual_default"
                type="text"
                class="input input-bordered w-full"
                placeholder="Enter custom default value..."
                bind:value={selectedColumn.default_value}
              />
            {/if}
          </div>
        {:else}
          <p>Select a field to edit its details.</p>
        {/if}
      </div>
    </div>
  {/if}

  {#if showAddFieldModal}
    <div
      class="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        class="bg-white p-6 rounded shadow-lg w-1/2 max-h-screen flex flex-col"
      >
        <!-- Header with fixed search input -->
        <div class="mb-4">
          <h2 class="text-lg font-bold mb-2">Add a New Field</h2>
          <input
            type="text"
            placeholder="Search field types..."
            class="input input-bordered w-full"
            bind:value={templateSearch}
          />
        </div>

        <!-- Scrollable list of field types with emojis and colors -->
        <div class="flex-1 overflow-y-auto">
          <ul class="space-y-2">
            {#each Object.entries(fieldTypes).filter(([key, f]) => f.label
                .toLowerCase()
                .includes(templateSearch.toLowerCase())) as [key, field]}
              <li
                class="p-3 border rounded-lg cursor-pointer flex items-center gap-3 hover:shadow-md transition-all"
                on:click={() => addFieldFromTemplate({ type: key, ...field })}
                style="background-color: var(--tw-color);"
              >
                <!-- Icon -->
                <span
                  class={`text-2xl flex items-center justify-center rounded-full h-10 w-10 ${field.color}`}
                >
                  {field.icon}
                </span>

                <!-- Label and Description -->
                <div class="flex-1">
                  <strong class="block text-lg">{field.label}</strong>
                  <p class="text-sm text-gray-600">{field.description}</p>
                </div>
              </li>
            {/each}
          </ul>
        </div>

        <!-- Cancel button -->
        <div class="mt-4">
          <button
            type="button"
            class="btn-secondary"
            on:click={() => (showAddFieldModal = false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
</form>

<style>
  .btn-primary {
    background-color: orange;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }

  .btn-secondary {
    background-color: gray;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
</style>
