<script>
  import { createGame } from '$lib/game/createGame.js';
  import GameView from '$lib/components/GameView.svelte';
  import Toasts from '$lib/components/Toasts.svelte';

  // A fresh local session for each page instance also keeps server-side rendering safe.
  let game = $state(createGame());

  function newGame() {
    game = createGame();
  }
</script>

<svelte:head>
  <title>Stir it Up! · Board game playground</title>
  <meta name="description" content="A board-game project for the University of Stirling Computing Club." />
</svelte:head>

<div class="container-xxl py-3 py-md-4">
  <header class="mb-3 d-flex align-items-center justify-content-between gap-3">
    <div class="d-flex align-items-center gap-2">
      <span class="fs-3" aria-hidden="true">🎲</span>
      <div><h1 class="h3 mb-0">Stir it Up!</h1><p class="text-body-secondary small mb-0">University of Stirling Computing Club</p></div>
    </div>
    <button type="button" class="btn btn-outline-secondary btn-sm" onclick={newGame}>New game</button>
  </header>
  {#key game}<GameView {game} />{/key}
</div>
{#key game}<Toasts {game} />{/key}
