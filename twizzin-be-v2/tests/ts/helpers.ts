import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { TwizzinBeV2 } from '../../target/types/twizzin_be_v2';
import { expect } from 'chai';

export class TestContext {
  static provider: anchor.AnchorProvider;
  static program: Program<TwizzinBeV2>;

  static setup(): Program<TwizzinBeV2> {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    this.provider = provider;
    this.program = anchor.workspace.TwizzinBeV2 as Program<TwizzinBeV2>;
    return this.program;
  }

  static async createPda(
    seeds: Buffer[]
  ): Promise<[anchor.web3.PublicKey, number]> {
    return await anchor.web3.PublicKey.findProgramAddress(
      seeds,
      this.program.programId
    );
  }

  static async createKeypairWithSol(
    solAmount: number = 10
  ): Promise<anchor.web3.Keypair> {
    const keypair = anchor.web3.Keypair.generate();
    const signature = await this.provider.connection.requestAirdrop(
      keypair.publicKey,
      solAmount * anchor.web3.LAMPORTS_PER_SOL
    );
    await this.provider.connection.confirmTransaction(signature);
    return keypair;
  }

  static async expectThrowError(
    promise: Promise<any>,
    errorMessage: string
  ): Promise<void> {
    try {
      await promise;
      expect.fail('Expected an error but none was thrown');
    } catch (error) {
      expect(error.message).to.include(errorMessage);
    }
  }

  static async expectCustomError(
    promise: Promise<any>,
    errorName: string
  ): Promise<void> {
    try {
      await promise;
      expect.fail('Expected an error but none was thrown');
    } catch (error: any) {
      if (!error.error?.errorMessage) {
        throw error;
      }
      expect(error.error.errorMessage).to.include(errorName);
    }
  }
}

// Program-specific helper functions
export function setupProgram(): Program<TwizzinBeV2> {
  return TestContext.setup();
}

export async function findConfigPda(
  program: Program<TwizzinBeV2>
): Promise<[anchor.web3.PublicKey, number]> {
  return await TestContext.createPda([Buffer.from('config')]);
}
