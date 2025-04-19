Before DEMO:

- total time of game was wrong
- backpack failed to join game with a blockhash error
- all players got errors on game submission
- add 1 XP per player for the game creator
  // TODO - when out of time the auto submit fails
  // TODO - getGameByCode on game results after game has ended - doesn't get the full game - loadCompleteResults in gameContext should be called in PlayerGameResults or its parent
  // TODO - the user submits the answers after the admin ends the game -that should not be allowed
  // TODO uncontrolled to controlled component
  // TODO -remove 406 db error when player joins game
  // TODO - game logo does not show up
  // TODO - xp does not update on its own
  // TODO- SOL logo does not show up on claim rewards
  // TODO - entry fee label is not clear - change to be more specific
  // should alerts be at the top of the screens for mobile?
  // going to a new game still has old game results - it didn't refresh
  refactor after MVP:
  // screen shot from explorer about end game not working - exceeded CUs
  // inputs require 0, the zero can't be deleted
  // non winner graphic should not be charts - it shuuld be a sad one
  // screen shot on other mac for submitting answers after times runs out
  don't let inputs go negative
  // join game take you to old detials - i think the game session is not reset when getting anew game code unless you refresh the browser
  // JOINING to JOINING error on find game

- update join time for player game
- handle page reloads during game
- accept SPL tokens - change in create game and JoinComponent
- delete game from db and on-chain before game ever starts
- handle retrieving several games in state at once, differentiating them by gameCode or id
- handle editing a game
- create routes for games after creation /create/[gameId]
- add supabase domain to next.config.mjs for image hosting
- add treasury amount
- trim game code in input

  Join Game

- show details of game that has already ended - or show 'not found' in case we delete the game after or if the game code is not found - which returns a 406 from supabase
- error handling for invalid params on route game/gameCode
- show callout hint on join game details for 'split'
- from game screen, allow admin to edit game
- change the check for hasGameData to check some other variable - cuz switching from admin to another wallet does not reset it state
- we might not need to check isManuallyStarted anymore

- clean up imports from utils

- write tests for helper functions - like getGameTimeInSeconds

// https://app.timsol.org/

// cloudflared tunnel run solana-local
