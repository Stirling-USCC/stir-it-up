We are building a deliberately generic, extensible web-based board-game engine for the University of Stirling Computing Club.

The immediate goal is to produce a functional skeleton with the core engine concepts, reactive state, async events, and a basic usable UI. Do not invent an actual game yet. There should be no meaningful rules, cards, items, scoring system, win conditions, economy, or special board squares beyond neutral placeholders.

The project is intended to be hacked on by beginners and AI coding agents, so favour obvious, boring JavaScript over clever abstractions.

## Technology

Use:

* SvelteKit
* Svelte 5
* plain JavaScript, not TypeScript
* Svelte runes for reactive game state
* Bootstrap for normal UI/layout/components
* Bootstrap Icons and/or emojis where they improve clarity, especially for ad-hoc square or action icons
* a small amount of custom CSS where needed
* a custom lightweight asynchronous event bus
* no third-party state-management library
* no database yet
* no authentication yet
* no multiplayer networking yet

The game should run entirely locally for now, but preserve SvelteKit’s server-side capability for future features.

## Core architectural rule

The game data is canonical.

The UI should render whatever exists in game state rather than knowing about particular game mechanics.

For example:

* player stats should be rendered by iterating over whatever stats a player currently has
* cards, squares, decks, and other game objects should be able to expose arbitrary stats
* inventory should render whatever items exist
* effects should render whatever effects exist
* board squares should render from board data
* decks should render from deck data where relevant
* the game log should render arbitrary log entries
* available actions should eventually be dynamically rendered rather than hard-coded into the UI

Avoid UI logic such as `if (gameUsesMoney)` or hard-coded knowledge of specific future mechanics.

Use this conceptual flow:

Game commands
-> modify canonical reactive game state
-> emit domain events
-> Svelte automatically updates persistent UI
-> transient UI listeners may react to events

State represents what is true now.

Events represent what happened.

## Generic stats on game objects

Use the term stats for arbitrary named values attached to game objects.

Players, cards, squares, decks, effects, inventory items, and other relevant engine objects may all have stats.

A stats collection is a generic pile of named values. It must not assume that values are only numbers, although numeric operations are especially important.

The API should support, where appropriate:

* get a stat
* set a stat
* increment a numeric stat
* decrement a numeric stat
* add a stat
* remove a stat
* check whether a stat exists
* act upon a stat through ordinary game logic or hooks

Use clear, consistent method names. A reasonable baseline is:

* `getStat(name)`
* `setStat(name, value)`
* `incrementStat(name, amount)`
* `decrementStat(name, amount)`
* `removeStat(name)`
* `hasStat(name)`

If `addStat` is useful for the chosen representation, provide it with clearly documented semantics. Do not create separate bespoke APIs for money, health, score, or other imagined mechanics.

Stats should be easy for future rules and actions to inspect and modify.

For example:

```js
player.setStat("cabbages", 12);
player.incrementStat("cabbages", 3);
player.decrementStat("cabbages", 2);
player.removeStat("cabbages");
```

The UI should render arbitrary stats automatically without knowing their names.

Use a small reusable stats helper or base abstraction only if it remains obvious and beginner-friendly. Do not introduce a complicated inheritance hierarchy or opaque proxy system.

## Important mutation rule

Do not encourage arbitrary external mutation of game state.

Although Svelte’s reactive state technically allows direct mutation, gameplay code should normally use methods on the object that owns the affected subject.

In general, commands that affect a particular subject should be methods on that subject.

Prefer:

```js
player.move(-5);
player.setStat("cabbages", 12);
player.incrementStat("cabbages", 3);
player.addItem(item);
player.addEffect(effect);
square.setStat("difficulty", 2);
card.setStat("rarity", "common");
```

over:

```js
game.movePlayer(player, -5);
game.setPlayerStat(player, "cabbages", 12);
```

The `Game` object should coordinate game-wide operations, turn flow, player registration, rules, and event routing. A subject should own operations that directly change that subject.

Use methods such as:

### Game methods

* `addPlayer(...)`
* `removePlayer(...)`
* `startGame()`
* `changeCurrentPlayer(...)`
* `beginTurn()`
* `endTurn()`
* `drawCard(...)`
* `logEvent(...)`
* `getPlayerById(...)`
* `getCurrentPlayer()`

### Player methods

