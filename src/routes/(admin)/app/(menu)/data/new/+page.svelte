<script lang="ts">
  import { getContext } from "svelte"

  let tableName = ""
  let description = ""
  let enableRLS = false
  let addUpdatedAtTrigger = false
  let errorMessage = ""

  const adminSection = getContext("adminSection")
  adminSection.set("data")
</script>

<h1 class="text-2xl font-bold mb-4">Create New Table</h1>

{#if errorMessage}
  <div class="alert alert-error mb-4">{errorMessage}</div>
{/if}

<form method="POST" action="?/createTable">
  <div class="mb-4">
    <label class="block text-sm font-medium mb-1" for="table-name"
      >Table Name<span class="text-red-500">*</span></label
    >
    <input
      id="table-name"
      name="tableName"
      class="input input-bordered w-full"
      type="text"
      required
    />
  </div>

  <div class="mb-4">
    <label class="block text-sm font-medium mb-1" for="description"
      >Description</label
    >
    <textarea
      id="description"
      name="description"
      class="textarea textarea-bordered w-full"
    ></textarea>
  </div>

  <div class="mb-4">
    <label class="flex items-center">
      <input type="checkbox" name="enableRLS" class="checkbox" />
      <span class="ml-2">Enable Row Level Security (RLS)</span>
    </label>
  </div>

  <div class="mb-6">
    <label class="flex items-center">
      <input type="checkbox" name="addUpdatedAtTrigger" class="checkbox" />
      <span class="ml-2"
        >Automatically update <code>updated_at</code> timestamp on changes</span
      >
    </label>
  </div>

  <button type="submit" class="btn btn-primary"> Create Table </button>
</form>

<style>
  /* Add any necessary styles here */
</style>
