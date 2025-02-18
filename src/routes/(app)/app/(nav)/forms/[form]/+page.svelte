<script lang="ts">
  import type { PageData } from "./$types"
  import { goto } from "$app/navigation"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"

  // Expecting our server load to provide submissions and pagination details.
  export let data: PageData

  const { submissions, currentPage, totalPages } = data

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    goto(`?page=${page}`)
  }

  // Copies the submission's shareable link to the clipboard.
  async function copySubmissionLink(submissionId: string, formId: string) {
    // Construct the shareable link using the formId and submission id.
    const link = `https://tally.so/r/${formId}?submission=${submissionId}`
    try {
      await navigator.clipboard.writeText(link)
      alert("Submission link copied to clipboard!")
    } catch (err) {
      console.error("Failed to copy link:", err)
      alert("Failed to copy link.")
    }
  }

  // Navigate to the submission detail view (assuming a route exists)
  function viewSubmission(submissionId: string, formId: string) {
    // For example, navigate to /app/forms/{formId}/submissions/{submissionId}
    goto(`/app/forms/${formId}/submissions/${submissionId}`)
  }
</script>

<Breadcrumbs />

<h1 class="text-2xl font-bold mb-4">Form Submissions</h1>

<div class="overflow-x-auto">
  <table class="table-auto w-full">
    <thead>
      <tr>
        <th class="px-4 py-2 text-left uppercase text-sm font-bold"
          >Submission ID</th
        >
        <th class="px-4 py-2 text-left uppercase text-sm font-bold">Status</th>
        <th class="px-4 py-2 text-left uppercase text-sm font-bold"
          >Submitted At</th
        >
        <th class="px-4 py-2 text-left uppercase text-sm font-bold"
          >Responses</th
        >
        <th class="px-4 py-2 text-center uppercase text-sm font-bold"
          >Actions</th
        >
      </tr>
    </thead>
    <tbody>
      {#each submissions as submission}
        <tr
          class="cursor-pointer hover:bg-gray-100"
          on:click={() => viewSubmission(submission.id, submission.formId)}
        >
          <td class="px-4 py-2"><code>{submission.id}</code></td>
          <td class="px-4 py-2"
            >{submission.isCompleted ? "Completed" : "Partial"}</td
          >
          <td class="px-4 py-2"
            >{new Date(submission.submittedAt).toLocaleString()}</td
          >
          <td class="px-4 py-2">
            {submission.responses
              ? submission.responses
                  .map((response) => response.value)
                  .join(", ")
              : "No responses"}
          </td>
          <td class="px-4 py-2 text-center">
            <button
              class="btn btn-sm"
              on:click|stopPropagation={() =>
                viewSubmission(submission.id, submission.formId)}
            >
              View
            </button>
            <button
              class="btn btn-sm ml-2"
              on:click|stopPropagation={() =>
                copySubmissionLink(submission.id, submission.formId)}
            >
              Copy Link
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<p class="mb-4 mt-2 text-xs text-gray-600 uppercase font-[Departure]">
  Showing {submissions.length} submissions (Page {currentPage} of {totalPages})
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
