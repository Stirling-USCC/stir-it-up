<script>
  let { game } = $props();
</script>

<section class="game-status mb-3" aria-labelledby="game-status-heading">
  <h2 id="game-status-heading" class="visually-hidden">Game status</h2>
  <p class="mb-0 small d-flex flex-wrap align-items-center gap-2" aria-live="polite">
    <span class={`badge ${game.status === 'playing' ? 'text-bg-success' : 'text-bg-secondary'}`}>{game.status}</span>
    {#if game.turn.number > 0}
      <span>Turn {game.turn.number}</span>
      {#if game.getCurrentPlayer()}<span aria-hidden="true">·</span><span>{game.getCurrentPlayer().name}</span>{/if}
      <span aria-hidden="true">·</span><span class="text-capitalize">{game.turn.phase}</span>
    {:else}
      <span class="text-body-secondary">{game.players.length ? 'Ready to start' : 'Add a player to start'}</span>
    {/if}
  </p>
</section>
