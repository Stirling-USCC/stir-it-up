<script>
  let { object } = $props();

  function display(value) {
    if (value === null) return 'null';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }
</script>

{#if Object.keys(object.stats).length > 0}
  <dl class="row g-1 mb-0 small">
    {#each Object.entries(object.stats) as [name, value] (name)}
      <dt class="col-12 col-sm-7 fw-medium text-break">{name}</dt>
      <dd class="col-12 col-sm-5 mb-0 text-break">{display(value)}</dd>
    {/each}
  </dl>
{/if}
