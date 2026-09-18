import { Stats } from './Stats.svelte.js';

export class Action extends Stats {
  constructor({ id, label, description = '', icon = '', available = () => true, perform, stats = {} }) {
    super(stats);
    Object.assign(this, { id, label, description, icon, available, perform });
  }
}
