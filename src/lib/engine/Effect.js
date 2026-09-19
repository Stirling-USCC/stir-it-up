import { Stats } from './Stats.svelte.js';

export class Effect extends Stats {
  constructor({ id, name, description = '', duration = null, metadata = {}, stats = {}, handlers = {} }) {
    super(stats);
    Object.assign(this, { id, name, description, duration, metadata, handlers });
    this.unsubscribers = [];
    this.owner = null;
    this.active = false;
  }

  async onAdd(_game, _owner) {}
  async onRemove(_game, _owner) {}

  async setup(game, owner) {
    if (this.active) return;
    this.active = true;
    this.game = game;
    this.owner = owner;
    for (const [type, handler] of Object.entries(this.handlers)) {
      this.unsubscribers.push(game.events.on(type, (detail) => handler(game, detail, owner, this)));
    }
    await this.onAdd(game, owner);
  }

  async teardown() {
    if (!this.active) return;
    const game = this.game;
    const owner = this.owner;
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    this.active = false;
    if (game && owner) await this.onRemove(game, owner);
    this.game = null;
    this.owner = null;
  }
}
