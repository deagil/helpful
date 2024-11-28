<script lang="ts">
  import { createEventDispatcher } from "svelte"
  export let column
  export let selectedColumn

  const dispatch = createEventDispatcher()

  function handleClick() {
    dispatch("selectColumn", column)
  }
</script>

<li
  class="p-2 mb-2 border rounded cursor-move {selectedColumn &&
  selectedColumn.id === column.id
    ? 'bg-gray-200'
    : ''}"
  on:click={handleClick}
>
  <span class="font-medium">{column.column_label ?? ""}</span>
  <code>{column.column_name ? `[${column.column_name}]` : ""}</code>
  <code
    >{!column.column_name && !column.column_label
      ? `Unnamed ${column.data_type} field`
      : ""}</code
  >
</li>
