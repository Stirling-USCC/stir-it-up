import { Stats } from './Stats.svelte.js';
import { assertId, assertUniqueIds } from './ids.js';

export class Deck extends Stats {
  cards = $state([]);
  drawPile = $state([]);
  discardPile = $state([]);

  constructor({ id, name, cards = [], stats = {} }) {
    super(stats);
    assertUniqueIds(cards, 'card');
    Object.assign(this, { id, name });
    this.cards = [...cards];
    this.drawPile = [...cards];
    for (const card of cards) card.deck = this;
  }

  async addCard(card) {
    const addition = await this.game?.events.emitCancellable('card:adding', { deck: this, card }) ?? { card };
    if (addition.cancelled) return null;
    card = addition.card;
    assertId(card, 'card');
    if (this.cards.some((existing) => existing.id === card.id)) throw new Error(`Card ID already exists: ${card.id}`);
    this.cards.push(card);
    this.drawPile.push(card);
    card.deck = this;
    if (this.game) this.game.attach(card);
    await this.game?.events.emit('card:added', { deck: this, card });
    return card;
  }

  async removeCard(cardOrId) {
    const id = typeof cardOrId === 'string' ? cardOrId : cardOrId.id;
    let card = this.cards.find((candidate) => candidate.id === id);
    if (!card) return null;
    const removal = await this.game?.events.emitCancellable('card:removing', { deck: this, card }) ?? { card };
    if (removal.cancelled) return null;
    card = removal.card;
    if (!this.cards.includes(card)) throw new Error('Card to remove is not in this deck');
    if (card.owner) throw new Error('Cannot remove a card while a player is holding it');
    this.cards.splice(this.cards.indexOf(card), 1);
    if (this.drawPile.includes(card)) this.drawPile.splice(this.drawPile.indexOf(card), 1);
    if (this.discardPile.includes(card)) this.discardPile.splice(this.discardPile.indexOf(card), 1);
    card.deck = null;
    card.game = null;
    await this.game?.events.emit('card:removed', { deck: this, card });
    return card;
  }

  async reset() {
    const reset = await this.game?.events.emitCancellable('deck:resetting', { deck: this }) ?? {};
    if (reset.cancelled) return false;
    // Cards held by players stay out of the deck until played or discarded.
    this.drawPile = this.cards.filter((card) => !card.owner);
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
    player = draw.player;
    if (!this.drawPile.includes(card)) throw new Error('Card to draw is not in this deck draw pile');
    const drawIndex = this.drawPile.indexOf(card);
    this.drawPile.splice(drawIndex, 1);
    if (player) {
      const received = await player.addCard(card);
      if (!received) {
        this.drawPile.splice(drawIndex, 0, card);
        return null;
      }
    }
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
    player = discard.player ?? card.owner ?? null;
    if (player?.hand.includes(card) && !await player.removeCard(card)) return null;
    this.discardPile.push(card);
    await card.onDiscard(this.game, discard.player);
    await this.game?.events.emit('card:discarded', { deck: this, card, player: discard.player });
    await this.game?.logEvent(`${card.name} was discarded to ${this.name}.`, 'card');
    return card;
  }
}
