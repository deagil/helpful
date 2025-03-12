<script lang="ts">
  import type { PageData } from "./$types"
  import { goto } from "$app/navigation"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  export let data: PageData

  const { records, currentPage, totalPages, totalRecords, tableConfig } = data

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    location.href = `/app/data/${tableConfig.name}?page=${page}`
  }

  function calculateRange(records, currentPage) {
    const start = Math.min((currentPage - 1) * 10 + 1, totalRecords)
    const end = Math.min(currentPage * 10, totalRecords)
    return `${start}-${end}`
  }

  // Check if a string is a valid URL
  function isValidUrl(str: string): boolean {
    try {
      new URL(str)
      return true
    } catch (e) {
      return false
    }
  }

  // Returns a class name based on the tallyBlockType for the column
  function getCellClass(column: string) {
    const config = tableConfig?.model?.[column]
    if (!config) return ""
    switch (config.tallyBlockType) {
      case "INPUT_EMAIL":
        return "email-cell"
      case "INPUT_PHONE_NUMBER":
        return "phone-cell"
      case "INPUT_LINK":
        return "url-cell"
      case "CHECKBOX":
        return "checkbox-cell"
      default:
        return "text-cell"
    }
  }

  // Format cell content based on Postgres data type AND tallyBlockType
  function formatCell(value: any, column: string) {
    const columnConfig = tableConfig?.model?.[column] || {}
    const columnType = columnConfig.data_type || "text"
    const tallyType = columnConfig.tallyBlockType

    // If the Tally block type is INPUT_LINK and the value is a valid URL, return an anchor tag
    if (tallyType === "INPUT_LINK" && value && isValidUrl(value)) {
      // We return an <a> with target="_blank" to open in new tab, and rel="noopener noreferrer" for security
      return `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`
    }

    // Otherwise, fallback to your existing Postgres data type logic:
    switch (columnType) {
      case "boolean":
        return value ? "✅" : "❌"
      case "uuid":
        return `<code>${value}</code>`
      case "timestamp with time zone":
      case "timestamp":
      case "date":
        return new Date(value).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      case "text":
      case "varchar":
      case "character varying":
        return value || ""
      default:
        return value
    }
  }
</script>

<Breadcrumbs></Breadcrumbs>

<!-- Header container styled similarly to the table wrapper -->
<div class="overflow-x-auto mb-4">
  <div
    class="flex justify-between items-center px-4 py-2 bg-white border border-gray-200"
  >
    <div>
      <h1 class="text-2xl font-bold">
        {tableConfig.label ? tableConfig.label : tableConfig.name}
      </h1>
      <h3 class="text-gray-600">
        {tableConfig.description}
      </h3>
    </div>
    <button
      class="btn btn-primary"
      on:click={() => goto(`/app/data/${tableConfig.name}/edit`)}
    >
      Edit {tableConfig.label ? tableConfig.label : tableConfig.name} Config
    </button>
  </div>
</div>

<div class="overflow-x-auto">
  <table class="table-sm w-full">
    <thead>
      <tr>
        {#each Object.keys(records[0] || {}) as column}
          <th class="px-4 py-2 text-left text-sm font-medium">
            <code>{tableConfig?.model?.[column]?.label || column}</code>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each records as record}
        <tr
          on:click={() => {
            console.log("Row clicked!")
            goto(`/app/data/${tableConfig.name}/${record.id}`)
          }}
          class="cursor-pointer hover:bg-gray-50"
        >
          {#each Object.entries(record) as [column, value]}
            <td
              class="px-4 py-2 border-b {getCellClass(column)}"
              data-type={tableConfig?.model?.[column]?.data_type || "text"}
            >
              {@html formatCell(value, column)}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<p class="mb-4 mt-2 text-xs text-gray-600 font-[Departure] uppercase">
  Showing {calculateRange(records, currentPage)} of {totalRecords} records (Page
  {currentPage} of {totalPages})
</p>

<div class="flex justify-between items-center mt-4">
  <button
    class="btn"
    on:click={() => goToPage(currentPage - 1)}
    disabled={currentPage <= 1}
  >
    Previous
  </button>
  <button
    class="btn"
    on:click={() => goToPage(currentPage + 1)}
    disabled={currentPage >= totalPages}
  >
    Next
  </button>
</div>

<style>
  .btn {
    background-color: orange;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .btn[disabled] {
    background-color: #ccc;
    cursor: not-allowed;
  }

  /* .btn:hover:not([disabled]) {
    background-color: darkorange;
  } */

  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td,
  tr {
    white-space: nowrap;
    padding: 0.75rem;
    border: 1px solid #ddd;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 250px; /* Adjust width as needed */
  }
  th {
    background-color: #f9f9f9;
  }
  tr:hover {
    background-color: #f5f5f5;
  }
  /* Styling based on tallyBlockType */
  .email-cell {
    /* background-color: #e0f7fa; light blue background for emails */
    color: #3d8387;
  }
  .phone-cell {
    /* background-color: #f1f8e9; light green background for phone numbers */
    color: #40a651;
  }
  .checkbox-cell {
    text-align: center;
  }
  .text-cell {
    /* background-color: #fff8e1; light yellow background for generic text fields */
    /* color: #f57f17; */
  }

  .url-cell {
    /* background-color: #f3e5f5; blue for url links */
    color: #2c88ce;
  }
  .url-cell a:hover {
    text-decoration: underline;
  }
</style>
