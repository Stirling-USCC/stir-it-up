<script>
  import { onMount } from 'svelte';
  import GameView from '$lib/components/GameView.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  import { createShowcaseGame } from '$lib/game/createShowcaseGame.svelte.js';

  // The main game view stays shared. Only this route's example content changes.
  const { game, populate } = createShowcaseGame();
  onMount(() => { populate(); });
</script>

<svelte:head><title>Stir it Up! · Interactive showcase</title></svelte:head>

<div class="container-xxl py-3 py-md-4">
  <header class="mb-3">
    <h1 class="h3 mb-0">Stir it Up! <small class="text-body-secondary fs-6">Interactive showcase</small></h1>
    <p class="small text-body-secondary mb-0">Start the game, then try Walk 6 → Jump to Cabbages → Jump to Lab → Walk to Tea. Draw, play, and discard cards; inspect the player stats and Event Log as hooks run.</p>
  </header>
  <GameView {game} />
</div>
<Toasts {game} />
