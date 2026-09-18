<script>
  let { object } = $props();

  function display(value) {
    if (value === null) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
</script>

{#if Object.keys(object.stats).length === 0}
  <span class="text-body-secondary small">None</span>
{:else}
  <dl class="row row-cols-1 row-cols-sm-2 g-1 mb-0 small">
    {#each Object.entries(object.stats) as [name, value] (name)}
      <div class="col d-flex gap-2"><dt class="fw-medium">{name}</dt><dd class="mb-0 text-break">{display(value)}</dd></div>
    {/each}
  </dl>
{/if}
