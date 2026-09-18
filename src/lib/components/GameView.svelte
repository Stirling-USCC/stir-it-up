<script>
  import ActionPanel from './ActionPanel.svelte';
  import Board from './Board.svelte';
  import DetailTabs from './DetailTabs.svelte';
  import DiceDisplay from './DiceDisplay.svelte';
  import GameStatus from './GameStatus.svelte';
  import PlayerList from './PlayerList.svelte';
  import PlayerRoster from './PlayerRoster.svelte';

  let { game } = $props();
  let selectedPlayerId = $state(null);
  let activeDetailTab = $state('inventory');

  // Start each turn by inspecting its current player. A person can then inspect
  // someone else without changing whose turn it is.
  $effect(() => {
    selectedPlayerId = game.turn.currentPlayerId;
  });
</script>

<GameStatus {game} />
<main class="row g-3">
  <div class="col-12 col-xl-9">
    <Board {game} />
    <DetailTabs {game} {selectedPlayerId} activeTab={activeDetailTab} onselecttab={(tab) => activeDetailTab = tab} />
  </div>
  <aside class="col-12 col-xl-3" aria-label="Game controls and players">
    <div class="d-grid gap-3">
      {#if game.status === 'waiting'}<PlayerRoster {game} />{:else}<ActionPanel {game} />{/if}
      <DiceDisplay {game} />
      {#if game.status !== 'waiting'}
        <PlayerList {game} {selectedPlayerId} onselect={(id) => selectedPlayerId = id} oninventory={() => activeDetailTab = 'inventory'} />
      {/if}
    </div>
  </aside>
</main>
