<script lang="ts">
  import type { PageData } from "./$types"
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"
  import { timeSince } from "$lib/utils/relativeTimeSince"
  import { getContext } from "svelte"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  export let data: PageData

  let errorLogs = data.errorLogs.map((log) => ({
    ...log,
    details: getSeverityDetails(log.severity),
  }))

  let selectedLog = null

  function viewErrorDetails(log) {
    selectedLog = log
  }

  function closeModal() {
    selectedLog = null
  }

  function navigateToLogDetail(id: string) {
    goto(`/logs/${id}`)
  }

  const adminSection = getContext("adminSection")
  adminSection.set("logs")

  // Get the emoji and color class based on severity
  function getSeverityDetails(severity: string) {
    switch (severity?.toLowerCase()) {
      case "error":
        return {
          emoji: "🚨",
          class: "text-red-600 font-bold font-[Departure] uppercase",
        }
      case "warning":
        return {
          emoji: "⚠️",
          class: "text-orange-500 font-medium font-",
        }
      case "info":
        return { emoji: "ℹ️", class: "text-blue-500 font-light" }
      default:
        return { emoji: "", class: "text-gray-500" }
    }
  }

  function viewLogDetail(log) {
    // Pass the full log object to the detail page using `goto`
    goto(`/app/logs/${log.id}`, {
      state: {
        log: log,
      },
    })
  }
</script>

<Breadcrumbs></Breadcrumbs>

<h1 class="text-2xl font-bold mb-4">Error Logs</h1>

{#if errorLogs.length === 0}
  <p>No error logs found.</p>
{:else}
  <div class="overflow-x-auto">
    <table class="table table-auto w-full">
      <thead>
        <tr>
          <th class="font-[Departure] uppercase">ID</th>
          <th class="font-[Departure] uppercase">Timestamp</th>
          <th class="font-[Departure] uppercase">Severity</th>
          <th class="font-[Departure] uppercase">Message</th>
        </tr>
      </thead>
      <tbody>
        {#each errorLogs as log}
          <tr
            class="cursor-pointer hover:bg-gray-200"
            on:click={() => viewLogDetail(log)}
          >
            <td><code>#{log.id}</code></td>
            <td>{timeSince(new Date(log.created_at).toISOString())}</td>
            <td>
              {#if log.severity}
                <span class={log.details.class}>
                  {log.severity}
                </span>
              {:else}
                <code class="text-gray-500">N/A</code>
              {/if}
            </td>
            <td>{log.message}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  /* Add any necessary styles */
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
  }

  .modal-box {
    position: relative;
    max-width: 60%;
    margin: 10% auto;
    padding: 1rem;
    background-color: white;
    border-radius: 0.5rem;
  }

  .modal-action {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  tr.cursor-pointer {
    transition: background-color 0.2s;
  }

  tr.cursor-pointer:hover {
    background-color: #f0f0f0;
  }
</style>
