<script>
  import { onMount } from 'svelte';
  let { game } = $props();
  let toasts = $state([]);
  let nextId = 1;
  const timers = new Set();

  function dismiss(id) {
    toasts = toasts.filter((toast) => toast.id !== id);
  }

  onMount(() => {
    const unsubscribe = game.events.on('dice:rolled', ({ player, result }) => {
      const id = nextId++;
      toasts.push({ id, message: `${player?.name ?? 'Someone'} rolled ${result.total}.` });
      const timer = setTimeout(() => { dismiss(id); timers.delete(timer); }, 4000);
      timers.add(timer);
    });
    return () => {
      unsubscribe();
      for (const timer of timers) clearTimeout(timer);
    };
  });
</script>

<div class="toast-region" aria-live="polite" aria-atomic="false">
  {#each toasts as toast (toast.id)}
    <div class="toast show mb-2 shadow-sm" role="status">
      <div class="toast-header"><i class="bi bi-dice-6 me-2" aria-hidden="true"></i><strong class="me-auto">Dice rolled</strong><button type="button" class="btn-close" aria-label="Dismiss notification" onclick={() => dismiss(toast.id)}></button></div>
      <div class="toast-body">{toast.message}</div>
    </div>
  {/each}
</div>
