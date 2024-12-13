<script lang="ts">
  import { page } from "$app/stores"
  import { get } from "svelte/store"
  import { onMount } from "svelte"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  let log
  let severity_details

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

  // Access the state passed from the previous page
  onMount(() => {
    const state = get(page).state

    if (state?.log) {
      log = state.log
      severity_details = getSeverityDetails(log.severity)
    } else {
      // If the state is missing, redirect back to the logs list
      window.location.href = "/app/logs"
    }
  })
</script>

<Breadcrumbs></Breadcrumbs>
{#if log && severity_details}
  <div class="container mx-auto">
    <h1 class="text-2xl font-bold mb-4">
      {severity_details.emoji}
      {log.message}
    </h1>

    <p><strong>ID:</strong> {log.id}</p>
    <p>
      <strong>Timestamp:</strong>
      {new Date(log.created_at).toLocaleString()}
    </p>

    <p>
      <strong>Severity:</strong>
      <span class={severity_details.class}>{log.severity || "N/A"}</span>
    </p>
    <p><strong>Message:</strong> {log.message}</p>

    {#if log.context}
      <p><strong>Context:</strong></p>
      <pre>{JSON.stringify(log.context, null, 2)}</pre>
    {/if}

    {#if log.stack}
      <p><strong>Stack Trace:</strong></p>
      <pre>{log.stack}</pre>
    {/if}

    <a href="/app/logs" class="btn btn-primary mt-4">Back to Logs</a>
  </div>
{:else}
  <p>Loading log details...</p>
{/if}

<style>
  pre {
    background: #f8f8f8;
    padding: 1rem;
    border-radius: 5px;
    overflow-x: auto;
  }
</style>
