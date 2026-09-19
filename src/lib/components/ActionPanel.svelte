<script>
  import { actionClasses } from './actionPresentation.js';
  let { game } = $props();
  let busy = $state(false);
  let error = $state('');
  let availableActions = $derived(game.getAvailableActions());

  async function run(action) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await action.run(game, game.getCurrentPlayer());
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busy = false;
    }
  }
</script>

{#if availableActions.length > 0 || error}
  <section aria-labelledby="actions-heading" class="card">
    <div class="card-body">
      <h2 id="actions-heading" class="visually-hidden">Actions</h2>
      {#if availableActions.length > 0}
        <div class="d-flex flex-wrap gap-2">
          {#each availableActions as action (action.id)}
            <button type="button" class={actionClasses(action)} disabled={busy} title={action.description || action.label} onclick={() => run(action)}>
              {#if action.icon}<i class={`bi ${action.icon} me-1`} aria-hidden="true"></i>{/if}{action.label}
            </button>
          {/each}
        </div>
      {/if}
      {#if error}<div class="alert alert-danger mt-3 mb-0" role="alert">{error}</div>{/if}
    </div>
  </section>
{/if}
