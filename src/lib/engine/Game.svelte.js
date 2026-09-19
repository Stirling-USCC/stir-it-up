import { Stats } from './Stats.svelte.js';
import { EventBus } from './EventBus.js';
import { Turn } from './Turn.svelte.js';
import { Player } from './Player.svelte.js';
import { DiceRoll } from './DiceRoll.js';
import { randomPlayerName } from '../game/playerNames.js';
import { assertId, assertUniqueIds } from './ids.js';

const playerColours = ['#3467b1', '#ad3434', '#276b4d', '#854490', '#92521e', '#17677a', '#934163', '#555a98'];

export class Game extends Stats {
  players = $state([]);
  decks = $state([]);
  rules = $state([]);
  actions = $state([]);
  dice = $state([]);
  status = $state('waiting');
  log = $state([]);
  lastRoll = $state(null);

  constructor({ board, players = [], decks = [], dice = [], rules = [], actions = [], stats = {}, phases } = {}) {
    super(stats);
    if (players.length > 8) throw new Error('A game supports at most 8 players');
    assertUniqueIds(players, 'player');
    assertUniqueIds(decks, 'deck');
    assertUniqueIds(dice, 'die');
    assertUniqueIds(rules, 'rule');
    assertUniqueIds(actions, 'action');
    const usedNumbers = new Set();
    const usedIds = new Set();
    for (const player of players) {
      player.number ??= Array.from({ length: 8 }, (_, index) => index + 1).find((number) => !usedNumbers.has(number));
      if (!Number.isInteger(player.number) || player.number < 1 || player.number > 8 || usedNumbers.has(player.number)) {
        throw new Error('Player number must be unique and between 1 and 8');
      }
      if (!player.id || usedIds.has(player.id)) throw new Error('Player ID must be present and unique');
      player.colour ??= playerColours[player.number - 1];
      usedNumbers.add(player.number);
      usedIds.add(player.id);
    }
    this.board = board;
    this.board.game = this;
    this.dice = [...dice];
    this.game = this;
    this.events = new EventBus();
    this.turn = new Turn(phases);
    this.players = [...players];
    this.decks = [...decks];
    this.rules = [...rules];
    this.actions = [...actions];
    for (const square of this.board.squares) this.attach(square);
    for (const die of this.dice) this.attach(die);
    for (const player of this.players) this.attach(player);
    for (const deck of this.decks) this.attach(deck);
    for (const rule of this.rules) this.attach(rule);
    for (const action of this.actions) this.attach(action);
  }

  attach(object) {
    object.game = this;
    for (const item of object.inventory ?? []) { item.game = this; item.owner = object; }
    for (const effect of object.effects ?? []) { effect.game = this; effect.owner = object; }
    for (const card of object.hand ?? []) { card.game = this; card.owner = object; }
    for (const card of object.cards ?? []) {
      card.game = this;
      card.deck = object;
    }
  }

  getPlayerById(id) {
    return this.players.find((player) => player.id === id) ?? null;
  }

  getCurrentPlayer() {
    return this.getPlayerById(this.turn.currentPlayerId);
  }

  getDeckById(id) {
    return this.decks.find((deck) => deck.id === id) ?? null;
  }

  getNextActivePlayer(afterIndex) {
    for (let offset = 1; offset <= this.players.length; offset += 1) {
      const index = (afterIndex + offset) % this.players.length;
      const player = this.players[index];
      if (player.active) return player;
    }
    return null;
  }

  getAvailableActions() {
    const player = this.getCurrentPlayer();
    return this.actions.filter((action) => action.available(this, player));
  }

  async addDie(die) {
    const addition = await this.events.emitCancellable('die:adding', { die });
    if (addition.cancelled) return null;
    die = addition.die;
    assertId(die, 'die');
    if (this.dice.some((existing) => existing.id === die.id)) throw new Error(`Die ID already exists: ${die.id}`);
    this.attach(die);
    this.dice.push(die);
    await this.events.emit('die:added', { die });
    return die;
  }

  async removeDie(dieOrId) {
    const id = typeof dieOrId === 'string' ? dieOrId : dieOrId.id;
    const index = this.dice.findIndex((die) => die.id === id);
    if (index < 0) return null;
    const removal = await this.events.emitCancellable('die:removing', { die: this.dice[index] });
    if (removal.cancelled) return null;
    const removalIndex = this.dice.indexOf(removal.die);
    if (removalIndex < 0) throw new Error('Die to remove is not in this game');
    const [die] = this.dice.splice(removalIndex, 1);
    die.game = null;
    await this.events.emit('die:removed', { die });
    return die;
  }

