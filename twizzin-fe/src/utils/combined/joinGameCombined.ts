import { TwizzinIdl } from '@/types/idl';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { joinGame } from '../program/joinGame';
import { getGameFromDb } from '../supabase/getGameFromDb';
import { JoinGameParams } from '@/types';

export const joinGameCombined = async (
  program: Program<TwizzinIdl>,
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    // eslint-disable-next-line no-unused-vars
    transaction: Transaction,
    // eslint-disable-next-line no-unused-vars
    connection: Connection
  ) => Promise<string>,
  params: JoinGameParams
) => {
  const { success, signature, error } = await joinGame(
    program,
    connection,
    publicKey,
    sendTransaction,
    params
  );

  if (error) {
    throw new Error(error);
  }

  if (success) {
    const game = await getGameFromDb(params.gameCode);
    return { game, signature };
  }
};

// In your client code
// const startGame = async (gameId: string) => {
//   try {
//     const totalTimeMs = questions.reduce(
//       (acc, question) => acc + question.timeLimit * 1000,
//       0
//     );

//     // 1. Call Anchor program
//     const tx = await program.methods
//       .startGame(new BN(totalTimeMs))
//       .accounts({
//         admin: wallet.publicKey,
//         game: gamePda,
//       })
//       .rpc();

//     // 2. Get the events/logs from the transaction
//     const txInfo = await connection.getTransaction(tx, {
//       maxSupportedTransactionVersion: 0,
//     });

//     // 3. Parse the GameStarted event to get the exact timestamps
//     const gameStartedEvent = program.coder.events.decode(
//       'GameStarted',
//       txInfo.meta.logMessages[0]  // You might need to find the correct log
//     );

//     // 4. Convert timestamps to ISO strings for Supabase
//     const startTimeISO = new Date(gameStartedEvent.startTime.toNumber())
//       .toISOString();
//     const endTimeISO = new Date(gameStartedEvent.endTime.toNumber())
//       .toISOString();

//     // 5. Update Supabase with the same timestamps
//     await supabase
//       .from('games')
//       .update({
//         start_time: startTimeISO,
//         end_time: endTimeISO,
//         status: 'active'  // or whatever status you use
//       })
//       .eq('id', gameId);

//     return {
//       startTime: gameStartedEvent.startTime,
//       endTime: gameStartedEvent.endTime
//     };
//   } catch (error) {
//     console.error('Error starting game:', error);
//     throw error;
//   }
// };
