<script>
  import StatsList from './StatsList.svelte';

  let { game, player } = $props();
  let error = $state('');
  let busy = $state(false);
  let canUseCards = $derived(game.status === 'playing' && game.turn.currentPlayerId === player?.id);

  async function run(command) {
    busy = true;
    error = '';
    try { await command(); }
    catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
    finally { busy = false; }
  }
</script>

{#if player}
  <h3 class="h6 mb-2">{player.name}'s Cards</h3>
  {#if player.hand.length > 0}
    <div class="inventory-grid">
      {#each player.hand as card (card.id)}
        <article class="inventory-item border rounded p-2 small">
          <h4 class="h6 mb-1">{#if card.icon}<span aria-hidden="true">{card.icon} </span>{/if}{card.name}</h4>
          {#if card.description}<p class="mb-1">{card.description}</p>{/if}
          <StatsList object={card} />
          {#if canUseCards}
            <div class="d-flex flex-wrap gap-2 mt-2">
              <button type="button" class="btn btn-primary btn-sm" disabled={busy} onclick={() => run(() => game.playCard(card, player))}>Play</button>
              <button type="button" class="btn btn-outline-secondary btn-sm" disabled={busy} onclick={() => run(() => game.discardCard(card, player))}>Discard</button>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {:else}
    <p class="text-body-secondary small mb-0">No cards</p>
  {/if}
  {#if error}<div class="alert alert-danger mt-2 mb-0" role="alert">{error}</div>{/if}
{:else}
  <p class="text-body-secondary small mb-0">Select a player to view their cards.</p>
{/if}
