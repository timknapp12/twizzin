Before DEMO:

// TODO - getGameByCode on game results after game has ended - doesn't get the full game - loadCompleteResults in gameContext should be called in PlayerGameResults or its parent
// TODO going to a new game still has old game results - it didn't refresh
refactor after MVP:
// TODO join game take you to old detials - i think the game session is not reset when getting anew game code unless you refresh the browser

// TODO uncontrolled to controlled component

// TODO - xp does not update on its own

// TODO screen shot on other mac for submitting answers after times runs out

// TODO - get rid of start time???

// TODO - display all games for users so they can find their games again

// TODO send link (not just game code)

- update join time for player game
- handle page reloads during game
- accept SPL tokens - change in create game and JoinComponent
- delete game from db and on-chain before game ever starts
- handle retrieving several games in state at once, differentiating them by gameCode or id

- PROD - add supabase domain to next.config.mjs for image hosting
- add treasury amount
- trim game code in input

  Join Game

- show details of game that has already ended - or show 'not found' in case we delete the game after or if the game code is not found - which returns a 406 from supabase
- error handling for invalid params on route game/gameCode
- show callout hint on join game details for 'split'
- change the check for hasGameData to check some other variable - cuz switching from admin to another wallet does not reset it state

- clean up imports from utils

- write tests for helper functions - like getGameTimeInSeconds

// https://app.timsol.org/

// cloudflared tunnel run solana-local
