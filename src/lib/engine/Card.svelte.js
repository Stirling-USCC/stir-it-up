import { Stats } from './Stats.svelte.js';

export class Card extends Stats {
  constructor({ id, name, description = '', image = null, icon = '', className = '', stats = {} }) {
    super(stats);
    Object.assign(this, { id, name, description, image, icon, className });
  }

  async onDraw(_game, _player) {}
  async onPlay(_game, _player) {}
  async onDiscard(_game, _player) {}

  async play(player = this.game?.getCurrentPlayer() ?? null) {
    await this.onPlay(this.game, player);
    await this.game?.events.emit('card:played', { card: this, player });
    await this.game?.logEvent(`${player?.name ?? 'Someone'} played ${this.name}.`, 'card');
  }
}
