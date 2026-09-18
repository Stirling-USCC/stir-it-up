<script>
  let { game } = $props();
</script>

<section class="card mb-3" aria-label="Game status">
  <div class="card-body py-2 d-flex flex-wrap align-items-center gap-2 gap-md-3 small" aria-live="polite" aria-atomic="true">
    <span><span class="text-body-secondary">Status</span> <span class={`badge ${game.status === 'playing' ? 'text-bg-success' : 'text-bg-secondary'}`}>{game.status}</span></span>
    <span><span class="text-body-secondary">Turn</span> <strong>{game.turn.number || '—'}</strong></span>
    <span><span class="text-body-secondary">Current player</span> <strong>{game.getCurrentPlayer()?.name ?? '—'}</strong></span>
    <span><span class="text-body-secondary">Phase</span> <strong class="text-capitalize">{game.status === 'waiting' ? '—' : game.turn.phase}</strong></span>
  </div>
</section>
