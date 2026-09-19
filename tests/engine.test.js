import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/lib/engine/EventBus.js';
import { Card } from '../src/lib/engine/Card.svelte.js';
import { Square } from '../src/lib/engine/Square.svelte.js';
import { Deck } from '../src/lib/engine/Deck.svelte.js';
import { Player } from '../src/lib/engine/Player.svelte.js';
import { Game } from '../src/lib/engine/Game.svelte.js';
import { Board } from '../src/lib/engine/Board.svelte.js';
import { InventoryItem } from '../src/lib/engine/InventoryItem.js';
import { Effect } from '../src/lib/engine/Effect.js';
import { Action } from '../src/lib/engine/Action.js';
import { Rule } from '../src/lib/engine/Rule.js';
import { createNeutralGame as createGame } from '../src/lib/game/createNeutralGame.js';
import { Die } from '../src/lib/engine/Die.svelte.js';
import { activeSquareId, findSquareInDirection } from '../src/lib/components/boardNavigation.js';
import { tokenPositions } from '../src/lib/components/tokenPositions.js';

describe('EventBus', () => {
  it('awaits listeners in order and handles once/unsubscribe', async () => {
    const bus = new EventBus();
    const calls = [];
    const unsubscribe = bus.on('step', async () => {
      calls.push('first begins');
      await Promise.resolve();
      calls.push('first ends');
    });
    bus.once('step', () => calls.push('once'));
    bus.on('step', () => calls.push('last'));
    await bus.emit('step');
    unsubscribe();
    await bus.emit('step');
    expect(calls).toEqual(['first begins', 'first ends', 'once', 'last', 'last']);
  });

  it('does not call a listener removed by an earlier listener', async () => {
    const bus = new EventBus();
    const calls = [];
    bus.on('step', () => {
      calls.push('first');
      unsubscribe();
    });
    const unsubscribe = bus.on('step', () => calls.push('removed'));
    await bus.emit('step');
    expect(calls).toEqual(['first']);
  });

  it('passes one mutable cancellable event through every listener in order', async () => {
    const bus = new EventBus();
    const calls = [];
    bus.on('thing:changing', async (event) => {
      await Promise.resolve();
      event.value += 2;
      calls.push(`changed:${event.value}`);
    });
    bus.on('thing:changing', (event) => {
      event.cancel('Not today');
      calls.push(`cancelled:${event.value}`);
    });
    bus.on('thing:changing', (event) => calls.push(`observed:${event.cancelled}`));

    const event = await bus.emitCancellable('thing:changing', { value: 3 });
    expect(event.value).toBe(5);
    expect(event.cancelled).toBe(true);
    expect(event.reason).toBe('Not today');
    expect(calls).toEqual(['changed:5', 'cancelled:5', 'observed:true']);
  });

  it('passes a cancellable event through several event types before finalising it', async () => {
    const bus = new EventBus();
    const calls = [];
    bus.on('object:changing', (event) => {
      event.value += 1;
      calls.push('generic');
    });
    bus.on('player:changing', (event) => {
      event.cancel('Player change blocked');
      calls.push(`player:${event.value}`);
    });
    bus.on('command:cancelled', ({ type }) => calls.push(`cancelled:${type}`));

    const event = await bus.emitCancellable(['object:changing', 'player:changing'], { value: 1 });

    expect(event.value).toBe(2);
    expect(calls).toEqual(['generic', 'player:2', 'cancelled:player:changing']);
  });
});

