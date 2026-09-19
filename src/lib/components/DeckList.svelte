<script>
  import StatsList from './StatsList.svelte';
  let { game } = $props();
  let error = $state('');
  let busy = $state(false);
  let visibleDecks = $derived(game.decks.filter((deck) =>
    deck.cards.length > 0 ||
    deck.drawPile.length > 0 ||
    deck.discardPile.length > 0 ||
    Object.keys(deck.stats).length > 0
  ));

  async function draw(deck) {
    busy = true;
    error = '';
    try { await game.drawCard(deck); }
    catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
    finally { busy = false; }
  }
</script>

{#if visibleDecks.length > 0}
<div class="deck-grid">
    {#each visibleDecks as deck (deck.id)}
      <details class="border rounded p-2 small">
        <summary>{deck.name}</summary>
        {#if game.status === 'playing' && game.getCurrentPlayer() && deck.drawPile.length > 0}
          <button type="button" class="btn btn-outline-primary btn-sm mt-2" disabled={busy} onclick={() => draw(deck)}>Draw</button>
        {/if}
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
  {#if error}<div class="alert alert-danger mt-2 mb-0" role="alert">{error}</div>{/if}
{:else}
  <p class="small text-body-secondary mb-0">No decks</p>
{/if}
