import { PublicKey } from '@solana/web3.js';

export const PROGRAM_CONSTANTS = {
  // TODO - put in real values here, as well as env files and vercel
  DEVNET: {
    PROGRAM_AUTHORITY: new PublicKey(
      process.env.NEXT_PUBLIC_PROGRAM_AUTHORITY || ''
    ),
    PROGRAM_ID: new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || ''),
  },
  MAINNET: {
    PROGRAM_AUTHORITY: new PublicKey(
      process.env.NEXT_PUBLIC_PROGRAM_AUTHORITY || ''
    ),
    PROGRAM_ID: new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || ''),
  },
} as const;

export const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === 'devnet';

export const getProgramAuthority = () => {
  return isDev
    ? PROGRAM_CONSTANTS.DEVNET.PROGRAM_AUTHORITY
    : PROGRAM_CONSTANTS.MAINNET.PROGRAM_AUTHORITY;
};

export const validateAuthority = (wallet: PublicKey) => {
  const authority = getProgramAuthority();
  if (!wallet.equals(authority)) {
    if (isDev) {
      console.warn(`
        Connected wallet: ${wallet.toString()}
        Required authority: ${authority.toString()}
        Please connect with the correct ${
          isDev ? 'devnet' : 'mainnet'
        } authority wallet
      `);
    }
    return false;
  }
  return true;
};
