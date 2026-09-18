<script>
  import { tooltip } from './tooltip.js';

  let { player } = $props();

  function display(value) {
    if (value === null) return 'null';
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
  }

  function effectInformation(effect) {
    const stats = Object.entries(effect.stats).map(([name, value]) => `${name}: ${display(value)}`);
    return [effect.description, effect.duration !== null ? `Duration: ${effect.duration}` : '', ...stats].filter(Boolean).join(' · ') || effect.name;
  }

  function effectAccessibleName(effect) {
    const information = effectInformation(effect);
    return information === effect.name ? effect.name : `${effect.name}. ${information}`;
  }
</script>

<div class="accordion-body player-details small">
  {#if player.effects.length > 0}
    <section aria-label="Effects" class="d-flex flex-wrap gap-1 mb-2">
      {#each player.effects as effect (effect.id)}
        <button type="button" class="effect-pill badge rounded-pill border text-body"
          aria-label={effectAccessibleName(effect)}
          use:tooltip={effectInformation(effect)}>
          {effect.name}{#if effect.duration !== null}<span aria-hidden="true">{' · '}{effect.duration}</span>{/if}
        </button>
      {/each}
    </section>
  {/if}
  {#if Object.keys(player.stats).length > 0}
    <dl class="compact-stats mb-2" aria-label="Stats">
      {#each Object.entries(player.stats) as [name, value] (name)}
        <div class="stat-pair"><dt>{name}</dt><dd>{display(value)}</dd></div>
      {/each}
    </dl>
  {/if}
  {#if player.inventory.length > 0}
    <p class="small text-body-secondary mb-0">Inventory <span class="badge text-bg-light border">{player.inventory.length}</span></p>
  {/if}
</div>
