<script>
  import StatsList from './StatsList.svelte';
  let { square, players, currentPlayerId } = $props();
</script>

<article class={`card board-square h-100 ${square.className}`} aria-label={`${square.name}, position ${square.position + 1}${players.length ? `, occupied by ${players.map((player) => player.name).join(' and ')}` : ', empty'}`}>
  <div class="card-body p-2 d-flex flex-column">
    <div class="d-flex justify-content-between align-items-start gap-1">
      <span class="small text-body-secondary">#{square.position + 1}</span>
      {#if square.icon}<span aria-hidden="true" class="text-body-tertiary">{square.icon}</span>{/if}
    </div>
    <h3 class="h6 mb-1 text-truncate" title={square.name}>{square.name}</h3>
    {#if square.description}<p class="small text-body-secondary mb-2">{square.description}</p>{/if}
    {#if Object.keys(square.stats).length > 0}<div class="mb-2"><StatsList object={square} /></div>{/if}
    <div class="mt-auto d-flex flex-wrap gap-1">
      {#each players as player (player.id)}
        <span class={`badge piece-badge ${player.className || 'text-bg-secondary'}`} title={`${player.name}${player.id === currentPlayerId ? ', current player' : ''}`}>
          <span aria-hidden="true">{player.icon}</span> {player.name}{player.id === currentPlayerId ? ' · current' : ''}
        </span>
      {/each}
    </div>
  </div>
</article>