* `move(amount)`
* `moveTo(position)`
* `setStat(name, value)`
* `incrementStat(name, amount)`
* `decrementStat(name, amount)`
* `removeStat(name)`
* `addItem(item)`
* `removeItem(item)`
* `addEffect(effect)`
* `removeEffect(effect)`

The player’s movement methods may need access to the board or a movement resolver supplied during construction. Keep that dependency explicit and simple.

Objects may reference the `Game` object, an event bus, a board, or another relevant collaborator when doing so makes the implementation more readable. Do not add indirection merely to avoid such references. Let the agent choose the clearest straightforward design for each object.

These methods are future extension points for:

* validation
* logging
* event emission
* multiplayer synchronisation
* undo/history
* animations

Keep underlying data straightforward and inspectable.

## Async event bus

Implement a small generic event bus.

It should support roughly:

* `on(type, handler)`
* `once(type, handler)`
* `off(...)` if useful
* returned unsubscribe functions
* `await emit(type, detail)`

Listeners should be allowed to return promises.

Default event dispatch should be sequential and deterministic:

1. call listener
2. await it
3. call next listener

Do not use `Promise.all()` for the normal event path.

This is deliberate because future UI animation listeners may need to delay the engine before the next action occurs.

The engine must not itself know about animations.

For example, eventually this should be possible:

```js
await game.events.emit("player:moved", {
    player,
    from,
    to
});
```

and a UI listener may later do:

```js
game.events.on("player:moved", async event => {
    await animatePlayerMovement(event);
});
```

Do not implement animation infrastructure yet beyond ensuring the event architecture can support this.

## Core objects

Implement these as normal JavaScript classes/modules where appropriate.

### Game

The `Game` object owns the current session.

It should contain or reference:

* board
* players
* decks
* dice
* rules
* game-wide stats if useful
* turn state
* game status
* event log
* event bus

Game-wide values should use the same generic stats concept where appropriate rather than introducing a separate bespoke value system.

Suggested statuses:

* `waiting`
* `playing`
* `finished`

Suggested turn phases:

* `start`
* `roll`
* `move`
* `action`
* `end`

These are generic starting values, not rigid game rules.

Provide useful generic methods such as:

* add/remove player
* start game
* change current player
* begin/end turn
* draw a card
* log an event
* get a player by ID
* get the current player

Do not make `Game` the default owner of player-specific commands when the player can own them directly. For example, prefer `player.move(-5)` over `game.movePlayer(player, -5)`.

Prefer derived values where something can be computed instead of duplicated in state.

For example, do not store `player.isCurrentPlayer` if that can be derived from the current player ID.

### Player

A Player should include:

* stable ID
* display name
* board position
* active/eliminated state
* arbitrary stats
* arbitrary inventory
* arbitrary active effects
* optional CSS/class/display metadata

The stats structure must be generic and use the common stats API.

Do not hard-code money, score, health, or any other specific stat.

It should be possible later to create arbitrary values such as:

```js
player.setStat("cabbages", 12);
```

and have the UI render that automatically.

Provide methods such as:

* `move`
* `moveTo`
* `setStat`
* `getStat`
* `incrementStat`
* `decrementStat`
* `removeStat`
* `addItem`
* `removeItem`
* `addEffect`
* `removeEffect`

These should emit sensible domain events.

### Board

A Board should own an ordered collection of squares.

Initially support a simple linear/wrapping board.

Separate logical board position from visual layout.

A square may have a numeric logical position while also optionally having row/column or other future layout metadata.

Provide methods such as:

* get square by position
* get square by ID
* resolve movement/wrapping
* return a path between positions if useful

Do not over-engineer branching paths yet.

The board may provide movement resolution to the Player, but the Player should remain the owner of the public movement command.

### Square

A Square should be mostly data.

Suggested properties:

* ID
* name
* description
* logical position
* optional row/column
* optional icon or emoji
* optional CSS class/display metadata
* arbitrary stats

Support extension hooks such as:

* `onLand`
* `onLeave`
* `onPass`

These may be async.

For now, create only neutral placeholder squares whose hooks do nothing.

### Card

Implement the concept of a Card even though there should initially be no meaningful cards.

Suggested properties:

* ID
* name
* description
* arbitrary stats
* optional display metadata
* optional image reference
* hooks such as `onDraw`, `onPlay`, `onDiscard`

Hooks may be async.

### Deck

A Deck should contain:

* stable ID
* name
* cards
* draw pile
* discard pile
* arbitrary stats

Support:

* reset
* shuffle
* draw
* discard
* generic stat operations

Do not create actual gameplay cards yet.