describe('cancellable command events', () => {
  it('lets sequential rules modify or cancel movement before square hooks run', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const completed = [];
    let cancelNext = false;
    game.events.on('player:moving', async (movement) => {
      await Promise.resolve();
      movement.amount += 2;
    });
    game.events.on('player:moving', (movement) => {
      if (cancelNext) movement.cancel('Movement blocked');
    });
    game.events.on('player:moved', (movement) => completed.push(movement));

    expect(await player.move(3)).toBe(5);
    expect(completed[0]).toMatchObject({ from: 0, to: 5, amount: 5, mode: 'relative' });
    cancelNext = true;
    expect(await player.move(4)).toBe(5);
    expect(player.position).toBe(5);
    expect(completed).toHaveLength(1);
    expect(game.log.some((entry) => entry.message === 'Movement blocked' && entry.category === 'cancelled')).toBe(true);
  });

  it('validates modified command values and reports only completed changes', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const completed = [];
    game.events.on('player:moved', (movement) => completed.push(movement));
    game.events.on('player:moving', (movement) => { movement.amount = 1.5; });

    await expect(player.move(2)).rejects.toThrow('whole squares');
    expect(player.position).toBe(0);
    expect(completed).toHaveLength(0);
  });

  it('allows stats, dice and cards to be modified or cancelled before execution', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    game.events.on('player:stat-changing', (change) => {
      if (change.name === 'cabbages') change.value *= 2;
      if (change.name === 'forbidden') change.cancel('Forbidden stat');
    });
    expect(await player.setStat('cabbages', 4)).toBe(8);
    expect(await player.setStat('forbidden', 1)).toBeUndefined();
    expect(player.hasStat('forbidden')).toBe(false);
    expect(game.log.some((entry) => entry.message === 'Forbidden stat')).toBe(true);

    game.events.on('die:resolving', (roll) => { roll.value = 6; });
    expect((await game.rollDice()).total).toBe(6);

    const card = new Card({ id: 'interruptible', name: 'Interruptible' });
    const deck = new Deck({ id: 'interruptions', name: 'Interruptions', cards: [card] });
    game.decks.push(deck);
    game.attach(deck);
    const cancelDraw = game.events.on('card:drawing', (draw) => draw.cancel('Deck locked'));
    expect(await deck.draw(player)).toBe(null);
    expect(deck.drawPile).toEqual([card]);
    cancelDraw();
    expect(await deck.draw(player)).toBe(card);
    game.events.on('card:playing', (play) => play.cancel('Card silenced'));
    expect(await card.play(player)).toBe(false);
  });
});

