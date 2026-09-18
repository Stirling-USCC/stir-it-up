<script>
  let { game } = $props();
</script>

{#if game.lastRoll}
<section class="card" aria-label="Dice result">
  <div class="card-body py-3">
    <dl class="row g-1 mb-0">
      <dt class="col-12 col-sm-7 text-body-secondary">Latest roll</dt>
      <dd class="col-12 col-sm-5 mb-0"><strong class="fs-4">{game.lastRoll.total}</strong> <span class="small text-body-secondary">({game.lastRoll.rolls.join(' + ')}{game.lastRoll.modifier ? ` ${game.lastRoll.modifier < 0 ? '-' : '+'} ${Math.abs(game.lastRoll.modifier)}` : ''})</span></dd>
    </dl>
  </div>
</section>
{/if}
