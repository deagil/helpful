<script lang="ts">
  // We receive form data and errors from the server action response in `data.form`.
  // This is automatically populated by SvelteKit when using form actions with `enhance`.
  export let data: { form?: { errorMessage?: string } }

  import { getContext } from "svelte"
  import { enhance } from "$app/forms"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  function handleTableNameInput(event) {
    const inputField = event.target
    const invalidCharactersMessage =
      document.getElementById("validation-message")
    let inputValue = inputField.value

    // Automatically convert uppercase to lowercase and spaces to underscores
    inputValue = inputValue.replace(/\s/g, "_").toLowerCase()

    // Check for invalid characters
    const isValid = /^[a-z0-9_]*$/.test(inputValue)

    if (isValid) {
      invalidCharactersMessage.classList.add("hidden")
      inputField.classList.remove("input-error")
      inputField.classList.add("input-bordered")
    } else {
      invalidCharactersMessage.classList.remove("hidden")
      inputField.classList.add("input-error")
      inputField.classList.remove("input-bordered")
    }

    // Update the value in the input field
    inputField.value = inputValue
  }

  const adminSection = getContext("adminSection")
  adminSection.set("data")
</script>

<Breadcrumbs />
<div class="content-wrapper">
  <h1 class="text-2xl font-bold mb-4">Create a New Table</h1>

  {#if data.form?.errorMessage}
    <div class="alert alert-error mb-4">{data.form.errorMessage}</div>
  {/if}

  <form method="POST" action="?/createTable" use:enhance>
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1" for="table-name">
        Name<span class="text-red-500">*</span>
      </label><code>
        <input
          id="table-name"
          name="tableName"
          class="input input-bordered w-full"
          type="text"
          required
          on:input={handleTableNameInput}
        /></code
      >
      <p id="validation-message" class="hidden text-xs text-red-500 mt-1">
        Object names can only contain lowercase letters, numbers, and
        underscores only.
      </p>
      <p class="text-xs text-gray-500 mt-1">
        Enter a unique, short and clear name for your table (lowercase letters,
        numbers, and underscores only).
      </p>
    </div>

    <style>
      /* Optional: Adjust validation styles to integrate with DaisyUI */
      .input-error {
        border-color: #f87171; /* DaisyUI red */
      }
    </style>

    <div class="mb-4">
      <label class="block text-sm font-medium mb-1" for="description">
        Description
      </label>
      <textarea
        id="description"
        name="description"
        class="textarea textarea-bordered w-full"
      ></textarea>
      <p class="text-xs text-gray-500 mt-1">
        Write a short note about what this table is for, and what data is
        recorded in it.
      </p>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium mb-1" for="idType">
        ID Type
      </label>
      <p class="text-xs text-gray-500 mt-1 mb-2">
        Records need a primary ID field to identify individual records.
        <br />Choose how records in the table should be identified.
      </p>
      <details class="mt-2 mb-2">
        <summary class="cursor-pointer text-sm font-medium text-blue-500">
          Which type should I use?
        </summary>
        <div class="mt-2 text-sm text-gray-500">
          <p>
            <strong>Auto-generated ID</strong><br />
            ℹ️ A random combination of numbers and letters.
            <strong>Best in most cases.</strong>
            <br />
            👍 Guaranteed to be unique. IDs don't need to be managed<br />
            👎 Harder to read. <br />
          </p>
          <p>
            <strong>Number Sequence</strong><br />
            ℹ️ IDs increment as new records are added. <br />
            👍 Simple, efficient, and human-readable.<br />
            👎 Sequential IDs can reveal sensitive data (like number of sales, account
            numbers).<br />
          </p>
          <p>
            <strong>Manual Text IDs</strong><br />
            ℹ️ IDs are custom text values like "apples" or "blog-post-title".<br
            />
            💡 Best for public-facing uses and small datasets.<br />
            👍 Readable, SEO-friendly, and descriptive.<br />
            👎 Requires validation for uniqueness and manual entry for every record.<br
            />
          </p>
        </div>
      </details>
      <select id="idType" name="idType" class="select select-bordered w-full">
        <option value="uuid" selected>Auto-generated ID</option>
        <option value="auto_inc">Number Sequence</option>
        <option value="text_slug">Custom Text ID</option>
      </select>
    </div>

    <details class="mb-6">
      <summary class="cursor-pointer font-semibold">Advanced Options</summary>
      <div class="mt-2 space-y-4">
        <div>
          <label class="flex items-center">
            <input type="checkbox" name="softDelete" class="checkbox" />
            <span class="ml-2">
              Keep Deleted Records
              <p class="text-xs text-gray-500 mt-1">
                When turned on, records will not be permanently deleted.
                Instead, they will be marked as deleted and can be restored
                later.
              </p>
            </span>
          </label>
        </div>

        <div>
          <label class="flex items-center">
            <input type="checkbox" name="enableRLS" class="checkbox" />
            <span class="ml-2">
              Restrict Access by User
              <p class="text-xs text-gray-500 mt-1">
                If enabled, you can control which rows are visible to different
                users. Useful for apps with user accounts.
              </p>
            </span>
          </label>
        </div>

        <div>
          <label class="flex items-center">
            <input type="checkbox" name="enableAudit" class="checkbox" />
            <span class="ml-2">
              Keep Track of Changes
              <p class="text-xs text-gray-500 mt-1">
                Enable this to save a history of changes made to records for
                better tracking and recovery.
              </p>
            </span>
          </label>
        </div>
      </div>
    </details>

    <button type="submit" class="btn btn-primary">Create Table</button>
  </form>
</div>

<style>
  .content-wrapper {
    width: 70%;
    margin-left: 0;
    margin-right: auto;
  }

  details summary {
    outline: none;
  }
</style>
