<script lang="ts">
  import type { PageData } from "./$types"
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte"
  import { goto } from "$app/navigation"

  // Data passed from the server load:
  export let data: PageData
  const { formDetail, questions, submissions, currentPage, totalPages } = data

  // Helper to find the answer corresponding to a question in a submission.
  function getAnswerForSubmission(submission: any, questionId: string) {
    const response = submission.responses.find(
      (r: any) => r.questionId === questionId,
    )
    if (response) {
      return Array.isArray(response.answer)
        ? response.answer.join(", ")
        : response.answer
    }
    return ""
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    goto(`?page=${page}`)
  }

  // Copies the submission's shareable link to the clipboard.
  async function copySubmissionLink(submissionId: string, formId: string) {
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
    goto(`/app/forms/${formId}/submissions/${submissionId}`)
  }
</script>

<Breadcrumbs />

<!-- Rich Form-Level Information Section -->
<section class="form-details card bg-base-100 shadow p-6 mb-6">
  <h2 class="text-2xl font-bold mb-4">{formDetail.name}</h2>
  <div class="grid grid-cols-2 gap-4 text-sm">
    <div>
      <strong>Status:</strong>
      {#if formDetail.isClosed}
        <span class="text-gray-500">Closed</span>
      {:else if formDetail.status === "PUBLISHED"}
        <span class="text-green-500">Published</span>
      {:else if formDetail.status === "DRAFT"}
        <span class="text-orange-500">Draft</span>
      {/if}
    </div>
    <div>
      <strong>Accepting Submissions:</strong>
      {formDetail.isClosed ? "No" : "Yes"}
    </div>
    <div>
      <strong>Total Submissions:</strong>
      {formDetail.numberOfSubmissions}
    </div>
    <div>
      <strong>Created:</strong>
      {new Date(formDetail.createdAt).toLocaleString()}
    </div>
    <div>
      <strong>Updated:</strong>
      {new Date(formDetail.updatedAt).toLocaleString()}
    </div>
    <div>
      <strong>Language:</strong>
      {formDetail.settings?.language || "N/A"}
    </div>
  </div>
  {#if formDetail.payments && formDetail.payments.length > 0}
    <div class="mt-4">
      <strong>Payments:</strong>
      <ul class="list-disc ml-5">
        {#each formDetail.payments as payment}
          <li>{payment.amount} {payment.currency}</li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<h1 class="text-2xl font-bold mb-4">Form Submissions</h1>

<div class="overflow-x-auto">
  <table class="table-auto w-full">
    <thead>
      <tr>
        {#each questions as question}
          <th class="px-4 py-2 text-left uppercase text-sm font-bold">
            {question.title}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each submissions as submission}
        <tr
          class="cursor-pointer hover:bg-gray-100"
          on:click={() => viewSubmission(submission.id, submission.formId)}
        >
          {#each questions as question}
            <td class="px-4 py-2 border-b">
              {getAnswerForSubmission(submission, question.id)}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<p class="mb-4 mt-2 text-xs text-gray-600 uppercase font-[Departure]">
  Showing {submissions.length} submissions (Page {currentPage} of {totalPages
    ? totalPages
    : 1})
</p>

<div class="flex justify-between items-center mt-4">
  {#if totalPages != 0 || currentPage != 1}
    <button
      class="btn"
      on:click={() => goToPage(currentPage - 1)}
      disabled={currentPage <= 1}
    >
      Previous
    </button>
  {/if}
  <!-- <span>Page {currentPage} of {totalPages}</span> -->
  <!-- button hidden if only one page -->
  {#if currentPage != totalPages && totalPages != 0}
    <button
      class="btn"
      on:click={() => goToPage(currentPage + 1)}
      disabled={currentPage >= totalPages}
    >
      Next
    </button>
  {/if}
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
  .card {
    border-radius: 0.5rem;
  }
</style>