  async addDeck(deck) {
    const addition = await this.events.emitCancellable('deck:adding', { deck });
    if (addition.cancelled) return null;
    deck = addition.deck;
    assertId(deck, 'deck');
    if (this.decks.some((existing) => existing.id === deck.id)) throw new Error(`Deck ID already exists: ${deck.id}`);
    this.attach(deck);
    this.decks.push(deck);
    await this.events.emit('deck:added', { deck });
    return deck;
  }

  async removeDeck(deckOrId) {
    const id = typeof deckOrId === 'string' ? deckOrId : deckOrId.id;
    let deck = this.getDeckById(id);
    if (!deck) return null;
    const removal = await this.events.emitCancellable('deck:removing', { deck });
    if (removal.cancelled) return null;
    deck = removal.deck;
    if (!this.decks.includes(deck)) throw new Error('Deck to remove is not in this game');
    this.decks.splice(this.decks.indexOf(deck), 1);
    deck.game = null;
    for (const card of deck.cards) card.game = null;
    await this.events.emit('deck:removed', { deck });
    return deck;
  }

  async addRule(rule) {
    const addition = await this.events.emitCancellable('rule:adding', { rule });
    if (addition.cancelled) return null;
    rule = addition.rule;
    assertId(rule, 'rule');
    if (this.rules.some((existing) => existing.id === rule.id)) throw new Error(`Rule ID already exists: ${rule.id}`);
    this.attach(rule);
    this.rules.push(rule);
    if (this.status === 'playing') await rule.setup(this);
    await this.events.emit('rule:added', { rule });
    return rule;
  }

  async removeRule(ruleOrId) {
    const id = typeof ruleOrId === 'string' ? ruleOrId : ruleOrId.id;
    let rule = this.rules.find((candidate) => candidate.id === id);
    if (!rule) return null;
    const removal = await this.events.emitCancellable('rule:removing', { rule });
    if (removal.cancelled) return null;
    rule = removal.rule;
    if (!this.rules.includes(rule)) throw new Error('Rule to remove is not in this game');
    if (this.status === 'playing') await rule.teardown();
    this.rules.splice(this.rules.indexOf(rule), 1);
    rule.game = null;
    await this.events.emit('rule:removed', { rule });
    return rule;
  }

  async addAction(action) {
    const addition = await this.events.emitCancellable('action:adding', { action });
    if (addition.cancelled) return null;
    action = addition.action;
    assertId(action, 'action');
    if (this.actions.some((existing) => existing.id === action.id)) throw new Error(`Action ID already exists: ${action.id}`);
    this.attach(action);
    this.actions.push(action);
    await this.events.emit('action:added', { action });
    return action;
  }

  async removeAction(actionOrId) {
    const id = typeof actionOrId === 'string' ? actionOrId : actionOrId.id;
    let action = this.actions.find((candidate) => candidate.id === id);
    if (!action) return null;
    const removal = await this.events.emitCancellable('action:removing', { action });
    if (removal.cancelled) return null;
    action = removal.action;
    if (!this.actions.includes(action)) throw new Error('Action to remove is not in this game');
    this.actions.splice(this.actions.indexOf(action), 1);
    action.game = null;
    await this.events.emit('action:removed', { action });
    return action;
  }

  async logEvent(message, category = 'system', metadata = {}) {
    const sequence = this.log.length + 1;
    const entry = { id: `log-${sequence}`, sequence, timestamp: new Date().toISOString(), message, category, metadata };
    this.log.push(entry);
    await this.events.emit('log:added', { entry });
    return entry;
  }

  async addPlayer(player) {
    if (this.status !== 'waiting') throw new Error('The roster is locked after the game starts');
    if (this.players.length >= 8) throw new Error('A game supports at most 8 players');
    player ??= new Player({ id: crypto.randomUUID(), name: randomPlayerName() });
    const addition = await this.events.emitCancellable('player:adding', { player });
    if (addition.cancelled) return null;
    player = addition.player;
    if (this.status !== 'waiting') throw new Error('The roster is locked after the game starts');
    if (this.players.length >= 8) throw new Error('A game supports at most 8 players');
    const number = Array.from({ length: 8 }, (_, index) => index + 1).find((candidate) => !this.players.some((existing) => existing.number === candidate));
    if (player.number == null) player.number = number;
    if (!Number.isInteger(player.number) || player.number < 1 || player.number > 8 || this.players.some((existing) => existing.number === player.number)) {
      throw new Error('Player number must be unique and between 1 and 8');
    }
    player.colour ??= playerColours[player.number - 1];
    if (this.getPlayerById(player.id)) throw new Error(`Player ID already exists: ${player.id}`);
    player.position = this.board.squares.length ? this.board.resolvePosition(player.position) : 0;
    this.attach(player);
    this.players.push(player);
    await this.events.emit('player:added', { player });
    await this.logEvent(`${player.name} joined the game.`, 'player');
    return player;
  }

