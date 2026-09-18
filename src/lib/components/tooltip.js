// Bootstrap's JS is loaded only in the browser. Svelte disposes the action with its button.
export function tooltip(element, text) {
  let instance;
  let disposed = false;
  import('bootstrap/js/dist/tooltip').then(({ default: Tooltip }) => {
    if (!disposed) instance = new Tooltip(element, { title: text, trigger: 'hover focus', container: 'body' });
  });
  return {
    update(nextText) { instance?.setContent({ '.tooltip-inner': nextText }); },
    destroy() { disposed = true; instance?.dispose(); }
  };
}
