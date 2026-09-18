<script>
  import StatsList from './StatsList.svelte';
  let { game } = $props();
  let visibleDecks = $derived(game.decks.filter((deck) =>
    deck.cards.length > 0 ||
    deck.drawPile.length > 0 ||
    deck.discardPile.length > 0 ||
    Object.keys(deck.stats).length > 0
  ));
</script>

{#if visibleDecks.length > 0}
<div class="deck-grid">
    {#each visibleDecks as deck (deck.id)}
      <details class="border rounded p-2 small">
        <summary>{deck.name}</summary>
        {#if deck.cards.length > 0 || deck.drawPile.length > 0 || deck.discardPile.length > 0}
          <dl class="row g-1 mt-2 mb-2">
            <dt class="col-12 col-sm-7">To draw</dt><dd class="col-12 col-sm-5 mb-0">{deck.drawPile.length}</dd>
            <dt class="col-12 col-sm-7">Discarded</dt><dd class="col-12 col-sm-5 mb-0">{deck.discardPile.length}</dd>
          </dl>
        {/if}
        {#if Object.keys(deck.stats).length > 0}
          <div class="mt-2"><h3 class="h6 mb-1">Stats</h3><StatsList object={deck} /></div>
        {/if}
        {#if deck.cards.length > 0}
          <div class="mt-2"><h3 class="h6 mb-1">Cards</h3>
            {#each deck.cards as card (card.id)}
              {#if card.description || Object.keys(card.stats).length > 0}
                <details class="ms-2 my-1">
                  <summary>{card.name}</summary>
                  {#if card.description}<p class="mb-1 mt-2">{card.description}</p>{/if}
                  {#if Object.keys(card.stats).length > 0}<div class="mt-2"><StatsList object={card} /></div>{/if}
                </details>
              {:else}
                <div class="ms-2 my-1">{card.name}</div>
              {/if}
            {/each}
          </div>
        {/if}
      </details>
    {/each}
  </div>
{:else}
  <p class="small text-body-secondary mb-0">No decks</p>
{/if}
