<script lang="ts">
  import { goto } from "$app/navigation"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  let { data } = $props()
  let { table, recordId, rowData, recentChanges, tableConfig } = data

  // Track which changes are expanded
  let expandedChanges = $state({})

  // Store record fields in formValues
  let formValues = $state({})
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

  // Returns a short summary: either "No changes.", "X changed.", or "N fields changed."
  function shortSummary(beforeJson: any, afterJson: any) {
    let before = beforeJson,
      after = afterJson
    // If they're stored as JSON strings, parse them:
    // try { before = JSON.parse(beforeJson); after = JSON.parse(afterJson); } catch {}
    const changedKeys = []
    const keys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ])
    for (const key of keys) {
      if (before?.[key] !== after?.[key]) {
        changedKeys.push(key)
      }
    }
    if (changedKeys.length === 0) return "No changes."
    if (changedKeys.length === 1)
      return `${getFriendlyLabel(changedKeys[0])} changed.`
    return `${changedKeys.length} fields changed.`
  }

  // Full detail for the expanded view
  function renderChangeSummary(beforeJson: string, afterJson: string) {
    let before = beforeJson,
      after = afterJson
    // try { before = JSON.parse(beforeJson); after = JSON.parse(afterJson); } catch {}
    const changedFields: any[] = []
    const keys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ])

    for (const key of keys) {
      const oldVal = before?.[key]
      const newVal = after?.[key]
      if (oldVal !== newVal) {
        changedFields.push({ key, oldVal, newVal })
      }
    }
    if (changedFields.length === 0) {
      return `<p>No changes.</p>`
    }

    let html = "<ul>"
    for (const cf of changedFields) {
      html += `<li style="margin-bottom: 0.25rem;"><strong>${getFriendlyLabel(cf.key)}</strong>: `
      if (cf.oldVal === undefined) {
        html += `Set to <strong>${cf.newVal}</strong>`
      } else if (cf.newVal === undefined || cf.newVal === null) {
        html += `Removed (was <strong>${cf.oldVal}</strong>)`
      } else {
        html += `Changed from <strong>${cf.oldVal}</strong> to <strong>${cf.newVal}</strong>`
      }
      html += "</li>"
    }
    html += "</ul>"
    return html
  }

  function getFriendlyLabel(key: string) {
    const colConfig = tableConfig?.model?.[key]
    if (colConfig?.label) return colConfig.label
    return key
  }

  function navigateBack() {
    goto(`/app/data/${table}`)
  }

  // Color-coded border for the circle icon
  function getOperationColor(operation: string) {
    switch (operation.toUpperCase()) {
      case "INSERT":
        return "-green-500"
      case "DELETE":
        return "-red-500"
      case "UPDATE":
      default:
        return "-blue-500"
    }
  }

  function toggleExpand(changeId: string) {
    expandedChanges[changeId] = !expandedChanges[changeId]
  }

  // Example "More Info" action
  function goToChangeDetail(changeId: string) {
    alert(`Navigate to detail of change ID: ${changeId}`)
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
          <label>{tableConfig?.model?.[column]?.label || column}</label>

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

  <!-- Right Column: Custom Vertical Timeline for Recent Changes -->
  <div class="record-sidebar">
    <div class="sidebar-card">
      <h2 class="sidebar-card-title mb-3">Recent Changes</h2>

      {#if recentChanges.length > 0}
        <div class="my-timeline">
          {#each recentChanges as change}
            <div class="my-timeline-item">
              <!-- The circle icon on the vertical line, color-coded
              <div
                class="my-timeline-icon border{getOperationColor(
                  change.operation,
                )}"
              ></div> -->

              <!-- The main content block -->
              <div class="my-timeline-content">
                <!-- Date of the change -->
                <div class="flex justify-between items-center mb-1">
                  <div class="text-xs text-gray-500">
                    {new Date(change.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span
                      class="text-sm font-bold uppercase font-[Departure] text{getOperationColor(
                        change.operation,
                      )}"
                    >
                      {change.operation}</span
                    >
                  </div>
                </div>

                <p class="text-sm mb-2">
                  {shortSummary(change.record_before, change.record_after)}
                </p>

                <!-- Buttons for "Show Details" and "More Info" -->
                <div class="flex items-center gap-2">
                  <button
                    class="btn btn-xs"
                    on:click={() => toggleExpand(change.id)}
                  >
                    {expandedChanges[change.id]
                      ? "Hide Details"
                      : "Show Details"}
                  </button>
                  <button
                    class="btn btn-xs"
                    on:click={() => goToChangeDetail(change.id)}
                  >
                    More Info
                  </button>
                </div>

                <!-- Expanded details -->
                {#if expandedChanges[change.id]}
                  <div class="bg-white border p-2 rounded text-sm mt-2">
                    {@html renderChangeSummary(
                      change.record_before,
                      change.record_after,
                    )}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p>No recent changes.</p>
      {/if}
    </div>

    <!-- Additional widgets below, unchanged -->
    <div class="sidebar-card">
      <h2 class="sidebar-card-title">Previous Workflows</h2>
      <p>(Placeholder: no data yet)</p>
    </div>
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
  /* Layout: two columns */
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

  /* Main card styling */
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

  /* Form elements */
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
    margin-bottom: 1rem;
    padding: 1rem;
  }
  .sidebar-card-title {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  /* Custom vertical timeline */
  .my-timeline-item {
    position: relative;
    margin-bottom: 1.5rem;
  }
  .my-timeline-item:last-child {
    margin-bottom: 0;
  }
  /* The circle icon on the line */
  .my-timeline-icon {
    position: absolute;
    left: -6px; /* center over the line */
    top: 6px;
    width: 18px;
    height: 18px;
    background-color: #fff;
    border: 2px solid #ccc;
    border-radius: 50%;
    z-index: 1;
  }
  /* The content block to the right of the line */
  .my-timeline-content {
    background-color: #fefefe;
    border: 1px solid #eee;
    border-radius: 1px;
    padding-left: 0.7rem;
    padding-right: 0.7rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    /* //margin-left: 1rem; small gap from the line */
  }

  /* Color-coded icon border for each operation */
  .border-green-500 {
    border-color: #22c55e !important;
  }
  .border-red-500 {
    border-color: #ef4444 !important;
  }
  .border-blue-500 {
    border-color: #3b82f6 !important;
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
