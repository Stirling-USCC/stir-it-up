# Stir it Up!

**Stir it Up!** is a collaborative board game made by visitors to the University of Stirling Computing Club's open day stall.

The project begins with a board and a small set of generic game building blocks, but almost no game. Each visitor gets a few minutes with a coding agent to add a square, card, rule, die, visual change, or whatever strange idea they bring. Every contribution becomes part of the same increasingly chaotic game.

Balance is optional. Surprises are encouraged.

## Try it locally

You need a recent version of Node.js and npm.

```sh
npm install
npm run dev
```

Open the address printed by Vite. Add at least one player, start the game, and use the controls beside the board.

The `/showcase` route contains temporary example content demonstrating the engine and interface. The main route remains the deliberately sparse game that contributors build on.

## Add something

Small contributions are the point of the project. Some good starting ideas are:

- change a square's name, icon, colour, or behaviour;
- add a card or deck;
- create an unusual die;
- add an item or temporary effect;
- make a rule react to something that happens;
- add a new player action;
- improve how part of the game looks or sounds.

The main game content is assembled in [`src/lib/game/createGame.js`](src/lib/game/createGame.js). Engine objects live in [`src/lib/engine/`](src/lib/engine/), and Svelte components live in [`src/lib/components/`](src/lib/components/). Existing code is intended to be copied and adapted.

The project deliberately uses plain JavaScript, Svelte 5, and Bootstrap. Keep additions understandable to somebody learning the codebase, keep game behaviour in engine or game files, and preserve keyboard and screen-reader access when changing the interface.

Instructions for coding agents are in [`AGENTS.md`](AGENTS.md).

## Useful commands

```sh
npm run dev      # start the local development server
npm test         # run engine and presentation tests
npm run check    # check Svelte and JavaScript
npm run build    # create a production build
```

## Current starting point

The main game currently provides:

- a 100-square board;
- a pre-game roster for one to eight players;
- turns and phases;
- one ordinary six-sided die;
- generic actions, cards, decks, rules, effects, inventory, stats, events, and logging.

It intentionally has no scoring system, economy, win condition, or meaningful game content yet. Those are invitations, not omissions to tidy away all at once.

## After the open day

Stir it Up! is intended to remain an approachable open-source project where students can practise JavaScript, Svelte, Git, pull requests, testing, review, and deployment. Tiny contributions are welcome alongside ambitious new systems.
