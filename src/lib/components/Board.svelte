<script>
  import Square from './Square.svelte';
  import { activeSquareId, findSquareInDirection } from './boardNavigation.js';
  let { game } = $props();
  let boardElement = $state();
  let focusedId = $state(null);
  let tabbableSquareId = $derived(activeSquareId(game.board.squares, focusedId));
  let layout = $derived.by(() => {
    const coordinates = game.board.squares.map((square) => square.coordinates);
    const minX = Math.floor(Math.min(...coordinates.map((point) => point.x)));
    const minY = Math.floor(Math.min(...coordinates.map((point) => point.y)));
    return {
      minX, minY,
      columns: Math.ceil(Math.max(...coordinates.map((point) => point.x)) - minX) + 1,
      rows: Math.ceil(Math.max(...coordinates.map((point) => point.y)) - minY) + 1
    };
  });

  function focusSquare(square) {
    if (!square) return;
    focusedId = square.id;
    boardElement?.querySelectorAll('.board-cell').forEach((button) => {
      if (button.dataset.squareId === square.id) button.focus();
    });
  }

  function onKeydown(event) {
    const button = event.target.closest?.('.board-cell');
    if (!button || !boardElement?.contains(button)) return;
    const current = game.board.getSquareById(button.dataset.squareId);
    const directions = {
      ArrowRight: { x: 1, y: 0 }, ArrowLeft: { x: -1, y: 0 },
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }
    };
    let next;
    if (event.key === 'Home') next = game.board.squares[0];
    else if (event.key === 'End') next = game.board.squares.at(-1);
    else if (directions[event.key]) next = findSquareInDirection(game.board.squares, current, directions[event.key]);
    else return;
    event.preventDefault();
    focusSquare(next);
  }
</script>

{#if game.board.squares.length > 0}
  <section aria-labelledby="board-heading" class="board-section">
    <div class="d-flex justify-content-between align-items-baseline mb-2">
      <h2 id="board-heading" class="visually-hidden">Board</h2>
      <span class="small text-body-secondary">Arrow keys to explore · Home / End</span>
    </div>
    <div class="board-surface" role="group" aria-label="Board squares" bind:this={boardElement}
      style={`--board-columns:${layout.columns}; --board-rows:${layout.rows}`}>
      {#each game.board.squares as square (square.id)}
        {@const x = square.coordinates.x - layout.minX}
        {@const y = square.coordinates.y - layout.minY}
        <Square {square} players={game.players.filter((player) => player.position === square.position)}
          currentPlayerId={game.turn.currentPlayerId} tabindex={tabbableSquareId === square.id ? 0 : -1}
          onfocus={() => focusedId = square.id} {onKeydown}
          cellStyle={`grid-column:${Math.floor(x) + 1};grid-row:${Math.floor(y) + 1};translate:${(x % 1) * 100}% ${(y % 1) * 100}%`} />
      {/each}
    </div>
  </section>
{/if}