  async removePlayer(playerOrId) {
    if (this.status !== 'waiting') throw new Error('The roster is locked after the game starts');
    const id = typeof playerOrId === 'string' ? playerOrId : playerOrId.id;
    const index = this.players.findIndex((player) => player.id === id);
    if (index < 0) return null;
    const removal = await this.events.emitCancellable('player:removing', { player: this.players[index] });
    if (removal.cancelled) return null;
    const removalIndex = this.players.indexOf(removal.player);
    if (removalIndex < 0) throw new Error('Player to remove is not in this game');
    const [player] = this.players.splice(removalIndex, 1);
    player.game = null;
    for (const item of player.inventory) item.game = null;
    for (const effect of player.effects) effect.game = null;
    for (const card of player.hand) card.owner = null;
    await this.events.emit('player:removed', { player });
    await this.logEvent(`${player.name} left the game.`, 'player');
    return player;
  }

  async startGame() {
    if (this.status !== 'waiting') throw new Error('Game has already started');
    const first = this.players.find((player) => player.active);
    if (!first) throw new Error('Add an active player before starting');
    for (const rule of this.rules) await rule.setup(this);
    const starting = await this.events.emitCancellable('game:starting', { game: this, firstPlayer: first });
    if (starting.cancelled) {
      for (const rule of this.rules) await rule.teardown();
      return false;
    }
    if (!this.players.includes(starting.firstPlayer) || !starting.firstPlayer.active) {
      for (const rule of this.rules) await rule.teardown();
      throw new Error('The first player must be active and in the game');
    }
    this.status = 'playing';
    await this.changeCurrentPlayer(starting.firstPlayer.id);
    if (this.turn.currentPlayerId !== starting.firstPlayer.id) {
      this.status = 'waiting';
      for (const rule of this.rules) await rule.teardown();
      return false;
    }
    await this.events.emit('game:started', { game: this });
    await this.logEvent('Game started.', 'game');
    await this.beginTurn();
    return true;
  }

  async finishGame() {
    if (this.status === 'finished') return;
    const finishing = await this.events.emitCancellable('game:finishing', { game: this });
    if (finishing.cancelled) return false;
    await this.changeCurrentPlayer(null);
    if (this.turn.currentPlayerId !== null) return false;
    this.status = 'finished';
    await this.events.emit('game:finished', { game: this });
    await this.logEvent('Game finished.', 'game');
    for (const rule of this.rules) await rule.teardown();
    return true;
  }

  async changeCurrentPlayer(playerOrId) {
    let id = playerOrId === null ? null : typeof playerOrId === 'string' ? playerOrId : playerOrId.id;
    let player = id === null ? null : this.getPlayerById(id);
    if (id !== null && (!player || !player.active)) throw new Error('Current player must be active and in the game');
    const previousPlayerId = this.turn.currentPlayerId;
    if (previousPlayerId === id) return player;
    const change = await this.events.emitCancellable('turn:player-changing', { player, previousPlayerId });
    if (change.cancelled) return this.getCurrentPlayer();
    player = change.player;
    id = player?.id ?? null;
    if (id !== null && (!this.players.includes(player) || !player.active)) throw new Error('Current player must be active and in the game');
    this.turn.currentPlayerId = id;
    await this.events.emit('turn:player-changed', { player, previousPlayerId });
    if (player) await this.logEvent(`Current player: ${player.name}.`, 'turn');
    return player;
  }

  async changePhase(phase) {
    const previous = this.turn.phase;
    if (previous === phase) return;
    const change = await this.events.emitCancellable('turn:phase-changing', { phase, previous, player: this.getCurrentPlayer() });
    if (change.cancelled) return previous;
    if (!this.turn.phases.includes(change.phase)) throw new Error(`Unknown turn phase: ${change.phase}`);
    this.turn.phase = change.phase;
    await this.events.emit('turn:phase-changed', { phase: change.phase, previous, player: this.getCurrentPlayer() });
    return change.phase;
  }

