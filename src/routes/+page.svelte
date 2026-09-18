<script>
  import { createGame } from '$lib/game/createGame.js';
  import ActionPanel from '$lib/components/ActionPanel.svelte';
  import Board from '$lib/components/Board.svelte';
  import DeckList from '$lib/components/DeckList.svelte';
  import DiceDisplay from '$lib/components/DiceDisplay.svelte';
  import GameLog from '$lib/components/GameLog.svelte';
  import GameStatus from '$lib/components/GameStatus.svelte';
  import PlayerList from '$lib/components/PlayerList.svelte';
  import Toasts from '$lib/components/Toasts.svelte';

  // A fresh local session for each page instance also keeps server-side rendering safe.
  const game = createGame();
</script>

<svelte:head>
  <title>Stir It Up · Board-game engine</title>
  <meta name="description" content="A board-game project for the University of Stirling Computing Club." />
</svelte:head>

<div class="container-xxl py-3 py-md-4">
  <header class="mb-3">
    <div class="d-flex align-items-center gap-2">
      <span class="fs-3" aria-hidden="true">🎲</span>
      <div><h1 class="h3 mb-0">Stir It Up</h1><p class="text-body-secondary small mb-0">University of Stirling Computing Club</p></div>
    </div>
  </header>
  <GameStatus {game} />
  <main class="row g-3">
    <div class="col-12 col-lg-8"><Board {game} /></div>
    <div class="col-12 col-lg-4">
      <div class="d-grid gap-3">
        <ActionPanel {game} />
        <DiceDisplay {game} />
        <PlayerList {game} />
        <DeckList {game} />
        <GameLog {game} />
      </div>
    </div>
  </main>
</div>
<Toasts {game} />
