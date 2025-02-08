refactor after MVP:

- accept SPL tokens - change in create game and JoinComponent
- delete game from db and on-chain before game ever starts
- handle retrieving several games in state at once, differentiating them by gameCode or id
- handle editing a game
- create routes for games after creation /create/[gameId]
- add supabase domain to next.config.mjs for image hosting

Join Game

- show details of game that has already ended - or show 'not found' in case we delete the game after idk
- don't allow admin to join game to play- but only to be admin
- error handling for invalid params on route game/gameCode
- show callout hint on join game details for 'split'
- handle if game start time is in the past

- clean up imports from utils

- write tests for helper functions - like getGameTimeInSeconds
