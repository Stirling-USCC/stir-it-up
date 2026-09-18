import { Stats } from './Stats.svelte.js';

export class Card extends Stats {
  constructor({ id, name, description = '', image = null, icon = '', className = '', stats = {} }) {
    super(stats);
    Object.assign(this, { id, name, description, image, icon, className });
  }

  async onDraw(_game, _player) {}
  async onPlay(_game, _player) {}
  async onDiscard(_game, _player) {}
}
