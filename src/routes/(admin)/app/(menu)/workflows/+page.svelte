<script lang="ts">
  import { onMount } from "svelte"
  import { fetchZaps } from "$lib/mocks/mockZapierApi"
  import type { Writable } from "svelte/store"
  import { getContext } from "svelte"

  let zaps = []
  let selectedZap = null

  onMount(async () => {
    zaps = await fetchZaps()
  })

  async function viewZapActions(zapId: string) {
    selectedZap = zapId
  }

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("workflows")
</script>

<svelte:head>
  <title>Workflows</title>
</svelte:head>

<div>
  <h1 class="text-2xl font-bold mb-4">Workflows</h1>

  <table class="table-auto w-full border-collapse border border-gray-300">
    <thead>
      <tr class="bg-gray-100">
        <th class="border border-gray-300 px-4 py-2 text-left">Zap Title</th>
        <th class="border border-gray-300 px-4 py-2 text-left">Description</th>
        <th class="border border-gray-300 px-4 py-2 text-left">Status</th>
        <th class="border border-gray-300 px-4 py-2 text-left">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each zaps as zap}
        <tr>
          <td class="border border-gray-300 px-4 py-2">{zap.title}</td>
          <td class="border border-gray-300 px-4 py-2">{zap.description}</td>
          <td class="border border-gray-300 px-4 py-2">
            {zap.status === "on" ? "Active" : "Paused"}
          </td>
          <td class="border border-gray-300 px-4 py-2">
            <button
              class="text-blue-500 hover:underline"
              on:click={() => viewZapActions(zap.id)}
            >
              View
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  table {
    border-collapse: collapse;
    width: 100%;
  }

  th,
  td {
    border: 1px solid #ddd;
    padding: 8px;
  }

  th {
    background-color: #f4f4f4;
    text-align: left;
  }

  tr:nth-child(even) {
    background-color: #f9f9f9;
  }

  tr:hover {
    background-color: #f1f1f1;
  }
</style>
