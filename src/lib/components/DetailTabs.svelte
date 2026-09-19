<script>
  import DeckList from './DeckList.svelte';
  import GameLog from './GameLog.svelte';
  import PlayerHand from './PlayerHand.svelte';
  import StatsList from './StatsList.svelte';

  let { game, selectedPlayerId, activeTab, onselecttab } = $props();
  let selectedPlayer = $derived(game.players.find((player) => player.id === selectedPlayerId));
  const tabs = [
    { id: 'inventory', label: 'Inventory' },
    { id: 'cards', label: 'Cards' },
    { id: 'decks', label: 'Decks' },
    { id: 'log', label: 'Event Log' }
  ];

  function onTabKeydown(event, index) {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    let nextIndex;
    if (direction) nextIndex = (index + direction + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    onselecttab(tabs[nextIndex].id);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
  }
</script>

<section class="detail-area mt-3" aria-labelledby="details-heading">
  <h2 id="details-heading" class="visually-hidden">Game details</h2>
  <div class="nav nav-tabs" role="tablist" aria-label="Game details">
    {#each tabs as tab, index (tab.id)}
      <button type="button" role="tab" id={`detail-tab-${tab.id}`}
        class:active={activeTab === tab.id} class="nav-link"
        aria-selected={activeTab === tab.id} aria-controls={`detail-panel-${tab.id}`}
        tabindex={activeTab === tab.id ? 0 : -1}
        onclick={() => onselecttab(tab.id)} onkeydown={(event) => onTabKeydown(event, index)}>{tab.label}</button>
    {/each}
  </div>
  <div class="detail-panel border border-top-0 rounded-bottom p-3">
    <div id="detail-panel-inventory" role="tabpanel" aria-labelledby="detail-tab-inventory" tabindex="0" hidden={activeTab !== 'inventory'}>
      {#if selectedPlayer}
        <h3 class="h6 mb-2">{selectedPlayer.name}'s Inventory</h3>
        {#if selectedPlayer.inventory.length > 0}
          <div class="inventory-grid">
            {#each selectedPlayer.inventory as item (item.id)}
              <article class="inventory-item border rounded p-2 small">
                <h4 class="h6 mb-1">{item.name}</h4>
                {#if item.description}<p class="mb-1">{item.description}</p>{/if}
                <StatsList object={item} />
              </article>
            {/each}
          </div>
        {:else}
          <p class="text-body-secondary small mb-0">No items</p>
        {/if}
      {:else}
        <p class="text-body-secondary small mb-0">Select a player to view their inventory.</p>
      {/if}
    </div>
    <div id="detail-panel-cards" role="tabpanel" aria-labelledby="detail-tab-cards" tabindex="0" hidden={activeTab !== 'cards'}>
      <PlayerHand {game} player={selectedPlayer} />
    </div>
    <div id="detail-panel-decks" role="tabpanel" aria-labelledby="detail-tab-decks" tabindex="0" hidden={activeTab !== 'decks'}>
      <h3 class="visually-hidden">Decks</h3>
      <DeckList {game} />
    </div>
    <div id="detail-panel-log" role="tabpanel" aria-labelledby="detail-tab-log" tabindex="0" hidden={activeTab !== 'log'}>
      <h3 class="visually-hidden">Event Log</h3>
      <GameLog {game} />
    </div>
  </div>
</section>
