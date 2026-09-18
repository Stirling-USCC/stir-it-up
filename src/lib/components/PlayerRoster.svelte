<script>
  let { game } = $props();
  let error = $state('');

  async function run(command) {
    error = '';
    try { await command(); }
    catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  }

  async function rename(player, input) {
    await run(() => player.rename(input.value));
    input.value = player.name;
  }
</script>

<section class="card" aria-labelledby="roster-heading">
  <div class="card-body py-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h2 id="roster-heading" class="h5 mb-0">Players</h2>
      <span class="badge text-bg-light border">{game.players.length} / 8</span>
    </div>
    <p class="small text-body-secondary mb-3">Add players, change names if you like, then start the game.</p>
    {#each game.players as player (player.id)}
      <div class="roster-row mb-2">
        <span class="roster-token" style={`--token-colour:${player.colour}`} aria-label={`Player ${player.number} colour preview`}>{player.number}</span>
        <div class="flex-grow-1">
          <label class="form-label small mb-1" for={`name-${player.id}`}>Player {player.number} name</label>
          <input id={`name-${player.id}`} class="form-control form-control-sm" value={player.name}
            onchange={(event) => rename(player, event.currentTarget)} />
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm align-self-end" aria-label={`Remove player ${player.number}, ${player.name}`}
          onclick={() => run(() => game.removePlayer(player))}>Remove</button>
      </div>
    {/each}
    <div class="d-flex gap-2 mt-3">
      <button type="button" class="btn btn-outline-primary" disabled={game.players.length >= 8}
        onclick={() => run(() => game.addPlayer())}>Add player</button>
      <button type="button" class="btn btn-primary" disabled={game.players.length === 0}
        onclick={() => run(() => game.startGame())}>Start game</button>
    </div>
    {#if error}<div class="alert alert-danger mt-3 mb-0" role="alert">{error}</div>{/if}
  </div>
</section>
