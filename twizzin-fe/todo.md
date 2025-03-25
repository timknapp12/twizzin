Before DEMO:

- show xp and rewards on home page
- copy game code to clipboard
- show game admins their games
- backpack failed to join game with a blockhash error
- all players got errors on game submission
- add 1 XP per player for the game creator

refactor after MVP:

- update join time for player game
- handle page reloads during game
- accept SPL tokens - change in create game and JoinComponent
- delete game from db and on-chain before game ever starts
- handle retrieving several games in state at once, differentiating them by gameCode or id
- handle editing a game
- create routes for games after creation /create/[gameId]
- add supabase domain to next.config.mjs for image hosting

  Join Game

- show details of game that has already ended - or show 'not found' in case we delete the game after or if the game code is not found - which returns a 406 from supabase
- error handling for invalid params on route game/gameCode
- show callout hint on join game details for 'split'
- handle if game start time is in the past
- from game screen, allow admin to edit game
- change the check for hasGameData to check some other variable - cuz switching from admin to another wallet does not reset it state
- we might not need to check isManuallyStarted anymore

- clean up imports from utils

- write tests for helper functions - like getGameTimeInSeconds

// https://app.timsol.org/

// cloudflared tunnel run solana-local
