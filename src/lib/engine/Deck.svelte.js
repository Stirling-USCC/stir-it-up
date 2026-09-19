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
    const reset = await this.game?.events.emitCancellable('deck:resetting', { deck: this }) ?? {};
    if (reset.cancelled) return false;
    this.drawPile = [...this.cards];
    this.discardPile = [];
    await this.game?.events.emit('deck:reset', { deck: this });
    return true;
  }

  async shuffle() {
    const shuffle = await this.game?.events.emitCancellable('deck:shuffling', { deck: this }) ?? {};
    if (shuffle.cancelled) return false;
    for (let index = this.drawPile.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [this.drawPile[index], this.drawPile[swapIndex]] = [this.drawPile[swapIndex], this.drawPile[index]];
    }
    await this.game?.events.emit('deck:shuffled', { deck: this });
    return true;
  }

  async draw(player = null) {
    let card = this.drawPile[0] ?? null;
    if (!card) return null;
    const draw = await this.game?.events.emitCancellable('card:drawing', { deck: this, card, player }) ?? { card, player };
    if (draw.cancelled) return null;
    card = draw.card;
    if (!this.drawPile.includes(card)) throw new Error('Card to draw is not in this deck draw pile');
    this.drawPile.splice(this.drawPile.indexOf(card), 1);
    await card.onDraw(this.game, draw.player);
    await this.game?.events.emit('card:drawn', { deck: this, card, player: draw.player });
    await this.game?.logEvent(`${draw.player?.name ?? 'Someone'} drew ${card.name} from ${this.name}.`, 'card');
    return card;
  }

  async discard(card, player = null) {
    if (!this.cards.includes(card)) throw new Error('Card does not belong to this deck');
    if (this.drawPile.includes(card) || this.discardPile.includes(card)) {
      throw new Error('Card must be drawn before it can be discarded');
    }
    const discard = await this.game?.events.emitCancellable('card:discarding', { deck: this, card, player }) ?? { card, player };
    if (discard.cancelled) return null;
    card = discard.card;
    if (!this.cards.includes(card) || this.drawPile.includes(card) || this.discardPile.includes(card)) {
      throw new Error('Card to discard must be a drawn card from this deck');
    }
    this.discardPile.push(card);
    await card.onDiscard(this.game, discard.player);
    await this.game?.events.emit('card:discarded', { deck: this, card, player: discard.player });
    await this.game?.logEvent(`${card.name} was discarded to ${this.name}.`, 'card');
    return card;
  }
}
