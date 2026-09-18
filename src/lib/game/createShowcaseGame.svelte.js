import { createGame } from './createGame.js';
import { Action } from '../engine/Action.js';
import { Card } from '../engine/Card.svelte.js';
import { Deck } from '../engine/Deck.svelte.js';
import { Die } from '../engine/Die.svelte.js';
import { Effect } from '../engine/Effect.js';
import { InventoryItem } from '../engine/InventoryItem.js';
import { Player } from '../engine/Player.svelte.js';
import { Rule } from '../engine/Rule.js';

// A temporary, interactive fixture. Every example uses the same public commands
// and hooks that a contributor would use in the real game.
export function createShowcaseGame() {
  const game = createGame();
  const sampleSquares = [
    [0, 'Welcome Mat', 'Leaving starts the tour.', '🏁', '#f5dfa5', { visits: 12, mood: 'optimistic' }],
    [5, 'Cabbage Patch', 'Passing or landing grants cabbages.', '🥬', '#bfe6c2', { cabbages: 17 }],
    [12, 'Compiler Lab', 'Landing grants caffeine; leaving costs one.', '💻', '#c9ddf4', { caffeine: 4, difficulty: 'high' }],
    [28, 'Mystery Portal', 'Passing raises the world portal counter.', '🌀', '#dacbf5', { destination: 'unknown' }],
    [37, 'Tea Break', 'Landing grants a Sleepy effect.', '🫖', '#f4d5c7', { cups: 3 }],
    [72, 'Glitter Storm', 'Landing grants sparkles.', '✨', '#f1d7ed', { intensity: 8 }],
    [99, 'The Last Square', 'Landing counts a finish visit; there is no win condition.', '🎉', '#f9dfb8', { final: true }]
  ];
  for (const [position, name, description, icon, colour, stats] of sampleSquares) {
    Object.assign(game.board.squares[position], { name, description, icon, colour, stats });
  }
  game.stats = { worldMood: 'mildly chaotic', visits: 42 };

  const welcome = game.board.squares[0];
  welcome.onLeave = async (game, player) => {
    await welcome.incrementStat('departures');
    await game.logEvent(`${player.name} left the Welcome Mat.`, 'square');
  };

  const cabbagePatch = game.board.squares[5];
  cabbagePatch.onPass = async (game, player) => {
    const spoon = player.inventory.find((item) => item.id === 'spoon');
    const amount = spoon?.getStat('lucky') ? 2 : 1;
    await player.incrementStat('cabbages', amount);
    await game.logEvent(`${player.name} passed the Cabbage Patch (+${amount}).`, 'square');
  };
  cabbagePatch.onLand = async (game, player) => {
    await player.incrementStat('cabbages', 3);
    await game.logEvent(`${player.name} landed on the Cabbage Patch (+3).`, 'square');
  };
  cabbagePatch.onLeave = async (game, player) => {
    await game.logEvent(`${player.name} left the Cabbage Patch.`, 'square');
  };

  const lab = game.board.squares[12];
  lab.onLand = async (game, player) => {
    await player.incrementStat('caffeine', 2);
    await game.logEvent(`${player.name} landed in the Compiler Lab (+2 caffeine).`, 'square');
  };
  lab.onLeave = async (game, player) => {
    await player.decrementStat('caffeine');
    await game.logEvent(`${player.name} left the Compiler Lab (-1 caffeine).`, 'square');
  };

  const portal = game.board.squares[28];
  portal.onPass = async (game, player) => {
    await game.incrementStat('portalsPassed');
    await game.logEvent(`${player.name} passed the Mystery Portal.`, 'square');
  };
  portal.onLand = async (game, player) => {
    await portal.incrementStat('landings');
    await game.logEvent(`${player.name} landed on the Mystery Portal.`, 'square');
  };

  const tea = game.board.squares[37];
  tea.onLand = async (game, player) => {
    if (!player.effects.some((effect) => effect.id === 'sleepy')) {
      await player.addEffect(new Effect({ id: 'sleepy', name: 'Sleepy', description: 'Loses one caffeine on each roll.', duration: 3 }));
    }
    await game.logEvent(`${player.name} took a Tea Break.`, 'square');
  };
  tea.onLeave = async (game, player) => {
    await game.logEvent(`${player.name} left the Tea Break.`, 'square');
  };

  const glitter = game.board.squares[72];
  glitter.onLand = async (game, player) => {
    await player.incrementStat('sparkles', 2);
    await glitter.incrementStat('intensity');
    await game.logEvent(`${player.name} landed in the Glitter Storm (+2 sparkles).`, 'square');
  };
  glitter.onPass = async (game, player) => {
    await player.incrementStat('sparkles');
    await game.logEvent(`${player.name} passed the Glitter Storm (+1 sparkle).`, 'square');
  };

  const lastSquare = game.board.squares[99];
  lastSquare.onLand = async (game, player) => {
    await game.incrementStat('visits');
    await game.logEvent(`${player.name} visited the last square.`, 'square');
  };

  const cabbageCard = new Card({ id: 'cabbage-card', name: 'Cabbage Rain', description: 'Drawing and playing grant cabbages; discarding updates this card.', icon: '🥬', stats: { rarity: 'common', cabbages: 3 } });
  cabbageCard.onDraw = async (game, player) => {
    await player?.incrementStat('cabbages');
    await game.logEvent(`${player?.name ?? 'Someone'} drew Cabbage Rain (+1 cabbage).`, 'card-hook');
  };
  cabbageCard.onPlay = async (game, player) => {
    await player?.incrementStat('cabbages', 3);
    await game.logEvent(`${player?.name ?? 'Someone'} played Cabbage Rain (+3 cabbages).`, 'card-hook');
  };
  cabbageCard.onDiscard = async (game) => {
    await cabbageCard.incrementStat('discardCount');
    await game.logEvent('Cabbage Rain recorded its discard.', 'card-hook');
  };

  const mirrorCard = new Card({ id: 'mirror-card', name: 'Mirror Maze', description: 'Playing jumps to the Mystery Portal.', stats: { turns: 2, reusable: false } });
  mirrorCard.onPlay = async (game, player) => {
    await player?.moveTo(portal.position);
  };
  const plainCard = new Card({ id: 'blank-card', name: 'Plain Card' });
  const curiosityDeck = new Deck({ id: 'curiosity', name: 'Curiosity Cards', stats: { theme: 'unpredictable', rarity: 2 }, cards: [cabbageCard, mirrorCard, plainCard] });

  const libraryCard = new Card({ id: 'library-card', name: 'Library Shortcut', description: 'Playing walks four squares.', icon: '📚', stats: { distance: 4 } });
  libraryCard.onPlay = async (game, player) => {
    await player?.move(4);
  };
  const penguinCard = new Card({ id: 'penguin-card', name: 'Penguin Parade', description: 'Playing adds a penguin counter to the player.', stats: { penguins: 8 } });
  penguinCard.onPlay = async (game, player) => {
    await player?.incrementStat('penguins', 8);
  };
  const campusDeck = new Deck({ id: 'campus', name: 'Campus Encounters', stats: { edition: 'open day' }, cards: [libraryCard, penguinCard] });
  game.decks = [curiosityDeck, campusDeck];
  for (const deck of game.decks) game.attach(deck);

  const bonusDie = new Die({ id: 'bonus-d4', name: 'Bonus die', sides: 4, colour: '#dcecd3', stats: { temperament: 'friendly' } });
  const cursedDie = new Die({
    id: 'cursed-d8', name: 'Cursed die', sides: 8, colour: '#e9d9f1',
    stats: { curse: 'rolls 1 while Sleepy, otherwise 7' },
    roll: ({ player }) => player?.effects.some((effect) => effect.id === 'sleepy') ? 1 : 7
  });
  game.dice.push(bonusDie, cursedDie);
  game.attach(bonusDie);
  game.attach(cursedDie);

  const observer = new Rule({
    id: 'observer', name: 'Clockwork Observer', description: 'Counts rolls, played cards, and deck changes.',
    stats: { curious: true }, handlers: {
      'dice:rolled': async (game) => {
        await observer.incrementStat('rollsObserved');
        await game.logEvent('Clockwork Observer counted a roll.', 'rule');
      },
      'card:played': async (game) => {
        await observer.incrementStat('cardsObserved');
        await game.logEvent('Clockwork Observer counted a played card.', 'rule');
      },
      'deck:reset': async (game) => {
        await observer.incrementStat('deckResets');
        await game.logEvent('Clockwork Observer saw a deck reset.', 'rule');
      },
      'deck:shuffled': async (game) => {
        await observer.incrementStat('shuffles');
        await game.logEvent('Clockwork Observer saw a shuffle.', 'rule');
      }
    }
  });
  const effectsRule = new Rule({
    id: 'effects-rule', name: 'Visible Consequences', description: 'Effects and items change player stats on domain events.', handlers: {
      'dice:rolled': async (game, { player }) => {
        if (!player) return;
        if (player.effects.some((effect) => effect.id === 'sparkly')) await player.incrementStat('sparkles');
        if (player.effects.some((effect) => effect.id === 'sleepy')) await player.decrementStat('caffeine');
        if (player.effects.some((effect) => effect.id === 'buzzing')) await player.incrementStat('caffeine', 2);
        if (player.inventory.some((item) => item.id === 'hat')) await player.incrementStat('hatLuck');
        await game.logEvent(`${player.name}'s effects and items reacted to the roll.`, 'rule');
      },
      'player:effect-added': async (game, { player, effect }) => {
        await player.incrementStat('effectChanges');
        await game.logEvent(`${effect.name} took effect on ${player.name}.`, 'rule');
      },
      'player:effect-removed': async (game, { player, effect }) => {
        await player.incrementStat('effectChanges');
        await game.logEvent(`${effect.name} stopped affecting ${player.name}.`, 'rule');
      },
      'player:item-added': async (game, { player, item }) => {
        await game.logEvent(`${item.name} is available to ${player.name}.`, 'rule');
      },
      'player:item-removed': async (game, { player, item }) => {
        await game.logEvent(`${item.name} no longer helps ${player.name}.`, 'rule');
      }
    }
  });
  game.rules.push(observer, effectsRule);

  const spoon = new InventoryItem({ id: 'spoon', name: 'Silver Spoon', description: 'Doubles the reward for passing the Cabbage Patch.', stats: { polish: 8, lucky: true } });
  const players = [
    new Player({ id: 'showcase-1', name: 'Recursive Potato', position: 0,
      stats: { cabbages: 17, caffeine: 8, dignity: 'questionable', ready: true },
      inventory: [spoon, new InventoryItem({ id: 'hat', name: 'Paper Hat', description: 'A roll grants one hatLuck while carried.' })],
      effects: [
        new Effect({ id: 'sparkly', name: 'Sparkly', description: 'A roll grants one sparkle.', duration: 3, stats: { intensity: 'maximum' } }),
        new Effect({ id: 'sleepy', name: 'Sleepy', description: 'A roll costs one caffeine and makes the cursed die roll 1.' })
      ]
    }),
    new Player({ id: 'showcase-2', name: 'Caffeinated Goblin', position: 0, stats: { caffeine: 9, votes: 2 } }),
    new Player({ id: 'showcase-3', name: 'Suspicious Compiler', position: 12, stats: { warnings: 0 } }),
    new Player({ id: 'showcase-4', name: 'Chaotic Badger', position: 37, stats: { chaos: 11 } }),
    new Player({ id: 'showcase-5', name: 'Sleepy Penguin', position: 99, stats: { naps: 4 } })
  ];

  let heldCard = $state(null);
  let heldDeck = $state(null);
  const playing = (game, player) => game.status === 'playing' && !!player;
  const showcaseActions = [
    new Action({ id: 'showcase-walk-six', label: 'Walk 6', description: 'Leave Start and pass the Cabbage Patch.', available: playing, perform: (game, player) => player.move(6) }),
    new Action({ id: 'showcase-jump-cabbage', label: 'Jump to Cabbages', description: 'Land on square 6 without passing intervening squares.', available: playing, perform: (game, player) => player.moveTo(cabbagePatch.position) }),
    new Action({ id: 'showcase-jump-lab', label: 'Jump to Lab', description: 'Land on square 13 without passing intervening squares.', available: playing, perform: (game, player) => player.moveTo(lab.position) }),
    new Action({ id: 'showcase-walk-tea', label: 'Walk to Tea', description: 'Walk a path to square 38, passing the Mystery Portal.', available: playing, perform: (game, player) => player.move(tea.position - player.position) }),
    new Action({ id: 'showcase-jump-glitter', label: 'Jump to Glitter', description: 'Land on square 73 and update its intensity.', available: playing, perform: (game, player) => player.moveTo(glitter.position) }),
    new Action({ id: 'showcase-walk-finish', label: 'Walk to Finish', description: 'Walk a path to square 100 and count the visit.', available: playing, perform: (game, player) => player.move(lastSquare.position - player.position) }),
    new Action({ id: 'showcase-draw-curiosity', label: 'Draw Curiosity', available: (game, player) => playing(game, player) && !heldCard && curiosityDeck.drawPile.length > 0, perform: async (game, player) => { heldDeck = curiosityDeck; heldCard = await game.drawCard(curiosityDeck, player); } }),
    new Action({ id: 'showcase-draw-campus', label: 'Draw Campus', available: (game, player) => playing(game, player) && !heldCard && campusDeck.drawPile.length > 0, perform: async (game, player) => { heldDeck = campusDeck; heldCard = await game.drawCard(campusDeck, player); } }),
    new Action({ id: 'showcase-play-card', label: 'Play drawn card', available: (game, player) => playing(game, player) && !!heldCard, perform: (game, player) => heldCard.play(player) }),
    new Action({ id: 'showcase-discard-card', label: 'Discard drawn card', available: (game, player) => playing(game, player) && !!heldCard, perform: async (game, player) => { await heldDeck.discard(heldCard, player); heldCard = null; heldDeck = null; } }),
    new Action({ id: 'showcase-reset-deck', label: 'Reset & shuffle', description: 'Reset the Curiosity deck, then shuffle its draw pile.', available: playing, perform: async () => { await curiosityDeck.reset(); await curiosityDeck.shuffle(); } }),
    new Action({ id: 'showcase-reset-campus', label: 'Reset Campus', description: 'Return Campus cards to the draw pile so Library Shortcut can be played.', available: playing, perform: () => campusDeck.reset() }),
    new Action({ id: 'showcase-toggle-buzz', label: 'Toggle Buzzing', description: 'Add or remove an effect; it changes caffeine on rolls.', available: playing, perform: (game, player) => player.effects.some((effect) => effect.id === 'buzzing')
      ? player.removeEffect('buzzing')
      : player.addEffect(new Effect({ id: 'buzzing', name: 'Buzzing', description: 'A roll grants two caffeine.', duration: 2 })) }),
    new Action({ id: 'showcase-remove-sleepy', label: 'Remove Sleepy', description: 'Change the cursed die back to its normal showcase value.', available: (game, player) => playing(game, player) && player.effects.some((effect) => effect.id === 'sleepy'), perform: (game, player) => player.removeEffect('sleepy') }),
    new Action({ id: 'showcase-toggle-spoon', label: 'Toggle Spoon', description: 'Add or remove the Silver Spoon and compare Cabbage Patch rewards.', available: playing, perform: (game, player) => player.inventory.some((item) => item.id === 'spoon')
      ? player.removeItem('spoon')
      : player.addItem(new InventoryItem({ id: 'spoon', name: spoon.name, description: spoon.description, stats: { ...spoon.stats } })) })
  ];
  game.actions.push(...showcaseActions);

  async function populate() {
    for (const player of players) await game.addPlayer(player);
    // Keep a populated discard pile without consuming the first interactive card.
    const discarded = await campusDeck.draw(null);
    await campusDeck.discard(discarded, null);
    await game.logEvent('Showcase ready. Start the game to try the example actions.', 'system');
  }

  return { game, players, curiosityDeck, campusDeck, observer, populate };
}