describe('generic engine objects', () => {
  it('adds and removes extensible collections through game commands', async () => {
    const game = createGame();
    const card = new Card({ id: 'runtime-card', name: 'Runtime Card' });
    const deck = new Deck({ id: 'runtime-deck', name: 'Runtime Deck' });
    const rule = new Rule({ id: 'runtime-rule', name: 'Runtime Rule' });
    const action = new Action({ id: 'runtime-action', label: 'Runtime Action', perform: () => {} });

    await game.addDeck(deck);
    await deck.addCard(card);
    await game.addRule(rule);
    await game.addAction(action);
    expect([deck.game, card.game, rule.game, action.game]).toEqual([game, game, game, game]);
    expect(deck.drawPile).toEqual([card]);

    await expect(game.addDeck(new Deck({ id: 'runtime-deck', name: 'Duplicate' }))).rejects.toThrow('already exists');
    await expect(deck.addCard(new Card({ id: 'runtime-card', name: 'Duplicate' }))).rejects.toThrow('already exists');

    expect(await deck.removeCard(card)).toBe(card);
    expect(await game.removeAction(action)).toBe(action);
    expect(await game.removeRule(rule)).toBe(rule);
    expect(await game.removeDeck(deck)).toBe(deck);
  });

  it('composes static content into a neutral game without mutating fixtures later', () => {
    const deck = new Deck({ id: 'extra-deck', name: 'Extra Deck' });
    const die = new Die({ id: 'extra-die', name: 'Extra Die' });
    const rule = new Rule({ id: 'extra-rule', name: 'Extra Rule' });
    const action = new Action({ id: 'extra-action', label: 'Extra Action', perform: () => {} });
    const game = createGame({ decks: [deck], dice: [die], rules: [rule], actions: [action] });

    expect(game.decks).toContain(deck);
    expect(game.dice).toContain(die);
    expect(game.rules).toContain(rule);
    expect(game.actions).toContain(action);
  });

  it('rejects duplicate IDs in initial collections', () => {
    const duplicateCards = [new Card({ id: 'same', name: 'One' }), new Card({ id: 'same', name: 'Two' })];
    expect(() => new Deck({ id: 'deck', name: 'Deck', cards: duplicateCards })).toThrow('Card ID already exists');
    const duplicateSquares = [new Square({ id: 'same', name: 'One' }), new Square({ id: 'same', name: 'Two' })];
    expect(() => new Board(duplicateSquares)).toThrow('Square ID already exists');
    expect(() => new Game()).toThrow('needs a board');
  });

  it('changes arbitrary stats on players and squares and emits events', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const square = game.board.squares[0];
    const changes = [];
    game.events.on('object:stat-changed', ({ object, name, value }) => changes.push([object.id, name, value]));
    await player.setStat('cabbages', 12);
    await player.incrementStat('cabbages', 3);
    await player.decrementStat('cabbages', 2);
    await square.addStat('descriptionCode', 'neutral');
    expect(player.getStat('cabbages')).toBe(13);
    expect(square.getStat('descriptionCode')).toBe('neutral');
    await player.removeStat('cabbages');
    expect(player.hasStat('cabbages')).toBe(false);
    expect(changes).toEqual([
      [player.id, 'cabbages', 12],
      [player.id, 'cabbages', 15],
      [player.id, 'cabbages', 13],
      ['square-1', 'descriptionCode', 'neutral'],
      [player.id, 'cabbages', undefined]
    ]);
    await expect(square.incrementStat('descriptionCode')).rejects.toThrow('not a finite number');
  });

  it('moves through the board in either direction using the player command', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const moves = [];
    game.events.on('player:moved', ({ from, to }) => moves.push([from, to]));
    await player.move(-1);
    expect(player.position).toBe(99);
    await player.move(3);
    expect(player.position).toBe(2);
    await player.moveTo(17);
    expect(player.position).toBe(17);
    expect(moves).toEqual([[0, 99], [99, 2], [2, 17]]);
  });

  it('draws and discards cards without assuming card content', async () => {
    const card = new Card({ id: 'blank', name: 'Blank' });
    const deck = new Deck({ id: 'deck', name: 'Deck', cards: [card] });
    await expect(deck.discard(card)).rejects.toThrow('must be drawn');
    const drawn = await deck.draw();
    expect(drawn).toBe(card);
    expect(deck.drawPile).toHaveLength(0);
    await deck.discard(drawn);
    expect(deck.discardPile).toEqual([card]);
    await expect(deck.discard(drawn)).rejects.toThrow('must be drawn');
    await deck.reset();
    expect(deck.drawPile).toEqual([card]);
    expect(deck.discardPile).toHaveLength(0);
  });

  it('keeps drawn cards in canonical player hands and plays them into discard piles', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const card = new Card({ id: 'confidence', name: 'Confidence' });
    card.onPlay = (_game, owner) => owner.incrementStat('confidence');
    const deck = new Deck({ id: 'hand-test', name: 'Hand Test', cards: [card] });
    await game.addDeck(deck);

    expect(await game.drawCard(deck, player)).toBe(card);
    expect(player.hand).toEqual([card]);
    expect(card.owner).toBe(player);
    await deck.reset();
    expect(deck.drawPile).not.toContain(card);
    await expect(game.removeDeck(deck)).rejects.toThrow('holding');
    expect(await game.playCard(card, player)).toBe(true);
    expect(player.hand).toHaveLength(0);
    expect(deck.discardPile).toEqual([card]);
    expect(player.getStat('confidence')).toBe(1);
  });

  it('returns a removed player’s held cards to their decks', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const deckCard = new Card({ id: 'returnable', name: 'Returnable' });
    const looseCard = new Card({ id: 'loose', name: 'Loose' });
    const deck = new Deck({ id: 'returns', name: 'Returns', cards: [deckCard] });
    await game.addDeck(deck);
    await game.drawCard(deck, player);
    await player.addCard(looseCard);

    await game.removePlayer(player);

    expect(player.hand).toHaveLength(0);
    expect(deck.drawPile).toContain(deckCard);
    expect(deckCard.owner).toBe(null);
    expect(deckCard.game).toBe(game);
    expect(looseCard.owner).toBe(null);
    expect(looseCard.game).toBe(null);
  });

  it('keeps the card owner consistent through play and discard proposals', async () => {
    const game = createGame();
    const owner = await game.addPlayer();
    const other = await game.addPlayer();
    const card = new Card({ id: 'ownership', name: 'Ownership' });
    const deck = new Deck({ id: 'ownership-deck', name: 'Ownership Deck', cards: [card] });
    await game.addDeck(deck);
    await game.drawCard(deck, owner);

    const redirect = game.events.on('card:playing', (play) => { play.player = other; });
    await expect(game.playCard(card, owner)).rejects.toThrow('owner');
    expect(owner.hand).toContain(card);
    expect(deck.discardPile).not.toContain(card);
    redirect();

    let discardedBy = null;
    card.onDiscard = (_game, player) => { discardedBy = player; };
    await deck.discard(card);
    expect(discardedBy).toBe(owner);
    expect(owner.hand).not.toContain(card);
    expect(deck.discardPile).toContain(card);
  });

  it('runs the demonstration actions through two players and updates turn state', async () => {
    const game = createGame();
    const first = await game.addPlayer();
    const second = await game.addPlayer();
    const phases = [];
    game.events.on('turn:phase-changed', ({ phase }) => phases.push(phase));
    await game.startGame();
    expect(game.getCurrentPlayer().id).toBe(first.id);
    expect(game.turn.number).toBe(1);
    await game.actions.find((action) => action.id === 'roll').perform(game);
    const rolled = game.lastRoll.total;
    await game.actions.find((action) => action.id === 'move').perform(game, game.getCurrentPlayer());
    expect(first.position).toBe(rolled);
    await game.endTurn();
    expect(game.getCurrentPlayer().id).toBe(second.id);
    expect(game.turn.number).toBe(2);
    expect(game.turn.phase).toBe('roll');
    expect(phases).toContain('move');
    expect(phases).toContain('action');
    expect(game.log.some((entry) => entry.message.includes('moved from'))).toBe(true);
  });

  it('uses the configured turn phases instead of requiring a roll phase', async () => {
    const game = new Game({
      board: new Board([new Square({ id: 'space', name: 'Space' })]),
      players: [new Player({ id: 'one', name: 'One' })],
      phases: ['begin', 'choose', 'done']
    });
    await game.startGame();
    expect(game.turn.phase).toBe('choose');
    await game.endTurn();
    expect(game.turn.number).toBe(2);
    expect(game.turn.phase).toBe('choose');
  });

  it('keeps the turn coherent when the current player becomes inactive', async () => {
    const game = createGame();
    const first = await game.addPlayer();
    const second = await game.addPlayer();
    const third = await game.addPlayer();
    await game.startGame();
    await game.endTurn();
    expect(game.getCurrentPlayer().id).toBe(second.id);
    await second.setActive(false);
    expect(game.getCurrentPlayer().id).toBe(third.id);
    expect(game.turn.number).toBe(3);
    expect(game.turn.phase).toBe('roll');
    await game.getCurrentPlayer().setActive(false);
    expect(game.getCurrentPlayer().id).toBe(first.id);
    expect(game.turn.number).toBe(4);
    await game.getCurrentPlayer().setActive(false);
    expect(game.status).toBe('finished');
    expect(game.getCurrentPlayer()).toBe(null);
  });

  it('keeps positions and square stats aligned when the board changes', async () => {
    const game = createGame();
    await game.addPlayer();
    await game.addPlayer();
    const inserted = new Square({ id: 'inserted', name: 'Inserted' });
    const changes = [];
    game.events.on('player:position-rebased', ({ from, to }) => changes.push([from, to]));
    await game.board.addSquare(inserted, 0);
    expect(game.players[0].position).toBe(1);
    expect(game.board.getSquareById('square-1').position).toBe(1);
    await inserted.setStat('label', 'new');
    expect(inserted.getStat('label')).toBe('new');
    await game.board.removeSquare('inserted');
    expect(game.players[0].position).toBe(0);
    expect(game.board.getSquare(0).id).toBe('square-1');
    expect(changes).toEqual([[0, 1], [0, 1], [1, 0], [1, 0]]);
  });

  it('keeps item and effect IDs unique and emits a card play event', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    await player.addItem(new InventoryItem({ id: 'item', name: 'Item' }));
    await expect(player.addItem(new InventoryItem({ id: 'item', name: 'Duplicate' }))).rejects.toThrow('already exists');
    await player.addEffect(new Effect({ id: 'effect', name: 'Effect' }));
    await expect(player.addEffect(new Effect({ id: 'effect', name: 'Duplicate' }))).rejects.toThrow('already exists');

    const card = new Card({ id: 'card', name: 'Card' });
    const deck = new Deck({ id: 'cards', name: 'Cards', cards: [card] });
    const cardGame = new Game({ board: new Board([new Square({ id: 'card-space', name: 'Space' })]), decks: [deck] });
    const played = [];
    cardGame.events.on('card:played', ({ card }) => played.push(card.id));
    await card.play();
    expect(played).toEqual(['card']);
  });

  it('activates item and effect handlers only while their owner has them', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const boots = new InventoryItem({
      id: 'boots', name: 'Boots', stats: { bonus: 2 },
      handlers: {
        'player:moving': (_game, movement, owner, item) => {
          if (movement.player === owner) movement.amount += item.getStat('bonus');
        }
      }
    });
    const rooted = new Effect({
      id: 'rooted', name: 'Rooted',
      handlers: {
        'player:moving': (_game, movement, owner) => {
          if (movement.player === owner) movement.cancel('Rooted');
        }
      }
    });

    await player.addItem(boots);
    await game.startGame();
    await player.move(1);
    expect(player.position).toBe(3);
    await player.addEffect(rooted);
    await player.move(4);
    expect(player.position).toBe(3);
    await player.removeEffect(rooted);
    await player.removeItem(boots);
    await player.move(1);
    expect(player.position).toBe(4);
  });

  it('rolls back an attachment whose setup hook fails', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    await game.startGame();
    const item = new InventoryItem({
      id: 'broken-item', name: 'Broken Item',
      handlers: { 'player:moving': () => {} }
    });
    item.onAdd = () => { throw new Error('Broken attachment'); };

    await expect(player.addItem(item)).rejects.toThrow('Broken attachment');
    expect(player.inventory).not.toContain(item);
    expect(item.active).toBe(false);
    expect(item.owner).toBe(null);
    expect(item.game).toBe(null);
    expect(item.unsubscribers).toHaveLength(0);
  });

  it('clears attachment ownership even when its removal hook fails', async () => {
    const game = createGame();
    const player = await game.addPlayer();
    const effect = new Effect({ id: 'stubborn-effect', name: 'Stubborn Effect' });
    effect.onRemove = () => { throw new Error('Broken removal'); };
    await player.addEffect(effect);
    await game.startGame();

    await expect(effect.teardown()).rejects.toThrow('Broken removal');
    expect(effect.active).toBe(false);
    expect(effect.owner).toBe(null);
    expect(effect.game).toBe(null);
  });

  it('rejects sharing one attachment instance between players', async () => {
    const game = createGame();
    const first = await game.addPlayer();
    const second = await game.addPlayer();
    const item = await first.addItem(new InventoryItem({ id: 'one-only', name: 'One Only' }));

    await expect(second.addItem(item)).rejects.toThrow('another owner');
    expect(first.inventory).toContain(item);
    expect(second.inventory).not.toContain(item);
  });
});

