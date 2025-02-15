Before DEMO:

- add success toast for creating game and return game code
- make sure wallet is connected before starting game

refactor after MVP:

- accept SPL tokens - change in create game and JoinComponent
- delete game from db and on-chain before game ever starts
- handle retrieving several games in state at once, differentiating them by gameCode or id
- handle editing a game
- create routes for games after creation /create/[gameId]
- add supabase domain to next.config.mjs for image hosting

Join Game

- show details of game that has already ended - or show 'not found' in case we delete the game after or if the game code is not found - which returns a 406 from supabase
- don't allow admin to join game to play- but only to be admin
- error handling for invalid params on route game/gameCode
- show callout hint on join game details for 'split'
- handle if game start time is in the past
- from game screen, allow admin to edit game
- change the check for hasGameData to check some other variable - cuz switching from admin to another wallet does not reset it state
- add username when player joins game or creates game

- clean up imports from utils

- write tests for helper functions - like getGameTimeInSeconds
