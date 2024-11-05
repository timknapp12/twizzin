// tests/config.test.ts
import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { TwizzinBeV2 } from '../../target/types/twizzin_be_v2';
import { expect } from 'chai';
import { setupProgram, findConfigPda } from './helpers';

describe('Program Config', () => {
  const program = setupProgram();
  const provider = anchor.AnchorProvider.env();

  it('successfully initializes program config', async () => {
    const treasury = anchor.web3.Keypair.generate();
    const treasuryFee = 100; // 1%
    const [configPda] = await findConfigPda(program);

    await program.methods
      .initConfig(treasury.publicKey, treasuryFee)
      .accounts({
        authority: provider.wallet.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.programConfig.fetch(configPda);
    expect(config.authority.toBase58()).to.equal(
      provider.wallet.publicKey.toBase58()
    );
    expect(config.treasury.toBase58()).to.equal(treasury.publicKey.toBase58());
    expect(config.treasuryFee).to.equal(treasuryFee);
    expect(config.paused).to.equal(false);
  });

  it('fails with invalid treasury fee', async () => {
    const treasury = anchor.web3.Keypair.generate();
    const invalidFee = 2000; // 20%, exceeds maximum
    const [configPda] = await findConfigPda(program);

    try {
      await program.methods
        .initConfig(treasury.publicKey, invalidFee)
        .accounts({
          authority: provider.wallet.publicKey,
          config: configPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail('Should have failed with invalid fee');
    } catch (err) {
      expect(err.message).to.include('InvalidFee');
    }
  });

  it('fails when trying to initialize config twice', async () => {
    const treasury = anchor.web3.Keypair.generate();
    const treasuryFee = 100;
    const [configPda] = await findConfigPda(program);

    try {
      await program.methods
        .initConfig(treasury.publicKey, treasuryFee)
        .accounts({
          authority: provider.wallet.publicKey,
          config: configPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail('Should have failed with already initialized');
    } catch (err) {
      expect(err.message).to.include('ConfigAlreadyInitialized');
    }
  });
});

// anchor test --skip-deploy