describe('the default board and spatial navigation', () => {
  it('falls back to the first square when the focused square is removed', () => {
    const squares = [
      new Square({ id: 'first', name: 'First' }),
      new Square({ id: 'second', name: 'Second' })
    ];
    expect(activeSquareId(squares, 'second')).toBe('second');
    squares.pop();
    expect(activeSquareId(squares, 'second')).toBe('first');
    expect(activeSquareId([], 'second')).toBe(null);
  });

  it('has 100 squares in a left-to-right, top-to-bottom 10 by 10 layout', () => {
    const squares = createGame().board.squares;
    expect(squares).toHaveLength(100);
    expect(squares.map((square) => square.coordinates).slice(0, 11)).toEqual([
      ...Array.from({ length: 10 }, (_, x) => ({ x, y: 0 })),
      { x: 0, y: 1 }
    ]);
    expect(squares[19].coordinates).toEqual({ x: 9, y: 1 });
    expect(squares[99].coordinates).toEqual({ x: 9, y: 9 });
    squares[37].coordinates = { x: 6.5, y: 3.25 };
    expect(squares[37].position).toBe(37);
  });

  it('navigates by coordinates on a grid and an irregular board', () => {
    const squares = createGame().board.squares;
    expect(findSquareInDirection(squares, squares[0], { x: 1, y: 0 })).toBe(squares[1]);
    expect(findSquareInDirection(squares, squares[0], { x: 0, y: 1 })).toBe(squares[10]);
    expect(findSquareInDirection(squares, squares[0], { x: -1, y: 0 })).toBe(null);
    const [origin, nearDiagonal, right, distant] = [
      { position: 0, coordinates: { x: 0, y: 0 } },
      { position: 1, coordinates: { x: 1, y: 0.8 } },
      { position: 2, coordinates: { x: 1.5, y: 0.1 } },
      { position: 3, coordinates: { x: 5, y: 0 } }
    ];
    expect(findSquareInDirection([origin, nearDiagonal, right, distant], origin, { x: 1, y: 0 })).toBe(right);
    expect(findSquareInDirection([origin, nearDiagonal], origin, { x: 0, y: 1 })).toBe(nearDiagonal);
  });
});

