<script lang="ts">
  import { createEventDispatcher } from "svelte"
  export let column
  export let selectedColumn

  const dispatch = createEventDispatcher()

  function handleClick() {
    dispatch("selectColumn", column)
  }

  // Metadata for each data_type
  const typeMetadata = {
    text: { icon: "📝", color: "bg-blue-100", label: "Text" },
    integer: { icon: "🔢", color: "bg-green-100", label: "Integer" },
    date: { icon: "📅", color: "bg-yellow-100", label: "Date" },
    timestamp: { icon: "⏰", color: "bg-purple-100", label: "Timestamp" },
    uuid: { icon: "🔑", color: "bg-indigo-100", label: "UUID" },
    boolean: { icon: "✔️", color: "bg-pink-100", label: "Boolean" },
    foreign_key: { icon: "🔗", color: "bg-gray-100", label: "Foreign Key" },
  }

  const meta = typeMetadata[column.data_type] || {
    icon: "❓",
    color: "bg-gray-50",
    label: "Unknown",
  }

  function moveColumnUp(col) {
    columnList.update((cols) => {
      const idx = cols.findIndex((c) => c.id === col.id)
      if (idx > 0 && cols[idx].is_new) {
        const temp = cols[idx]
        cols[idx] = cols[idx - 1]
        cols[idx - 1] = temp
      }
      return cols
    })
  }

  function moveColumnDown(col) {
    columnList.update((cols) => {
      const idx = cols.findIndex((c) => c.id === col.id)
      if (idx < cols.length - 1 && cols[idx].is_new) {
        const temp = cols[idx]
        cols[idx] = cols[idx + 1]
        cols[idx + 1] = temp
      }
      return cols
    })
  }
</script>

<li
  class="p-2 mb-2 border rounded cursor-move flex items-center space-x-2 {selectedColumn &&
  selectedColumn.id === column.id
    ? 'bg-gray-200'
    : ''}"
  on:click={handleClick}
>
  <span class="{meta.color} px-2 py-1 rounded inline-block">{meta.icon}</span>
  <div class="flex-1">
    {#if column.user_facing_label}
      <span class="font-medium">{column.user_facing_label}</span>
      {#if column.column_name}
        <code>[{column.column_name}]</code>
      {/if}
    {:else if column.column_name}
      <span class="font-medium">{column.column_name}</span>
    {:else}
      <code>Unnamed {meta.label} field</code>
    {/if}
    {#if column.is_new}
      <button on:click={() => moveColumnUp(column)}>↑</button>
      <button on:click={() => moveColumnDown(column)}>↓</button>
    {/if}
  </div>
</li>
