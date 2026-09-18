import { Stats } from './Stats.svelte.js';

export class Square extends Stats {
  constructor({ id, name, description = '', position = 0, row, column, icon = '·', className = '', stats = {} }) {
    super(stats);
    Object.assign(this, { id, name, description, position, row, column, icon, className });
  }

  async onLand(_game, _player) {}
  async onLeave(_game, _player) {}
  async onPass(_game, _player) {}
}
