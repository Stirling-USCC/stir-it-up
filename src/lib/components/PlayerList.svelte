<script>
  import PlayerCard from './PlayerCard.svelte';
  let { game } = $props();
  let openPlayerId = $state('auto');
  let selectedPlayerId = $derived(openPlayerId === 'auto' ? (game.turn.currentPlayerId ?? game.players[0]?.id) : openPlayerId);

  $effect(() => {
    game.turn.currentPlayerId;
    openPlayerId = 'auto';
  });
</script>

{#if game.players.length > 0}
<section aria-labelledby="players-heading">
  <h2 id="players-heading" class="h5 mb-2">Players</h2>
  <div class="accordion" id="players-accordion">
    {#each game.players as player (player.id)}
      {@const expanded = selectedPlayerId === player.id}
      <div class="accordion-item">
        <h3 class="accordion-header">
          <button type="button" class:collapsed={!expanded} class="accordion-button py-2" aria-expanded={expanded} aria-controls={`player-panel-${player.id}`} onclick={() => openPlayerId = expanded ? null : player.id}>
            <span class="roster-token me-2" style={`--token-colour:${player.colour}`} aria-hidden="true">{player.number}</span>
            <span>Player {player.number}: {player.name}</span>
            {#if game.turn.currentPlayerId === player.id}<span class="badge text-bg-primary ms-2">Current</span>{/if}
            <span class="small text-body-secondary ms-auto me-2">#{player.position + 1}</span>
          </button>
        </h3>
        <div id={`player-panel-${player.id}`} class:show={expanded} class="accordion-collapse collapse" role="region" aria-label={`${player.name} details`}>
          <PlayerCard {player} {game} />
        </div>
      </div>
    {/each}
  </div>
</section>
{/if}
