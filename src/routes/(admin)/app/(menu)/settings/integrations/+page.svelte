<script>
  import IntegrationsGrid from "$lib/components/IntegrationsGrid.svelte" // Extracted component
</script>

<svelte:head>
  <title>Integrations</title>
</svelte:head>

<div
  class="breadcrumbs text-sm mb-6 font-[Departure] text-transform: uppercase"
>
  <ul>
    <li><a href="/app/home">Home</a></li>
    <li><a href="/app/settings">Settings</a></li>
    <li>Integrations</li>
  </ul>
</div>

<h1 class="text-2xl font-bold mb-4">Integrations</h1>
<p class="text-gray-600 mb-6">Manage all your integrations from this page.</p>
<IntegrationsGrid />