### Dice

Do not assume one six-sided die globally.

Represent dice generically.

A die/dice configuration should support:

* number of dice
* number of sides
* optional modifier
* arbitrary stats if useful

Rolling should return structured information such as:

```js
{
    rolls: [4],
    modifier: 0,
    total: 4
}
```

The initial UI may have one ordinary d6 purely to demonstrate that the engine works.

Rolling the die must not yet automatically imply any game rule unless needed for the most basic turn demonstration.

### Turn

Implement a small generic turn-state representation.

A default flow may resemble:

* start
* roll
* move
* action
* end

But do not hard-code this so aggressively that future rules cannot alter or skip phases.

Track:

* turn number
* current player ID
* current phase

Changing turn/phase should emit events.

### Action

Implement a generic Action concept now, even if only minimally used.

An action should roughly contain:

* stable ID
* label
* optional description
* optional icon or emoji
* `available(game, player)`
* async `perform(game, player)`
* arbitrary stats if useful

The UI should eventually be able to render arbitrary available actions.

For the initial implementation, provide only the minimum actions necessary to demonstrate the engine, such as rolling a die or ending a turn.

### Rule

Implement a Rule concept but no actual gameplay rules.

A rule should be able to:

* have ID/name/description
* have arbitrary stats if useful
* register handlers for game events
* optionally perform setup/teardown

The point is to establish an obvious extension surface for future contributors.

Do not invent example rules beyond perhaps a completely inert demonstration object if necessary for testing.

### Effect

Implement a generic persistent effect structure.

Suggested properties:

* ID
* name
* description
* optional duration
* arbitrary stats
* optional metadata

Do not invent actual effects.

### Inventory Item

Represent inventory items as generic objects with at least:

* ID
* name
* description
* arbitrary stats
* optional metadata

Do not add actual items.

### Log Entry

The game should maintain a persistent human-readable event log.

A log entry should contain at least:

* ID
* timestamp or sequence number
* message
* optional category/type
* optional structured metadata

Useful engine commands should write basic log entries where appropriate.

Examples:

* player added
* game started
* turn changed
* die rolled
* player moved

The log is both UI and debugging infrastructure.

## Domain events

Establish sensible event names from the beginning.

Examples:

* `game:started`
* `game:finished`
* `player:added`
* `player:removed`
* `player:moved`
* `player:stat-changed`
* `player:item-added`
* `player:item-removed`
* `player:effect-added`
* `player:effect-removed`
* `object:stat-changed` where a generic stat event is useful
* `turn:started`
* `turn:phase-changed`
* `turn:ended`
* `dice:rolled`
* `card:drawn`
* `card:played`
* `log:added`

Use more specific events where they improve clarity, but do not create a separate event name for every possible stat name.

Avoid emitting UI-specific events such as `bootstrap:show-toast`.

The engine emits domain events. UI code decides how those should be presented.

## Reactivity

Use Svelte 5’s native reactivity.

The main engine state should live in `.svelte.js` modules/classes where appropriate so `$state` and `$derived` can be used outside components.

Do not introduce Redux, Zustand, MobX, XState, or another store library.

Keep the public engine API ordinary JavaScript objects and methods.

Svelte components should be able to receive a `Game` instance and automatically update when its state changes.

Ensure that mutations performed through subject methods, including stat changes and player movement, are visible to Svelte without requiring manual refreshes.

## Basic initial game state

Create enough placeholder data to make the application visibly functional, but do not design a game.

For example:

* 2 placeholder players
* roughly 12-20 neutral board squares
* one ordinary d6
* zero or an empty placeholder deck
* no meaningful player stats
* empty inventories
* empty effects
* no gameplay rules
* no win condition

The app should allow us to exercise the engine manually.

A minimal interaction loop can exist purely as an engine demonstration:

1. start game
2. current player rolls
3. current player moves by the result
4. landing on the destination square does nothing
5. turn passes to next player

This is not intended to be “the rules of the game”. It is merely enough behaviour to prove the board/turn/dice/movement infrastructure works.

Keep this behaviour isolated enough that contributors can later replace or modify it.

## UI

Build a plain but pleasant Bootstrap UI.

Do not spend substantial time on custom design.

Avoid making the interface ridiculously cluttered. Prefer progressive disclosure and compact summaries over showing every detail at once.

The page should roughly contain:

### Header/status area

Show:

* project/game title
* game status
* turn number
* current player
* current phase

