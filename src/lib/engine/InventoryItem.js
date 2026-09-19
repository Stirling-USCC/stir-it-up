import { Stats } from './Stats.svelte.js';
import { setupOwnedAttachment, teardownOwnedAttachment } from './ownedAttachment.js';

export class InventoryItem extends Stats {
  constructor({ id, name, description = '', metadata = {}, stats = {}, handlers = {} }) {
    super(stats);
    Object.assign(this, { id, name, description, metadata, handlers });
    this.unsubscribers = [];
    this.owner = null;
    this.active = false;
  }

  async onAdd(_game, _owner) {}
  async onRemove(_game, _owner) {}

  async setup(game, owner) {
    await setupOwnedAttachment(this, game, owner);
  }

  async teardown() {
    await teardownOwnedAttachment(this);
  }
}
