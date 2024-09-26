import { HomeComponent } from '@/components';

export default function Home({ params }: { params: { lang: string } }) {
  return <HomeComponent params={params} />;
}

// import { Connection, Keypair, PublicKey } from '@solana/web3.js';
// import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
// import { YourProgramIDL } from './your_program_idl';

// async function initializeConfig() {
//   // Connect to the Solana cluster
//   const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

//   // Set up the provider
//   const wallet = new Keypair(); // Or load your wallet
//   const provider = new AnchorProvider(connection, wallet, {});

//   // Create the program object
//   const programId = new PublicKey('Your_Program_ID');
//   const program = new Program(YourProgramIDL, programId, provider);

//   // Generate a new account for the config
//   const configAccount = Keypair.generate();

//   // Read treasury pubkey from your JSON file
//   const treasuryPubkey = new PublicKey('Your_Treasury_Pubkey');

//   // Call the initialize_config instruction
//   await program.methods.initializeConfig(treasuryPubkey)
//     .accounts({
//       admin: wallet.publicKey,
//       config: configAccount.publicKey,
//       systemProgram: web3.SystemProgram.programId,
//     })
//     .signers([wallet, configAccount])
//     .rpc();

//   console.log('Config initialized with account:', configAccount.publicKey.toString());
// }

// initializeConfig().catch(console.error);

// const endGame = async () => {
//   const configAccount = await program.account.programConfig.fetch(configPubkey);
//   const treasuryPubkey = configAccount.treasuryPubkey;

//   await program.methods.endGame()
//     .accounts({
//       admin: wallet.publicKey,
//       game: gamePubkey,
//       vault: vaultPubkey,
//       config: configPubkey,
//       treasury: treasuryPubkey,  // This is the treasury account being passed
//       systemProgram: SystemProgram.programId,
//     })
//     .rpc();
// };
