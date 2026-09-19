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
    player = play.player;
    if (this.owner && player !== this.owner) throw new Error('A held card must be played by its owner');
    if (player && this.game && !this.game.players.includes(player)) throw new Error('The player playing a card must be in this game');
    await this.onPlay(this.game, player);
    await this.game?.events.emit('card:played', { card: this, player });
    await this.game?.logEvent(`${player?.name ?? 'Someone'} played ${this.name}.`, 'card');
    return true;
  }
}
