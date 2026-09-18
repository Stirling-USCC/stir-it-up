<script>
  let { game } = $props();
</script>

{#if game.log.length > 0}
  <ol class="list-group list-group-flush log-list small" aria-label="Game events, newest first">
    {#each game.log.slice().reverse() as entry (entry.id)}
      <li class="list-group-item px-0 py-1"><span class="text-body-secondary me-2">{entry.sequence}.</span>{entry.message}</li>
    {/each}
  </ol>
{:else}
  <p class="small text-body-secondary mb-0">No events</p>
{/if}
