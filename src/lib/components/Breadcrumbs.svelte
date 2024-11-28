<script lang="ts">
  import { page } from "$app/stores"

  // Default map for common routes
  const defaultBreadcrumbMap = {
    "/app/home": "Home",
    "/app/settings": "Settings",
    "/app/settings/supabase": "Supabase",
    "/app/settings/zapier": "Zapier",
    "/app/settings/edit_profile": "Edit Profile",
  }

  export let breadcrumbMap: Record<string, string> = defaultBreadcrumbMap

  $: breadcrumbs = $page.url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, segments) => {
      const path = "/" + segments.slice(0, index + 1).join("/")
      const label = segment === "app" ? null : (breadcrumbMap[path] ?? segment)
      return label
        ? {
            label,
            link: index < segments.length - 1 ? path : null,
          }
        : null
    })
    .filter(Boolean)
</script>

<nav class="breadcrumbs text-sm mb-6 font-[Departure] uppercase">
  <ul>
    {#each breadcrumbs as breadcrumb}
      <li>
        {#if breadcrumb.link}
          <a href={breadcrumb.link} class="text-primary hover:underline">
            {breadcrumb.label}
          </a>
        {:else}
          {breadcrumb.label}
        {/if}
      </li>
    {/each}
  </ul>
</nav>
