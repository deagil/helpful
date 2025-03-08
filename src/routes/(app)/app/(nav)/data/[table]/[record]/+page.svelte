<script lang="ts">
  import { goto } from "$app/navigation"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  let { data } = $props()
  let { table, recordId, rowData, recentChanges, tableConfig } = data

  // We'll store a local copy of each field's value
  let formValues = $state({})

  // Initialize formValues with the existing rowData
  $effect(() => {
    for (const [col, val] of Object.entries(rowData)) {
      formValues[col] = val
    }
  })

  function getInputType(column: string) {
    const columnConfig = tableConfig?.model?.[column] || {}
    const tallyType = columnConfig.tallyBlockType
    const columnType = columnConfig.data_type || "text"

    switch (tallyType) {
      case "INPUT_LINK":
        return "url"
      case "INPUT_PHONE_NUMBER":
        return "tel"
      case "INPUT_EMAIL":
        return "email"
      case "INPUT_NUMBER":
        return "number"
      case "CHECKBOX":
        return "checkbox"
      case "INPUT_DATE":
        return "datetime-local"
      default:
        switch (columnType) {
          case "boolean":
            return "checkbox"
          case "uuid":
          case "text":
          case "varchar":
          case "character varying":
            return "text"
          case "timestamp with time zone":
          case "timestamp":
          case "date":
            return "datetime-local"
          default:
            return "text"
        }
    }
  }

  function formatDisplayValue(column: string, value: any) {
    const inputType = getInputType(column)
    if (inputType === "datetime-local" && value) {
      const d = new Date(value)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      const hour = String(d.getHours()).padStart(2, "0")
      const min = String(d.getMinutes()).padStart(2, "0")
      return `${year}-${month}-${day}T${hour}:${min}`
    }
    if (inputType === "checkbox") {
      return !!value
    }
    return value ?? ""
  }

  async function handleSave() {
    console.log("Saving changes for record", recordId, formValues)
    alert("Save logic not yet implemented!")
  }

  /**
   * Build a human-readable summary of changes, e.g.:
   *  - "Name changed from Bob to Alice"
   *  - "3 properties changed including Name, Age, Height"
   */
  function renderChangeSummary(beforeJson: string, afterJson: string) {
    let before = beforeJson,
      after = afterJson
    try {
      // If these were JSON strings, you'd parse them:
      // before = JSON.parse(beforeJson);
      // after = JSON.parse(afterJson);
    } catch (e) {
      return `<p>Changes: (invalid JSON or no changes)</p>`
    }

    // Collect the changed fields
    const changedFields: any[] = []
    const keys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ])

    for (const key of keys) {
      const oldVal = before?.[key]
      const newVal = after?.[key]

      if (oldVal === undefined && newVal !== undefined) {
        // field was added
        changedFields.push({
          key,
          type: "added",
          oldVal: null,
          newVal,
        })
      } else if (oldVal !== undefined && newVal === undefined) {
        // field was removed
        changedFields.push({
          key,
          type: "removed",
          oldVal,
          newVal: null,
        })
      } else if (oldVal !== newVal) {
        // field was updated
        changedFields.push({
          key,
          type: "updated",
          oldVal,
          newVal,
        })
      }
    }

    if (changedFields.length === 0) {
      return `<p>No changes.</p>`
    }

    if (changedFields.length === 1) {
      const cf = changedFields[0]
      const label = getFriendlyLabel(cf.key)
      if (cf.type === "added") {
        return `<p>${label} was added (value: <strong>${cf.newVal}</strong>)</p>`
      } else if (cf.type === "removed") {
        return `<p>${label} was removed (previous value: ${cf.oldVal})</p>`
      } else {
        return `<p>${label} changed from <strong>${cf.oldVal}</strong> to <strong>${cf.newVal}</strong></p>`
      }
    }

    // If multiple fields changed
    const labels = changedFields.map((cf) => getFriendlyLabel(cf.key))
    return `<p>${changedFields.length} properties changed including ${labels.join(", ")}</p>`
  }

  function getFriendlyLabel(key: string) {
    const colConfig = tableConfig?.model?.[key]
    if (colConfig && colConfig.label) {
      return colConfig.label
    }
    return key
  }

  function navigateBack() {
    goto(`/app/data/${table}`)
  }

  // Returns a color-coded class for the operation
  function getOperationClass(operation: string) {
    switch (operation.toUpperCase()) {
      case "INSERT":
        return "text-green-500"
      case "DELETE":
        return "text-red-500"
      case "UPDATE":
      default:
        return "text-blue-500"
    }
  }
</script>

