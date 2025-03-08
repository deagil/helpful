<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
  import { goto } from "$app/navigation"
  import { getContext } from "svelte"

  export let data
  let forms = data.forms

  // Copies the form's shareable link to the clipboard
  async function copyLink(formId: string) {
    const shareableLink = `https://tally.so/r/${formId}`
    try {
      await navigator.clipboard.writeText(shareableLink)
      alert("Form link copied to clipboard!")
    } catch (err) {
      console.error("Failed to copy link:", err)
      alert("Failed to copy link")
    }
  }

  // Opens the external editing link in a new tab
  function navigateToEdit(formId: string) {
    window.open(`https://tally.so/forms/${formId}/edit`, "_blank")
  }

  const adminSection = getContext("adminSection")
  adminSection.set("forms")
</script>

<Breadcrumbs />

<!-- Page Header -->
<div class="flex justify-between items-center mb-4">
  <h1 class="text-2xl font-bold">Tally Forms</h1>
  <!-- <button class="btn btn-primary" on:click={() => goto("/app/forms/new")}>
    Create New Form
  </button> -->
</div>

<!-- Forms Table -->
<table class="table-auto w-full">
  <thead>
    <tr>
      <th class="px-4 py-2 text-left text-xs uppercase font-semibold"
        >Form Name</th
      >
      <th class="px-4 py-2 text-left text-xs uppercase font-semibold"
        >Description</th
      >
      <th class="px-4 py-2 text-center text-xs uppercase font-semibold"
        >Status</th
      >
      <th class="px-4 py-2 text-center text-xs uppercase font-semibold"
        >Submissions</th
      >
      <th class="px-4 py-2 text-center text-xs uppercase font-semibold"
        >Actions</th
      >
    </tr>
  </thead>
  <tbody>
    {#each forms as form}
      <tr
        class="cursor-pointer hover:bg-gray-50"
        on:click={() => goto(`/app/forms/${form.id}`)}
      >
        <td class="px-4 py-2">{form.name}</td>
        <td class="px-4 py-2">{form.description || "No description"}</td>

        {#if form.isClosed}
          <td
            class="text-red-500 text-center font-[Departure] uppercase text-sm"
            >Closed</td
          >
        {:else if form.status === "PUBLISHED"}
          <td
            class="text-green-500 text-center font-[Departure] uppercase text-sm"
            >Live</td
          >
        {:else if form.status === "DRAFT"}
          <td
            class="text-gray-500 text-center font-[Departure] uppercase text-sm"
            >Draft</td
          >
        {/if}
        <td class="px-4 py-2 text-center">{form.numberOfSubmissions}</td>
        <td class="px-4 py-2 text-center">
          <button
            class="btn btn-sm"
            on:click|stopPropagation={() => navigateToEdit(form.id)}
          >
            ✍️ Edit
          </button>
          <button
            class="btn btn-sm ml-2"
            on:click|stopPropagation={() => copyLink(form.id)}
          >
            🔗 Copy Link
          </button>
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  table {
    border-collapse: collapse;
  }
  th,
  td {
    border: 1px solid #ddd;
  }
</style>
