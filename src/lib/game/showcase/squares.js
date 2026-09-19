import { Effect } from '../../engine/Effect.js';

export function configureShowcaseSquares(game) {
  const examples = [
    [0, 'Welcome Mat', 'Leaving starts the tour.', '🏁', '#f5dfa5', { visits: 12, mood: 'optimistic' }],
    [5, 'Cabbage Patch', 'Passing or landing grants cabbages.', '🥬', '#bfe6c2', { cabbages: 17 }],
    [12, 'Compiler Lab', 'Landing grants caffeine; leaving costs one.', '💻', '#c9ddf4', { caffeine: 4, difficulty: 'high' }],
    [28, 'Mystery Portal', 'Passing raises the world portal counter.', '🌀', '#dacbf5', { destination: 'unknown' }],
    [37, 'Tea Break', 'Landing grants a Sleepy effect.', '🫖', '#f4d5c7', { cups: 3 }],
    [72, 'Glitter Storm', 'Landing grants sparkles.', '✨', '#f1d7ed', { intensity: 8 }],
    [99, 'The Last Square', 'Landing counts a finish visit; there is no win condition.', '🎉', '#f9dfb8', { final: true }]
  ];
  for (const [position, name, description, icon, colour, stats] of examples) {
    Object.assign(game.board.squares[position], { name, description, icon, colour, stats });
  }

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
  cabbagePatch.onLeave = (game, player) => game.logEvent(`${player.name} left the Cabbage Patch.`, 'square');

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
  tea.onLeave = (game, player) => game.logEvent(`${player.name} left the Tea Break.`, 'square');

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

  return { cabbagePatch, lab, portal, tea, glitter, lastSquare };
}
