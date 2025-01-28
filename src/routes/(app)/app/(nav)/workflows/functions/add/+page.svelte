<script lang="ts">
  import { goto } from "$app/navigation"
  import { getContext, onMount } from "svelte"
  import { createEventDispatcher } from "svelte"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  // Form fields
  let functionName = ""
  let description = ""
  // We'll keep input and output params in arrays of objects
  let inputParamsList: Array<{
    name: string
    type: string
    required: boolean
    label: string
    description: string
    default_value: string | null
  }> = []

  let outputParamsList: Array<{
    name: string
    type: string
    label: string
    description: string
    // Typically output params might not have "required", but you can add if needed
  }> = []

  let functionBody = `
  -- Provide your function body here, e.g.:
  BEGIN
    -- do something
    RETURN 'Hello World';
  END;
  `

  const adminSection = getContext("adminSection")
  if (adminSection) {
    adminSection.set("functions")
  }

  const dispatch = createEventDispatcher()

  // For demonstration, we can seed a default param
  onMount(() => {
    // Add a single example input param
    inputParamsList = [
      {
        name: "url",
        type: "TEXT",
        required: true,
        label: "URL to Fetch",
        description: "The API endpoint to retrieve data from",
        default_value: null,
      },
    ]
    // Add a single example output param
    outputParamsList = [
      {
        name: "result",
        type: "TEXT",
        label: "Result Output",
        description: "The main result from the function",
      },
    ]
  })

  function addInputParam() {
    inputParamsList = [
      ...inputParamsList,
      {
        name: "",
        type: "TEXT",
        required: false,
        label: "",
        description: "",
        default_value: null,
      },
    ]
  }

  function removeInputParam(index: number) {
    inputParamsList = inputParamsList.filter((_, i) => i !== index)
  }

  function addOutputParam() {
    outputParamsList = [
      ...outputParamsList,
      {
        name: "",
        type: "TEXT",
        label: "",
        description: "",
      },
    ]
  }

  function removeOutputParam(index: number) {
    outputParamsList = outputParamsList.filter((_, i) => i !== index)
  }

  async function handleSubmit() {
    if (!functionName) {
      alert("Please enter a function name.")
      return
    }

    try {
      // Convert the arrays to JSON strings for the server
      const response = await fetch("/app/workflows/functions/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionName,
          description,
          inputParams: JSON.stringify(inputParamsList),
          outputParams: JSON.stringify(outputParamsList),
          functionBody,
        }),
      })

      if (!response.ok) {
        const { message } = await response.json()
        throw new Error(message || "Failed to create function.")
      }

      goto("/app/workflows/functions")
    } catch (err) {
      console.error("Error creating function:", err)
      alert(err instanceof Error ? err.message : String(err))
    }
  }
</script>

<Breadcrumbs />

<h1 class="text-2xl font-bold mb-4">Add New Function</h1>

