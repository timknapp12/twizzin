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
