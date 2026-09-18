import { Stats } from './Stats.svelte.js';

export class Rule extends Stats {
  constructor({ id, name, description = '', handlers = {}, stats = {} }) {
    super(stats);
    Object.assign(this, { id, name, description, handlers });
    this.unsubscribers = [];
  }

  async setup(game) {
    this.game = game;
    for (const [type, handler] of Object.entries(this.handlers)) {
      this.unsubscribers.push(game.events.on(type, (detail) => handler(game, detail)));
    }
  }

  async teardown() {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    this.game = null;
  }
}