describe('pregame roster', () => {
  it('assigns unique IDs and numbers, reuses vacant numbers, and locks at eight', async () => {
    const game = createGame();
    const players = await Promise.all(Array.from({ length: 3 }, () => game.addPlayer()));
    expect(new Set(players.map((player) => player.id)).size).toBe(3);
    expect(players.map((player) => player.number)).toEqual([1, 2, 3]);
    expect(players.every((player) => player.name.includes(' '))).toBe(true);
    await game.removePlayer(players[1]);
    expect((await game.addPlayer()).number).toBe(2);
    while (game.players.length < 8) await game.addPlayer();
    await expect(game.addPlayer()).rejects.toThrow('at most 8');
  });

  it('allows renaming before start and rejects roster changes after start', async () => {
    const game = createGame();
    await expect(game.startGame()).rejects.toThrow('Add an active player');
    const player = await game.addPlayer();
    await player.rename('Recursive Potato');
    expect(player.name).toBe('Recursive Potato');
    await game.startGame();
    await expect(player.rename('New Name')).rejects.toThrow('before the game starts');
    await expect(game.addPlayer()).rejects.toThrow('locked');
    await expect(game.removePlayer(player)).rejects.toThrow('locked');
  });

  it('validates a roster supplied at construction', () => {
    const board = new Board([new Square({ id: 'start', name: 'Start' })]);
    const players = Array.from({ length: 9 }, (_, index) => new Player({ id: `p-${index}`, name: `Player ${index}` }));
    expect(() => new Game({ board, players })).toThrow('at most 8');
    const game = new Game({ board, players: players.slice(0, 2) });
    expect(game.players.map((player) => player.number)).toEqual([1, 2]);
    expect(game.players.every((player) => player.colour)).toBe(true);
  });
});

