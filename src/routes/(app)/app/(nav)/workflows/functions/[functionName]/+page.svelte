<script lang="ts">
  import type { PageData } from "./$types"
  import { getContext } from "svelte"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  export let data: PageData

  // Contains both the DB function (if found) and the metadata from config.functions
  let { dbFunction, metadataFunction } = data

  const adminSection = getContext("adminSection")
  if (adminSection) {
    adminSection.set("functions")
  }
</script>

<Breadcrumbs />

<h1 class="text-2xl font-bold mb-4">Function Details</h1>

{#if !dbFunction && !metadataFunction}
  <p class="text-red-600">Function not found.</p>
{:else}
  <div class="mb-4 p-4 border border-gray-300 rounded">
    <h2 class="text-xl font-semibold mb-2">
      {metadataFunction?.name || dbFunction?.routine_name}
    </h2>

    {#if dbFunction}
      <p><strong>Schema:</strong> {dbFunction.routine_schema}</p>
    {:else}
      <p class="text-gray-600">
        <em>This function was not found in the DB schema.</em>
      </p>
    {/if}

    {#if metadataFunction}
      <div class="mt-4">
        <p>
          <strong>Description:</strong>
          {metadataFunction.description || "N/A"}
        </p>

        <div class="mt-2">
          <h3 class="font-medium">Input Parameters:</h3>
          {#if Array.isArray(metadataFunction.input_params)}
            <ul class="ml-4 list-disc">
              {#each metadataFunction.input_params as param}
                <li>
                  <strong>{param.name}</strong>
                  (<em>{param.type}</em>)
                  {#if param.required}
                    - required{/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p class="text-gray-600">No input parameters defined.</p>
          {/if}
        </div>

        <div class="mt-2">
          <h3 class="font-medium">Output Parameters:</h3>
          {#if Array.isArray(metadataFunction.output_params)}
            <ul class="ml-4 list-disc">
              {#each metadataFunction.output_params as param}
                <li>
                  <strong>{param.name}</strong>
                  (<em>{param.type}</em>)
                </li>
              {/each}
            </ul>
          {:else}
            <p class="text-gray-600">No output parameters defined.</p>
          {/if}
        </div>
      </div>
    {:else}
      <p class="mt-4 text-gray-600">
        <em>Metadata not found for this function.</em>
      </p>
    {/if}
  </div>
{/if}
