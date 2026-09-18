<script>
  import StatsList from './StatsList.svelte';
  let { game } = $props();
</script>

{#if game.decks.length > 0}
<section class="card" aria-labelledby="decks-heading">
  <div class="card-body py-3">
    <h2 id="decks-heading" class="h6 mb-2">Decks</h2>
    {#each game.decks as deck (deck.id)}
      <details class="border rounded p-2 small mb-1">
        <summary>{deck.name} <span class="text-body-secondary">· {deck.drawPile.length} to draw, {deck.discardPile.length} discarded</span></summary>
        <div class="mt-2"><strong>Stats</strong> <StatsList object={deck} /></div>
        {#if deck.cards.length > 0}
          <div class="mt-2"><strong>Cards</strong>
            {#each deck.cards as card (card.id)}
              <details class="ms-2 my-1"><summary>{card.name}</summary><p class="mb-1">{card.description}</p><StatsList object={card} /></details>
            {/each}
          </div>
        {/if}
      </details>
    {/each}
  </div>
</section>
{/if}
