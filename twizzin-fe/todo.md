Before DEMO:

- add success toast for creating game and return game code
- make sure wallet is connected before starting game
- add input for username for creating a game and joining a game
- add 1 XP per player for the game creator
- check after completing game:
  1. user results goes to chain
  2. user results goes to db
  3. winners are declared on chain
  4. user rewards and xp are updated in db
  5. game results are shown on game results page
  6. event listener for winners declared trigger for players
  7. leaderboard is shown on game results page
  8. winners are shown on game results page
  9. xp and rewards fetched and shown on home page

refactor after MVP:

- handle page reloads during game
- accept SPL tokens - change in create game and JoinComponent
- delete game from db and on-chain before game ever starts
- handle retrieving several games in state at once, differentiating them by gameCode or id
- handle editing a game
- create routes for games after creation /create/[gameId]
- add supabase domain to next.config.mjs for image hosting
- add username when player joins game or creates game
- show admin the game code after creation

  Join Game

- show details of game that has already ended - or show 'not found' in case we delete the game after or if the game code is not found - which returns a 406 from supabase
- don't allow admin to join game to play- but only to be admin
- error handling for invalid params on route game/gameCode
- show callout hint on join game details for 'split'
- handle if game start time is in the past
- from game screen, allow admin to edit game
- change the check for hasGameData to check some other variable - cuz switching from admin to another wallet does not reset it state
- we might not need to check isManuallyStarted anymore

- clean up imports from utils

- write tests for helper functions - like getGameTimeInSeconds

bugs with starting game

admin - end game - Account has no data - screen shot
2mT82fHRfX7MHF8aS7JhVtgzPJzKyPLaqKfmSuS7fmnj

// https://app.timsol.org/
