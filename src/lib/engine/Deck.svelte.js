import { Stats } from './Stats.svelte.js';

export class Deck extends Stats {
  cards = $state([]);
  drawPile = $state([]);
  discardPile = $state([]);

  constructor({ id, name, cards = [], stats = {} }) {
    super(stats);
    Object.assign(this, { id, name });
    this.cards = [...cards];
    this.drawPile = [...cards];
  }

  async reset() {
    this.drawPile = [...this.cards];
    this.discardPile = [];
    await this.game?.events.emit('deck:reset', { deck: this });
  }

  async shuffle(random = Math.random) {
    for (let index = this.drawPile.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [this.drawPile[index], this.drawPile[swapIndex]] = [this.drawPile[swapIndex], this.drawPile[index]];
    }
    await this.game?.events.emit('deck:shuffled', { deck: this });
  }

  async draw(player = null) {
    const card = this.drawPile.shift() ?? null;
    if (!card) return null;
    await card.onDraw(this.game, player);
    await this.game?.events.emit('card:drawn', { deck: this, card, player });
    await this.game?.logEvent(`${player?.name ?? 'Someone'} drew ${card.name} from ${this.name}.`, 'card');
    return card;
  }

  async discard(card, player = null) {
    this.discardPile.push(card);
    await card.onDiscard(this.game, player);
    await this.game?.events.emit('card:discarded', { deck: this, card, player });
    return card;
  }
}
