<script>
  let { game } = $props();
</script>

<section class="card" aria-labelledby="dice-heading">
  <div class="card-body py-3">
    <h2 id="dice-heading" class="h6 text-body-secondary mb-1">Latest roll</h2>
    {#if game.lastRoll}
      <div><strong class="fs-4">{game.lastRoll.total}</strong> <span class="small text-body-secondary">({game.lastRoll.rolls.join(' + ')}{game.lastRoll.modifier ? ` ${game.lastRoll.modifier < 0 ? '-' : '+'} ${Math.abs(game.lastRoll.modifier)}` : ''})</span></div>
    {:else}
      <span class="text-body-secondary small">No roll yet · {game.dice.count}d{game.dice.sides}</span>
    {/if}
  </div>
</section>
