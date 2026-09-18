<script>
  let { game } = $props();
</script>

<section class="card mb-3" aria-label="Game status">
  <div class="card-body py-2" aria-live="polite">
    <dl class="row g-1 mb-0 small">
      <dt class="col-12 col-sm-4 text-body-secondary">Status</dt>
      <dd class="col-12 col-sm-2 mb-0"><span class={`badge ${game.status === 'playing' ? 'text-bg-success' : 'text-bg-secondary'}`}>{game.status}</span></dd>
      {#if game.turn.number > 0}
        <dt class="col-12 col-sm-4 text-body-secondary">Turn</dt>
        <dd class="col-12 col-sm-2 mb-0">{game.turn.number}</dd>
      {/if}
      {#if game.getCurrentPlayer()}
        <dt class="col-12 col-sm-4 text-body-secondary">Current player</dt>
        <dd class="col-12 col-sm-2 mb-0 text-break">{game.getCurrentPlayer().name}</dd>
      {/if}
      {#if game.status !== 'waiting'}
        <dt class="col-12 col-sm-4 text-body-secondary">Phase</dt>
        <dd class="col-12 col-sm-2 mb-0 text-capitalize">{game.turn.phase}</dd>
      {/if}
    </dl>
  </div>
</section>
