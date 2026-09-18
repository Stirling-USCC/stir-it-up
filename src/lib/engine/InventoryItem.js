import { Stats } from './Stats.svelte.js';

export class InventoryItem extends Stats {
  constructor({ id, name, description = '', metadata = {}, stats = {} }) {
    super(stats);
    Object.assign(this, { id, name, description, metadata });
  }
}
