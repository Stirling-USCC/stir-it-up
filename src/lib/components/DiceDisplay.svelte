<script>
  import Die from './Die.svelte';
  let { game } = $props();
</script>

{#if game.dice.length > 0}
<section class="card" aria-labelledby="dice-heading">
  <div class="card-body py-3">
    <div class="d-flex justify-content-between align-items-baseline mb-2">
      <h2 id="dice-heading" class="h6 mb-0">Dice</h2>
      {#if game.lastRoll}<span class="small text-body-secondary">Latest total: {game.lastRoll.total}</span>{/if}
    </div>
    <div class="d-flex gap-2 flex-wrap">
      {#each game.dice as die (die.id)}
        <Die {die} value={game.lastRoll?.results.find((result) => result.die.id === die.id)?.value} />
      {/each}
    </div>
  </div>
</section>
{/if}
