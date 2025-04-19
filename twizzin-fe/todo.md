Before DEMO:

- backpack failed to join game with a blockhash error
  // TODO all players got errors on game submission - something about CUs

  // TODO - getGameByCode on game results after game has ended - doesn't get the full game - loadCompleteResults in gameContext should be called in PlayerGameResults or its parent
  // TODO uncontrolled to controlled component

  // TODO - game logo does not show up
  // TODO- SOL logo does not show up on claim rewards

  // TODO - xp does not update on its own

  // TODO going to a new game still has old game results - it didn't refresh
  refactor after MVP:
  // TODO screen shot from explorer about end game not working - exceeded CUs

  // TODO screen shot on other mac for submitting answers after times runs out

  // TODO join game take you to old detials - i think the game session is not reset when getting anew game code unless you refresh the browser

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