<form class="space-y-6" on:submit|preventDefault={handleSubmit}>
  <!-- Basic Info -->
  <div>
    <label for="functionName" class="block font-medium mb-1">
      Function Name
    </label>
    <input
      id="functionName"
      bind:value={functionName}
      class="input input-bordered w-full"
      placeholder="e.g. fetch_data"
    />
  </div>

  <div>
    <label for="description" class="block font-medium mb-1">Description</label>
    <input
      id="description"
      bind:value={description}
      class="input input-bordered w-full"
      placeholder="Brief description of what the function does..."
    />
  </div>

  <!-- Input Params -->
  <div>
    <label class="block font-medium mb-2">Input Parameters</label>

    {#each inputParamsList as param, index}
      <div class="p-4 border border-gray-300 rounded mb-2 space-y-2">
        <div class="flex justify-between items-center">
          <strong>Input Parameter {index + 1}</strong>
          <button
            type="button"
            class="btn btn-sm btn-error"
            on:click={() => removeInputParam(index)}
          >
            Remove
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium">Name</label>
            <input
              class="input input-bordered w-full"
              bind:value={param.name}
              placeholder="e.g. url"
            />
          </div>

          <!-- Type -->
          <div>
            <label class="block text-sm font-medium">Type</label>
            <select
              class="select select-bordered w-full"
              bind:value={param.type}
            >
              <option value="TEXT">TEXT</option>
              <option value="INT">INT</option>
              <option value="NUMERIC">NUMERIC</option>
              <option value="JSONB">JSONB</option>
              <option value="BOOLEAN">BOOLEAN</option>
              <!-- Add more PG types as needed -->
            </select>
          </div>

          <!-- Required -->
          <div>
            <label class="flex items-center space-x-2 mt-1">
              <input
                type="checkbox"
                class="checkbox"
                bind:checked={param.required}
              />
              <span>Required?</span>
            </label>
          </div>

          <!-- Default Value (only relevant if not required) -->
          <div>
            <label class="block text-sm font-medium"
              >Default Value
              <small class="text-gray-500">(if not required)</small>
            </label>
            <input
              class="input input-bordered w-full"
              placeholder="null or some default"
              on:input={(e) =>
                (param.default_value = (e.target as HTMLInputElement).value)}
              value={param.default_value ?? ""}
            />
          </div>

          <!-- Label -->
          <div>
            <label class="block text-sm font-medium">Label</label>
            <input
              class="input input-bordered w-full"
              bind:value={param.label}
              placeholder="User-facing label"
            />
          </div>

          <!-- Description -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium">Description</label>
            <textarea
              class="textarea textarea-bordered w-full"
              placeholder="Explain what this parameter is for"
              bind:value={param.description}
            ></textarea>
          </div>
        </div>
      </div>
    {/each}

    <button
      type="button"
      class="btn btn-outline btn-sm"
      on:click={addInputParam}
    >
      + Add Input Parameter
    </button>
  </div>

  <!-- Output Params -->
  <div>
    <label class="block font-medium mb-2">Output Parameters</label>

    {#each outputParamsList as param, index}
      <div class="p-4 border border-gray-300 rounded mb-2 space-y-2">
        <div class="flex justify-between items-center">
          <strong>Output Parameter {index + 1}</strong>
          <button
            type="button"
            class="btn btn-sm btn-error"
            on:click={() => removeOutputParam(index)}
          >
            Remove
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium">Name</label>
            <input
              class="input input-bordered w-full"
              bind:value={param.name}
              placeholder="e.g. result"
            />
          </div>

          <!-- Type -->
          <div>
            <label class="block text-sm font-medium">Type</label>
            <select
              class="select select-bordered w-full"
              bind:value={param.type}
            >
              <option value="TEXT">TEXT</option>
              <option value="INT">INT</option>
              <option value="NUMERIC">NUMERIC</option>
              <option value="JSONB">JSONB</option>
              <option value="BOOLEAN">BOOLEAN</option>
            </select>
          </div>

          <!-- Label -->
          <div>
            <label class="block text-sm font-medium">Label</label>
            <input
              class="input input-bordered w-full"
              bind:value={param.label}
              placeholder="User-facing label"
            />
          </div>

          <!-- Description -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium">Description</label>
            <textarea
              class="textarea textarea-bordered w-full"
              placeholder="Explain what this output represents"
              bind:value={param.description}
            ></textarea>
          </div>
        </div>
      </div>
    {/each}

    <button
      type="button"
      class="btn btn-outline btn-sm"
      on:click={addOutputParam}
    >
      + Add Output Parameter
    </button>
  </div>

  <!-- Function Body -->
  <div>
    <label for="functionBody" class="block font-medium mb-1">
      Function Body
    </label>
    <textarea
      id="functionBody"
      bind:value={functionBody}
      class="textarea textarea-bordered w-full h-32"
    ></textarea>
  </div>

  <!-- Submit -->
  <button type="submit" class="btn btn-primary rounded">
    Create Function
  </button>
</form>

<style>
  .input,
  .textarea,
  .select {
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    padding: 0.5rem;
    width: 100%;
  }

  .input:focus,
  .textarea:focus,
  .select:focus {
    outline: none;
    border-color: #888;
  }

  .btn {
    cursor: pointer;
  }

  .btn-outline {
    background-color: #fff;
    border: 1px solid #ccc;
  }
</style>
