<script>
  let { game } = $props();
</script>

{#if game.log.length > 0}
<section class="card" aria-labelledby="log-heading">
  <div class="card-body py-3">
    <h2 id="log-heading" class="h6 mb-2">Event log</h2>
    <ol class="list-group list-group-flush log-list small" aria-label="Game events, newest first">
      {#each game.log.slice().reverse() as entry (entry.id)}
        <li class="list-group-item px-0 py-1"><span class="text-body-secondary me-2">{entry.sequence}.</span>{entry.message}</li>
      {/each}
    </ol>
  </div>
</section>
{/if}
