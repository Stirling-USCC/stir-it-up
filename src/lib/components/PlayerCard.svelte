<script>
  import StatsList from './StatsList.svelte';
  let { player, game } = $props();
</script>

<div class="accordion-body small">
  <div class="d-flex flex-wrap gap-3 mb-3">
    <div><span class="text-body-secondary">Position</span> <strong>{player.position + 1}</strong> <span class="text-body-secondary">({game.board.getSquare(player.position)?.name})</span></div>
    <div><span class="text-body-secondary">State</span> <strong>{player.active ? 'Active' : 'Eliminated'}</strong></div>
  </div>
  <div class="mb-3"><h4 class="h6 mb-1">Stats</h4><StatsList object={player} /></div>
  <div class="mb-2">
    <h4 class="h6 mb-1">Inventory <span class="badge text-bg-light border">{player.inventory.length}</span></h4>
    {#if player.inventory.length === 0}<span class="text-body-secondary">Empty</span>{/if}
    {#each player.inventory as item (item.id)}
      <details class="border rounded p-2 mb-1"><summary>{item.name}</summary><p class="mb-1 mt-2">{item.description}</p><StatsList object={item} /></details>
    {/each}
  </div>
  <div>
    <h4 class="h6 mb-1">Effects <span class="badge text-bg-light border">{player.effects.length}</span></h4>
    {#if player.effects.length === 0}<span class="text-body-secondary">None</span>{/if}
    {#each player.effects as effect (effect.id)}
      <details class="border rounded p-2 mb-1"><summary>{effect.name}</summary><p class="mb-1 mt-2">{effect.description}</p>{#if effect.duration !== null}<p class="mb-1">Duration: {effect.duration}</p>{/if}<StatsList object={effect} /></details>
    {/each}
  </div>
</div>
