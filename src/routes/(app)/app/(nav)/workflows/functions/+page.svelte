<script lang="ts">
  import type { PageData } from "./$types"
  import { goto } from "$app/navigation"
  import { onMount } from "svelte"
  import { getContext } from "svelte"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  export let data: PageData

  const dbFunctions = data.dbFunctions ?? []
  const metadataFunctions = data.metadataFunctions ?? []

  let mergedFunctions = dbFunctions.map((dbFunc) => {
    const matchedMeta = metadataFunctions.find(
      (meta) => meta.name === dbFunc.routine_name,
    )
    return {
      routine_name: dbFunc.routine_name,
      routine_schema: dbFunc.routine_schema,
      hasMetadata: !!matchedMeta,
      metadata: matchedMeta || {},
    }
  })

  for (const metaFunc of metadataFunctions) {
    if (!mergedFunctions.find((mf) => mf.routine_name === metaFunc.name)) {
      mergedFunctions.push({
        routine_name: metaFunc.name,
        routine_schema: "config",
        hasMetadata: true,
        metadata: metaFunc,
      })
    }
  }

  // Dropdown state
  let dropdownOpenIndex: number | null = null

  function toggleDropdown(e: MouseEvent, index: number) {
    e.stopPropagation()
    dropdownOpenIndex = dropdownOpenIndex === index ? null : index
  }

  function closeDropdown() {
    dropdownOpenIndex = null
  }

  onMount(() => {
    // Close dropdown if user clicks anywhere else
    document.addEventListener("click", closeDropdown)
    return () => {
      document.removeEventListener("click", closeDropdown)
    }
  })

  function goToNewFunctionForm() {
    goto("/app/workflows/functions/add")
  }

  function editFunction(routineName: string) {
    goto(`/app/workflows/functions/${routineName}`)
  }

  async function deleteFunction(routineName: string) {
    const confirmed = confirm(
      `Are you sure you want to delete function "${routineName}"?`,
    )
    if (!confirmed) return

    try {
      const response = await fetch(`/app/functions/${routineName}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const { message } = await response.json().catch(() => ({}))
        throw new Error(message || "Failed to delete function.")
      }
      // Refresh or reload after delete
      location.reload()
    } catch (err: any) {
      alert(err.message)
      console.error(err)
    }
  }

  const adminSection = getContext("adminSection")
  if (adminSection) {
    adminSection.set("functions")
  }
</script>

<Breadcrumbs />

<div class="flex justify-between items-center mb-4">
  <h1 class="text-2xl font-bold">Functions</h1>
  <button class="btn btn-primary" on:click={goToNewFunctionForm}>
    Add New Function
  </button>
</div>

<table class="table-auto w-full">
  <thead>
    <tr>
      <th class="font-semibold uppercase text-left px-4 py-2 text-xs"
        >Function Name</th
      >
      <th class="font-semibold uppercase text-left px-4 py-2 text-xs">In DB?</th
      >
      <th class="font-semibold uppercase text-left px-4 py-2 text-xs"
        >Metadata?</th
      >
      <th class="font-semibold uppercase text-left px-4 py-2 text-xs"
        >Description</th
      >
      <th class="font-semibold uppercase text-right px-4 py-2 text-xs"
        >Actions</th
      >
    </tr>
  </thead>
  <tbody>
    {#each mergedFunctions as func, index}
      <tr class="cursor-pointer hover:bg-gray-50">
        <!-- Clicking the row might take you to a detail page if desired:
          on:click={() => goto(`/app/functions/${func.routine_name}`)}
          If so, add event.stopPropagation() in the dropdown button to avoid conflict.
        -->
        <td
          class="px-4 py-2"
          on:click={() => goto(`/app/workflows/functions/${func.routine_name}`)}
        >
          <code>{func.routine_name}</code>
        </td>
        <td class="px-4 py-2">
          {#if dbFunctions.find((dbFunc) => dbFunc.routine_name === func.routine_name)}
            <span class="text-green-600 font-medium">Yes</span>
          {:else}
            <span class="text-red-600 font-medium">No</span>
          {/if}
        </td>
        <td class="px-4 py-2">
          {#if func.hasMetadata}
            <span class="text-green-600 font-medium">Yes</span>
          {:else}
            <span class="text-red-600 font-medium">No</span>
          {/if}
        </td>
        <td class="px-4 py-2">
          {func.metadata.description ? func.metadata.description : "N/A"}
        </td>
        <td
          class="px-4 py-2 text-right relative"
          on:click={(e) => e.stopPropagation()}
        >
          <div class="dropdown dropdown-end">
            <button
              class={`btn btn-sm border border-gray-300 ${
                dropdownOpenIndex === index
                  ? "bg-base-100 text-base-content rounded-b-none"
                  : "bg-white"
              }`}
              on:click={(e) => toggleDropdown(e, index)}
              aria-expanded={dropdownOpenIndex === index}
            >
              <span class="invisible">Actions</span>
              <span class="absolute inset-0 flex items-center justify-center">
                {dropdownOpenIndex === index ? "Close" : "Actions"}
              </span>
            </button>
            {#if dropdownOpenIndex === index}
              <ul
                class="dropdown-content menu p-2 shadow-lg bg-base-100 border border-gray-300 rounded-t-lg w-52 z-50"
                on:click={(e) => e.stopPropagation()}
              >
                <li>
                  <a
                    href="#"
                    on:click={(e) => {
                      e.preventDefault()
                      editFunction(func.routine_name)
                    }}
                  >
                    <span class="text-lg">✍️</span> Edit
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    on:click={(e) => {
                      e.preventDefault()
                      deleteFunction(func.routine_name)
                    }}
                  >
                    <span class="text-lg">🗑️</span> Delete
                  </a>
                </li>
              </ul>
            {/if}
          </div>
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .cursor-pointer {
    transition: background-color 0.2s;
  }
  .cursor-pointer:hover {
    background-color: #f9f9f9;
  }

  /* Make sure nothing forces the table or the dropdown to overflow/clamp */
  .dropdown {
    position: relative;
  }
  .dropdown-content {
    border-top-right-radius: 0px;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    position: absolute;
    top: 100%;
    right: 0;
    min-width: 8rem;
    z-index: 50;
  }

  /* Optional: style overrides for the "Actions" button: */
  .btn-sm {
    padding: 0.25rem 0.5rem;
  }
  .invisible {
    visibility: hidden;
    pointer-events: none;
  }
</style>
