<script lang="ts">
  import type { PageData } from "./$types"
  import { goto } from "$app/navigation"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  export let data: PageData

  const { records, currentPage, totalPages, totalRecords } = data

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    goto(`?page=${page}`)
  }
</script>

<Breadcrumbs></Breadcrumbs>

<h1 class="text-2xl font-bold mb-4">Data for Table</h1>

<div class="overflow-x-auto">
  <table class="table-auto w-full">
    <thead>
      <tr>
        {#each Object.keys(records[0] || {}) as column}
          <th class="text-left px-4 py-2 font-bold uppercase text-sm"
            >{column}</th
          >
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each records as record}
        <tr class="cursor-pointer hover:bg-gray-100">
          {#each Object.values(record) as value}
            <td class="px-4 py-2 border-b">{value}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
<p class="mb-4 mt-2 text-xs text-gray-600 font-[Departure] uppercase">
  Showing {records.length} of {totalRecords} records (Page {currentPage} of {totalPages})
</p>
<div class="flex justify-between items-center mt-4">
  <button
    class="btn"
    on:click={() => goToPage(currentPage - 1)}
    disabled={currentPage <= 1}
  >
    Previous
  </button>
  <span>Page {currentPage} of {totalPages}</span>
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

  .btn:hover:not([disabled]) {
    background-color: darkorange;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.75rem;
    border: 1px solid #ddd;
    text-align: left;
  }

  th {
    background-color: #f9f9f9;
  }

  tr:hover {
    background-color: #f5f5f5;
  }
</style>
