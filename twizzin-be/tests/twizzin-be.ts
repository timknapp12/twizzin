import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TwizzinBe } from '../target/types/twizzin_be';

describe('twizzin-be', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();

  // const connection = provider.connection;

  const program = anchor.workspace.TwizzinBe as Program<TwizzinBe>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.methods.initGame().rpc();
    console.log('Your transaction signature', tx);
  });
});
