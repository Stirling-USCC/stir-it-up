<script>
  let { game } = $props();
  let busy = $state(false);
  let error = $state('');
  let availableActions = $derived(game.getAvailableActions());

  async function run(action) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await action.perform(game, game.getCurrentPlayer());
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }
</script>

<section aria-labelledby="actions-heading" class="card">
  <div class="card-body">
    <h2 id="actions-heading" class="h5 card-title">Actions</h2>
    <div class="d-flex flex-wrap gap-2">
      {#each availableActions as action (action.id)}
        <button type="button" class="btn btn-primary" disabled={busy} title={action.description || action.label} onclick={() => run(action)}>
          {#if action.icon}<i class={`bi ${action.icon} me-1`} aria-hidden="true"></i>{/if}{action.label}
        </button>
      {:else}
        <span class="text-body-secondary small">No actions available.</span>
      {/each}
    </div>
    {#if error}<div class="alert alert-danger mt-3 mb-0" role="alert">{error}</div>{/if}
  </div>
</section>
