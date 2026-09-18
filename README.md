# Stir It Up

A deliberately empty, local board-game playground for the University of Stirling Computing Club. It uses SvelteKit, Svelte 5 runes, plain JavaScript, and Bootstrap. The starting session has a 100-square board, an empty player roster, an empty deck, and one d6. It has no real game rules, cards, scoring, economy, or win condition.

## Run it

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` checks the production bundle, `npm run check` runs Svelte diagnostics, and `npm test` runs the small engine suite.

## How it fits together

`src/lib/engine/` contains ordinary JavaScript classes. `Game.svelte.js`, `Player.svelte.js`, `Board.svelte.js`, `Square.svelte.js`, `Deck.svelte.js`, `Turn.svelte.js`, and `Stats.svelte.js` use Svelte 5 `$state` fields. Components read those fields directly, so a command changing a player or stat updates the board and panels without a refresh. Each page creates its own in-memory game session. SvelteKit server rendering remains enabled; there is no persistence or networking yet.

Game state describes what is true now. Commands change what is true. Events describe what happened. Svelte renders what is true and reacts to what happened.

Use subject methods for changes: `await player.move(-5)`, `await player.setStat('cabbages', 12)`, `await player.addItem(item)`, or `await square.setStat('difficulty', 2)`. The methods are async because they await domain event listeners. Stats are generic named values on players, squares, cards, decks, dice, rules, effects, items, and the game. `getStat` and `hasStat` are synchronous; `addStat`, `setStat`, `incrementStat`, `decrementStat`, and `removeStat` are async. `addStat` requires the name to be absent; incrementing a missing stat starts at zero. Numeric operations reject nonnumeric values.

`EventBus.emit` calls listeners one at a time and awaits each. Engine commands update canonical state, emit domain events, and add persistent human-readable log entries. The toast component subscribes to `dice:rolled` separately; toasts are transient UI state. A future animation listener can also await its work without putting animation code in the engine.

## Extend it

`src/lib/game/createGame.js` owns the neutral 10 × 10 layout and the tiny demonstration flow. Each `Square` has a stable ID, a logical `position`, and independent `{ x, y }` coordinates; coordinates may be fractional. Add squares there or use `await game.board.addSquare(square)` and `await game.board.removeSquare(id)` at runtime. Board edits reindex positions while preserving coordinates and update players without triggering movement hooks. The board uses coordinates for display and arrow-key navigation. Square subclasses can override async `onLand`, `onLeave`, and `onPass`.

The waiting screen lets you add up to eight players, rename or remove them, then start. `await game.addPlayer()` creates a random name, stable ID, number, and colour. `await player.rename(name)` and `await game.removePlayer(player)` work only before the game starts. One player is enough to start.

Each `Die` has its own ID, sides, colour, stats, and roll function. Pass `roll: async ({ game, player }) => value` to customise one without subclassing. `await game.rollDice([dieA, dieB])` returns a `DiceRoll` with `{ die, value }` entries and optional `total`, `min`, and `max` helpers. Use `await game.addDie(die)` to add one to the visible game collection.

Add `Card` instances to a `Deck`; card hooks are `onDraw`, `onPlay`, and `onDiscard`, and `await card.play(player)` emits a domain event. Add `Rule` objects with event handlers, or pass new `Action` objects into the game to change what the action panel offers. Turn phases can be replaced by passing a `phases` array to `Game`. No UI change is needed to show new squares, players, stats, items, effects, decks, dice, cards, log entries, or available actions. `StatsList.svelte` handles named values dynamically; `PlayerCard.svelte` shows inventories and effects in compact details.

The demonstration buttons deliberately separate rolling from moving. `Roll dice` records a result; `Move by roll` then calls `player.move(result.total)`; `End turn` selects the next active player. These actions are examples of wiring, not rules for a future game.

## Browser verification

With the dev server running, add players, start the game, roll, move, and end a turn. The board has one Tab stop: use arrow keys to move spatially, Home and End to reach the first and last logical squares, and Tab to leave it. Hovering or focusing a square shows its Bootstrap tooltip; its button name also contains the information for screen readers.
