import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { TwizzinIdl } from '../../types/idl';

export const deriveGamePDAs = (
  program: Program<TwizzinIdl>,
  adminPubkey: PublicKey,
  gameCode: string
) => {
  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('game'), adminPubkey.toBuffer(), Buffer.from(gameCode)],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), adminPubkey.toBuffer(), Buffer.from(gameCode)],
    program.programId
  );

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  const [winnersPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('winners'), adminPubkey.toBuffer(), Buffer.from(gameCode)],
    program.programId
  );

  return { gamePda, vaultPda, configPda, winnersPda };
};

export const derivePlayerPDA = (
  program: Program<TwizzinIdl>,
  gamePda: PublicKey,
  playerPubkey: PublicKey
) => {
  const [playerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('player'), gamePda.toBuffer(), playerPubkey.toBuffer()],
    program.programId
  );

  return playerPda;
};