Keep this compact, using badges, small cards, or a concise status bar where appropriate.

### Board

Render every square from board data.

Use Bootstrap’s responsive grid rather than an HTML table or a rigid fixed CSS Grid.

Use `.row` together with `.row-cols-*` classes, responsive column classes, or an equally quick-to-implement responsive Bootstrap layout. The board should automatically adapt to different viewport sizes and continue working if squares are added or removed.

For example, a board container may use classes such as:

```html
<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-2">
```

Choose the exact responsive classes based on the resulting layout.

Bootstrap may provide the surrounding layout/card/container.

Squares should show:

* name
* position/number if useful
* players currently occupying the square
* an optional icon or emoji where it improves recognition without implying game mechanics

No hard-coded square count in the component.

The board should continue working if squares are added or removed.

### Player panel

Render all players from state, but keep the default view compact.

Use a Bootstrap accordion, collapsible sections, tabs, or a similarly simple progressive-disclosure pattern.

Prefer showing the current player expanded by default, with other players collapsed unless the user manually opens them.

For each player, make it possible to inspect:

* name
* position
* arbitrary stats
* arbitrary inventory
* arbitrary effects
* active/current-player indication

Do not hard-code known stat names.

If a new stat is inserted into player state at runtime, it should appear without changing the component.

Do not show every inventory item, effect detail, and metadata field in the main page if doing so makes the interface cluttered. Use compact counts, badges, summaries, collapsible sections, or a focused detail view where appropriate.

Use a modal only when it genuinely improves the flow for inspecting a larger collection of information. Do not put every small detail in a modal, because large modals can interrupt the game flow.

### Actions

Render currently available actions.

For now this may just be:

* Start Game
* Roll Dice
* End Turn

depending on game state.

Do not tightly couple the UI to these exact actions. Use the generic Action model wherever practical.

Use clear buttons with optional Bootstrap Icons or emojis where helpful, but do not rely on icons alone to communicate meaning.

### Dice result

Show the most recent die result in a compact, visible area.

No animation needed.

### Event log

Render the persistent game log without allowing it to dominate the page.

Use a compact list, scrollable region, or collapsible panel if necessary.

Newest entries may appear at the bottom or top, whichever is simpler and accessible.

### Toasts

Create a small UI-side event subscriber that demonstrates transient event handling with Bootstrap toasts.

For example, a `dice:rolled` or `player:moved` event may briefly show a toast.

The toast itself should not become part of canonical game state.

This is mainly to prove that persistent state rendering and transient event reactions are separate mechanisms.

Keep toast frequency and accessibility in mind so the interface does not become noisy.

## Accessibility

Use semantic HTML and Bootstrap’s accessibility conventions.

Important:

* buttons must be real buttons
* game status changes should be understandable to screen-reader users
* don’t rely exclusively on colour
* player pieces must have accessible text/labels
* board squares should have useful accessible names
* accordion controls must have correct labels and expanded/collapsed state
* modal controls, if used, must be keyboard accessible and properly labelled
* toasts should not spam or unnecessarily interrupt screen readers
* keyboard users must be able to operate all controls
* icons and emojis should have suitable accessible text or be hidden from assistive technology when decorative

Do not attempt highly sophisticated board accessibility yet, but avoid creating obvious barriers.

## Code organisation

Use a structure roughly like:

```text
src/
    lib/
        engine/
            Game.svelte.js
            Player.svelte.js
            Board.svelte.js
            Square.js
            Card.js
            Deck.svelte.js
            Dice.js
            Action.js
            Rule.js
            Effect.js
            InventoryItem.js
            Stats.js
            EventBus.js
        game/
            createGame.js
        components/
            Board.svelte
            Square.svelte
            PlayerList.svelte
            PlayerCard.svelte
            ActionPanel.svelte
            DiceDisplay.svelte
            GameLog.svelte
            GameStatus.svelte
            Toasts.svelte
    routes/
        +page.svelte
```

This is guidance, not a requirement. Adjust it if a cleaner SvelteKit layout becomes obvious.

Keep engine code independent of Bootstrap and DOM APIs.

UI components may depend on Bootstrap.

## Bootstrap

Install/use Bootstrap in the normal SvelteKit-compatible way.

Use Bootstrap primarily for:

* container/grid/layout
* responsive `.row-cols-*` board layouts
* cards
* buttons
* badges
* alerts
* accordions/collapse
* toasts
* lists
* responsive behaviour
* modals only where they genuinely improve information flow

