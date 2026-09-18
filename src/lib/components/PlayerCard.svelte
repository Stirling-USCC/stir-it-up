<script>
  import StatsList from './StatsList.svelte';
  let { player, game } = $props();
</script>

<div class="accordion-body small">
  <dl class="row g-1 mb-3">
    <dt class="col-12 col-sm-7 text-body-secondary">Position</dt>
    <dd class="col-12 col-sm-5 mb-0 text-break">{player.position + 1}{#if game.board.squares.length > 0}{' · '}{game.board.getSquare(player.position)?.name}{/if}</dd>
    <dt class="col-12 col-sm-7 text-body-secondary">State</dt>
    <dd class="col-12 col-sm-5 mb-0">{player.active ? 'Active' : 'Inactive'}</dd>
  </dl>
  {#if Object.keys(player.stats).length > 0}
    <section class="mb-3" aria-label="Stats"><h4 class="h6 mb-1">Stats</h4><StatsList object={player} /></section>
  {/if}
  {#if player.inventory.length > 0}
    <section class="mb-3" aria-label="Inventory">
      <h4 class="h6 mb-1">Inventory <span class="badge text-bg-light border">{player.inventory.length}</span></h4>
      {#each player.inventory as item (item.id)}
        {#if item.description || Object.keys(item.stats).length > 0}
          <details class="border rounded p-2 mb-1">
            <summary>{item.name}</summary>
            {#if item.description}<p class="mb-1 mt-2">{item.description}</p>{/if}
            {#if Object.keys(item.stats).length > 0}<div class="mt-2"><StatsList object={item} /></div>{/if}
          </details>
        {:else}
          <div class="border rounded p-2 mb-1">{item.name}</div>
        {/if}
      {/each}
    </section>
  {/if}
  {#if player.effects.length > 0}
    <section aria-label="Effects">
      <h4 class="h6 mb-1">Effects <span class="badge text-bg-light border">{player.effects.length}</span></h4>
      {#each player.effects as effect (effect.id)}
        {#if effect.description || effect.duration !== null || Object.keys(effect.stats).length > 0}
          <details class="border rounded p-2 mb-1">
            <summary>{effect.name}</summary>
            {#if effect.description}<p class="mb-1 mt-2">{effect.description}</p>{/if}
            {#if effect.duration !== null}
              <dl class="row g-1 mb-1 mt-2"><dt class="col-12 col-sm-7">Duration</dt><dd class="col-12 col-sm-5 mb-0">{effect.duration}</dd></dl>
            {/if}
            {#if Object.keys(effect.stats).length > 0}<div class="mt-2"><StatsList object={effect} /></div>{/if}
          </details>
        {:else}
          <div class="border rounded p-2 mb-1">{effect.name}</div>
        {/if}
      {/each}
    </section>
  {/if}
</div>
