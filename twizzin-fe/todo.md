Before DEMO:

- backpack failed to join game with a blockhash error
  // TODO all players got errors on game submission - something about CUs

  // TODO - getGameByCode on game results after game has ended - doesn't get the full game - loadCompleteResults in gameContext should be called in PlayerGameResults or its parent
  // TODO uncontrolled to controlled component

  // TODO - game logo does not show up image:1

         //TODO  GET https://twizzin.vercel.app/_next/image?url=https%3A%2F%2Fpmtjwqqfkqzbxxxurbqk.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fgame-images%2F1745117511702-img-1841.jpeg&w=1920&q=75 400 (Bad Request)

  // TODO- SOL logo does not show up on claim rewards

  // TODO - xp does not update on its own

  // TODO going to a new game still has old game results - it didn't refresh
  refactor after MVP:
  // TODO screen shot from explorer about end game not working - exceeded CUs

  // TODO screen shot on other mac for submitting answers after times runs out

  // TODO join game take you to old detials - i think the game session is not reset when getting anew game code unless you refresh the browser

  // TODO - get rid of start time???

  // TODO - display all games for users so they can find their games again
  AQXJBN - matt
  EV6H5K or 8GJTBT - Sara
  ASFWST - Aileen
  GUU93Y - Mark
  Y6HSPT - Ryan

  // TODO Matt had to refresh the page because it didn't think he was the admin after creating a game
  // TODO - phantom continues to disconnect the wallet
  // TODO - mobile view on game admin forces to the screen wide so it scrolls horizontally
  // TODO - The event listener for starting a game didn't work
  // TODO - game code doesn't reset
  // TODO - submitting answers failed for all of us on Aileen's game - index out of range - screen shot

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