Use Bootstrap Icons if they can be added simply and consistently. Emojis are also allowed for lightweight, ad-hoc visual cues such as neutral square icons.

Avoid wrapping every tiny thing in custom CSS.

Custom CSS is completely acceptable where the board or compact responsive layout actually needs it.

## Tests

Add lightweight tests for the engine if test infrastructure can be added without wasting a large amount of time.

Prioritise tests around:

* async EventBus ordering
* generic stats operations on players and at least one other game object
* player movement and movement/wrapping
* deck draw/discard
* turn progression
* emitted events
* subject-owned commands such as `player.move(...)`

Do not build a giant test suite yet.

Codex has access to the Playwright MCP server. Use it during testing to:

* start the development server
* inspect the rendered page
* exercise the main controls
* verify that the board is responsive enough at representative viewport sizes
* verify that starting the game, rolling, moving, and ending turns update the UI
* verify that the player accordion or other progressive-disclosure UI behaves correctly
* check that toasts and logs appear without breaking the layout
* catch obvious console errors or accessibility problems visible through the browser

Use Playwright for practical end-to-end verification after the engine and UI are implemented, not only for a superficial page-load check.

## Documentation

Add a README that explains:

* what the project is
* how to install/run it
* the architecture in a few paragraphs
* the distinction between state, commands, and events
* that subject-specific commands generally belong to the subject, such as `player.move(-5)`
* that stats are generic named values available on multiple game-object types
* where future contributors should add squares/cards/rules
* that the initial implementation intentionally contains no real game
* how to run the available tests
* how Playwright-based browser verification can be performed if applicable

Also add a short developer note making this philosophy explicit:

“Game state describes what is true now. Commands change what is true. Events describe what happened. Svelte renders what is true and reacts to what happened.”

## Coding style

Optimise for beginner readability.

Prefer:

```js
if (player.position >= board.squares.length) {
    player.position = 0;
}
```

over dense clever expressions.

Prefer named functions and obvious classes.

Prefer methods on the object being changed for subject-specific commands.

Avoid:

* metaprogramming
* decorators
* complicated inheritance hierarchies
* dependency injection frameworks
* generic framework abstractions
* unnecessary functional-programming tricks
* magic proxy layers beyond Svelte’s own reactivity
* excessive UI abstraction that makes simple rendering difficult to follow

Comments should explain architectural intent, not narrate obvious syntax.

## Non-goals

Do not implement:

* actual board-game content
* meaningful cards
* meaningful squares
* economy
* scoring
* win conditions
* combat
* trading
* multiplayer
* WebSockets
* database persistence
* authentication
* user accounts
* high scores
* AI integration
* animations
* complicated visual theming
* admin interfaces

We want a clean empty playground, not a game.

## Definition of done

The implementation is complete when:

1. `npm install` and the normal SvelteKit dev command run successfully.
2. The page loads with a Bootstrap-based interface.
3. A neutral board is visible.
4. The board uses a responsive Bootstrap grid or an equally simple responsive layout and remains usable at representative viewport sizes.
5. Placeholder players appear on the board and in a compact player panel.
6. The current player is visible by default while other player details remain collapsed or otherwise unobtrusive until requested.
7. Starting the game establishes a current player.
8. Rolling a die works.
9. The current player can move around the board through a subject-owned command such as `player.move(...)`.
10. Turns can advance between players.
11. Movement wraps correctly around the simple board.
12. State changes automatically update all relevant Svelte UI.
13. The event bus supports awaited async listeners in deterministic order.
14. Domain events are emitted for important engine operations.
15. At least one UI listener demonstrates transient toast handling.
16. The persistent log updates automatically.
17. Generic stats can be attached to and manipulated on players and other suitable game objects.
18. Generic stats are dynamically rendered without hard-coded stat names.
19. Player inventories and effects are represented generically and can be inspected without making the main interface unnecessarily cluttered.
20. Core objects exist for Game, Player, Board, Square, Card, Deck, Dice, Turn/action concepts, Rules, Effects, inventory items, generic stats, and the EventBus.
21. Playwright MCP verification has been used to exercise the main UI flow and inspect the responsive interface.
22. The engine contains no meaningful game content or special rules.
23. The architecture is documented well enough that the next contributor can immediately add a square, card, rule, stat, or UI feature without first reverse-engineering the codebase.

Please implement this directly rather than only producing another plan. Make sensible decisions where details are unspecified, keeping the architecture small, readable, responsive, and easy to understand.
