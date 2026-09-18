<script>
  import Square from './Square.svelte';
  let { game } = $props();
</script>

<section aria-labelledby="board-heading">
  <h2 id="board-heading" class="h5 mb-2">Board</h2>
  <div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-xl-4 g-2">
    {#each game.board.squares as square (square.id)}
      <div class="col"><Square {square} players={game.players.filter((player) => player.position === square.position)} currentPlayerId={game.turn.currentPlayerId} /></div>
    {/each}
  </div>
</section>