<Breadcrumbs />

<div class="record-container">
  <!-- Left Column: Edit Form -->
  <div class="record-main">
    <form class="main-card" on:submit|preventDefault={handleSave}>
      <h2 class="card-title">
        {tableConfig.label ? tableConfig.label : table} Record
      </h2>
      <h3 class="card-subtitle">Record ID: {recordId}</h3>

      {#each Object.entries(rowData) as [column, originalValue]}
        <div class="form-group">
          <label>
            {tableConfig?.model?.[column]?.label || column}
          </label>

          {#if getInputType(column) === "checkbox"}
            <input
              type="checkbox"
              checked={formatDisplayValue(column, formValues[column])}
              on:change={(e) => (formValues[column] = e.target.checked)}
            />
          {:else if getInputType(column) === "datetime-local"}
            <input
              type="datetime-local"
              class="text-input"
              value={formatDisplayValue(column, formValues[column])}
              on:input={(e) => (formValues[column] = e.target.value)}
            />
          {:else}
            <input
              type={getInputType(column)}
              class="text-input"
              value={formatDisplayValue(column, formValues[column])}
              on:input={(e) => (formValues[column] = e.target.value)}
            />
          {/if}
        </div>
      {/each}

      <button type="submit" class="btn-primary">Save Changes</button>
    </form>

    <div class="main-card">
      <h2 class="card-title">Related Records</h2>
      <p class="card-subtitle">(Placeholder for foreign-key-related records)</p>
    </div>
  </div>

  <!-- Right Column: Preview Widgets -->
  <div class="record-sidebar">
    <!-- Recent Changes Widget using DaisyUI Timeline -->
    <div class="sidebar-card">
      <h2 class="sidebar-card-title">Recent Changes</h2>
      {#if recentChanges.length > 0}
        <ul class="timeline timeline-vertical">
          {#each recentChanges as change, i}
            <li>
              {#if i !== 0}
                <hr />
              {/if}
              <div class="timeline-start {getOperationClass(change.operation)}">
                {change.operation}
              </div>
              <div class="timeline-middle">
                <!-- Icon (you could change it based on operation) -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-5 w-5"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="timeline-end timeline-box">
                <div class="human-log">
                  {@html renderChangeSummary(
                    change.record_before,
                    change.record_after,
                  )}
                </div>
              </div>
              <!-- If you want a trailing <hr/> for all but the last item, you can do it here -->
            </li>
          {/each}
        </ul>
      {:else}
        <p>No recent changes.</p>
      {/if}
    </div>

    <!-- Previous Workflows Widget -->
    <div class="sidebar-card">
      <h2 class="sidebar-card-title">Previous Workflows</h2>
      <p>(Placeholder: no data yet)</p>
    </div>

    <!-- Scheduled Workflows Widget -->
    <div class="sidebar-card">
      <h2 class="sidebar-card-title">Scheduled Workflows</h2>
      <p>(Placeholder: not yet implemented)</p>
    </div>
  </div>
</div>

<div class="footer-buttons">
  <button class="btn-secondary" on:click={navigateBack}>
    Back to {tableConfig.label ? tableConfig.label : table}
  </button>
</div>

<style>
  /* Two-column layout (left main card, right sidebar) */
  .record-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .record-main {
    flex: 2;
    min-width: 300px;
  }
  .record-sidebar {
    flex: 1;
    min-width: 250px;
  }

  /* Main content cards */
  .main-card {
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .card-title {
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }
  .card-subtitle {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 0.75rem;
  }

  /* Form styling */
  .form-group {
    margin-bottom: 1rem;
  }
  .form-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  .text-input {
    width: 100%;
    max-width: 400px;
    padding: 0.4rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  /* Sidebar cards */
  .sidebar-card {
    background-color: #fafafa;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .sidebar-card-title {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  /* DaisyUI Timeline overrides if needed */
  .timeline-start {
    font-weight: bold;
  }
  .timeline-box {
    padding: 0.5rem;
    border-radius: 4px;
    background: #fff;
    border: 1px solid #ccc;
  }

  /* "Human log" styling for changes */
  .human-log {
    margin-top: 0.5rem;
    padding: 0.5rem;
    border: 1px solid #ddd;
    background-color: #fefefe;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  /* Buttons */
  .btn-primary,
  .btn-secondary {
    padding: 0.6rem 1rem;
    border-radius: 4px;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    border: none;
  }
  .btn-primary {
    background-color: orange;
    color: white;
  }
  .btn-secondary {
    background-color: gray;
    color: white;
  }
  .footer-buttons {
    margin-top: 1rem;
  }
</style>
