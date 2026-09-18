import { Stats } from './Stats.svelte.js';

export class Effect extends Stats {
  constructor({ id, name, description = '', duration = null, metadata = {}, stats = {} }) {
    super(stats);
    Object.assign(this, { id, name, description, duration, metadata });
  }
}