describe('individual dice', () => {
  it('rolls a chosen group, preserves die identity, and supports custom rolls', async () => {
    const game = createGame();
    const d4 = new Die({ id: 'four', name: 'Four', sides: 4, roll: () => 3 });
    const d20 = new Die({ id: 'twenty', name: 'Twenty', sides: 20, roll: async () => 17 });
    const roll = await game.rollDice([d4, d20]);
    expect(roll.results).toEqual([{ die: d4, value: 3 }, { die: d20, value: 17 }]);
    expect([roll.total, roll.min, roll.max]).toEqual([20, 3, 17]);
    expect(game.dice[0].sides).toBe(6);
    const defaultValue = await game.dice[0].roll();
    expect(defaultValue).toBeGreaterThanOrEqual(1);
    expect(defaultValue).toBeLessThanOrEqual(6);
    await game.addDie(d4);
    expect(game.dice.map((die) => die.id)).toEqual(['demo-d6', 'four']);
    await expect(game.addDie(d4)).rejects.toThrow('already exists');
    expect(await game.removeDie('four')).toBe(d4);
  });
});

describe('board tokens', () => {
  it('places one centrally, two apart, and three to eight within the cell deterministically', () => {
    expect(tokenPositions(1)).toEqual([{ x: 0.5, y: 0.5 }]);
    expect(tokenPositions(2)).toEqual([{ x: 0.35, y: 0.5 }, { x: 0.65, y: 0.5 }]);
    for (let count = 3; count <= 8; count += 1) {
      const positions = tokenPositions(count);
      expect(positions).toHaveLength(count);
      expect(positions).toEqual(tokenPositions(count));
      expect(positions.every(({ x, y }) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
      expect(new Set(positions.map(({ x, y }) => `${x},${y}`)).size).toBe(count);
    }
  });
});
