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
    const play = await this.game?.events.emitCancellable('card:playing', { card: this, player }) ?? { player };
    if (play.cancelled) return false;
    await this.onPlay(this.game, play.player);
    await this.game?.events.emit('card:played', { card: this, player: play.player });
    await this.game?.logEvent(`${play.player?.name ?? 'Someone'} played ${this.name}.`, 'card');
    return true;
  }
}