  async beginTurn() {
    if (this.status !== 'playing') throw new Error('Game is not playing');
    const player = this.getCurrentPlayer();
    if (!player || !player.active) throw new Error('A turn needs an active current player');
    const starting = await this.events.emitCancellable('turn:starting', { number: this.turn.number + 1, player });
    if (starting.cancelled) return false;
    if (!Number.isInteger(starting.number) || starting.number < 1) throw new Error('Turn number must be a positive integer');
    if (!this.players.includes(starting.player) || !starting.player.active) throw new Error('A turn needs an active player in the game');
    if (starting.player.id !== this.turn.currentPlayerId) {
      await this.changeCurrentPlayer(starting.player.id);
      if (this.turn.currentPlayerId !== starting.player.id) return false;
    }
    this.turn.number = starting.number;
    await this.changePhase(this.turn.phases[0]);
    await this.events.emit('turn:started', { number: this.turn.number, player: starting.player });
    await this.logEvent(`Turn ${this.turn.number}: ${starting.player.name}.`, 'turn');
    if (this.turn.phases[1]) await this.changePhase(this.turn.phases[1]);
    return true;
  }

  async endTurn() {
    if (this.status !== 'playing') throw new Error('Game is not playing');
    const player = this.getCurrentPlayer();
    if (!player) throw new Error('A turn needs a current player');
    const ending = await this.events.emitCancellable('turn:ending', { number: this.turn.number, player });
    if (ending.cancelled) return false;
    await this.changePhase(this.turn.phases.at(-1));
    await this.events.emit('turn:ended', { number: this.turn.number, player });
    await this.logEvent(`${player.name} ended their turn.`, 'turn');
    const next = this.getNextActivePlayer(this.players.indexOf(player));
    if (next) {
      await this.changeCurrentPlayer(next.id);
      await this.beginTurn();
      return true;
    }
    return this.finishGame();
  }

  async rollDice(dice = this.dice) {
    if (!Array.isArray(dice)) dice = [dice];
    if (dice.length === 0) throw new Error('No dice are configured');
    const rolling = await this.events.emitCancellable('dice:rolling', { dice: [...dice], player: this.getCurrentPlayer() });
    if (rolling.cancelled) return null;
    if (!Array.isArray(rolling.dice) || rolling.dice.length === 0) throw new Error('A roll needs at least one die');
    const player = rolling.player;
    const results = [];
    for (const die of rolling.dice) {
      if (!die || typeof die.roll !== 'function') throw new TypeError('A roll can only contain dice');
      const value = await die.roll({ game: this, player });
      if (value !== null) results.push({ die, value });
    }
    if (results.length === 0) return null;
    const roll = new DiceRoll(results, player?.id ?? null);
    this.lastRoll = roll;
    await this.events.emit('dice:rolled', { dice: rolling.dice, player, roll, result: roll });
    const rolledValues = results.length === 1
      ? String(results[0].value)
      : results.map(({ die, value }) => `${die.name} ${value}`).join(' · ');
    await this.logEvent(`${player?.name ?? 'Someone'} rolled ${rolledValues}.`, 'dice', { values: results.map(({ die, value }) => ({ dieId: die.id, value })) });
    return roll;
  }

  async drawCard(deckOrId, player = this.getCurrentPlayer()) {
    const deck = typeof deckOrId === 'string' ? this.decks.find((candidate) => candidate.id === deckOrId) : deckOrId;
    if (!deck || !this.decks.includes(deck)) throw new Error('Deck is not in this game');
    return deck.draw(player);
  }

  async playCard(card, player = this.getCurrentPlayer()) {
    if (!player || !this.players.includes(player)) throw new Error('A player in this game must play the card');
    if (!player.hand.includes(card)) throw new Error('Card is not in this player’s hand');
    if (!await card.play(player)) return false;
    if (card.deck) await card.deck.discard(card, player);
    else await player.removeCard(card);
    return true;
  }

  async discardCard(card, player = this.getCurrentPlayer()) {
    if (!player || !this.players.includes(player)) throw new Error('A player in this game must discard the card');
    if (!player.hand.includes(card)) throw new Error('Card is not in this player’s hand');
    if (card.deck) return card.deck.discard(card, player);
    return player.removeCard(card);
  }
}
