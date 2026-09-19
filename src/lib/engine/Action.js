import { Stats } from './Stats.svelte.js';

export class Action extends Stats {
  constructor({ id, label, description = '', icon = '', variant = 'outline-primary', emphasis = 'normal', available = () => true, perform, stats = {} }) {
    super(stats);
    Object.assign(this, { id, label, description, icon, variant, emphasis, available, perform });
  }

  async run(game = this.game, player = game?.getCurrentPlayer()) {
    if (typeof this.perform !== 'function') throw new TypeError(`Action ${this.id} needs a perform function`);
    const execution = await game?.events.emitCancellable('action:performing', { action: this, player }) ?? { action: this, player };
    if (execution.cancelled) return false;
    const result = await this.perform(game, execution.player);
    await game?.events.emit('action:performed', { action: this, player: execution.player, result });
    return result;
  }
}
