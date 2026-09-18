<script>
  import { tokenPositions } from './tokenPositions.js';
  import { tooltip } from './tooltip.js';
  let { square, players, currentPlayerId, tabindex, onfocus, onKeydown, cellStyle } = $props();
  let orderedPlayers = $derived([...players].sort((a, b) => a.number - b.number));
  let positions = $derived(tokenPositions(orderedPlayers.length));
  function displayStat(value) {
    if (value === null) return 'null';
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
  }
  let statSummary = $derived(Object.entries(square.stats).map(([name, value]) => `${name}: ${displayStat(value)}`).join('; '));
  let information = $derived(`${square.name === `Square ${square.position + 1}` ? square.name : `Square ${square.position + 1}: ${square.name}`}${square.description ? `. ${square.description}` : ''}${statSummary ? `. ${statSummary}` : ''}`);
  let accessibleName = $derived(`${information}${orderedPlayers.length ? `. Occupied by ${orderedPlayers.map((player) => `Player ${player.number}, ${player.name}${player.id === currentPlayerId ? ', current player' : ''}`).join('; ')}` : ''}`);
</script>

<button type="button" class={`board-cell ${square.className}`} data-square-id={square.id}
  {tabindex} {onfocus} onkeydown={onKeydown} use:tooltip={information} aria-label={accessibleName}
  style={`${cellStyle};${square.colour ? `--square-colour:${square.colour};` : ''}`}>
  <span class="square-number" aria-hidden="true">{square.position + 1}</span>
  {#if square.icon}<span class="square-icon" aria-hidden="true">{square.icon}</span>{/if}
  {#each orderedPlayers as player, index (player.id)}
    <span class:current-token={player.id === currentPlayerId} class="piece-counter" role="img"
      aria-label={`Player ${player.number}, ${player.name}${player.id === currentPlayerId ? ', current player' : ''}`}
      title={`Player ${player.number}, ${player.name}`}
      style={`--token-colour:${player.colour};left:${positions[index].x * 100}%;top:${positions[index].y * 100}%`}>{player.number}</span>
  {/each}
</button>
