import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DebtManager } from "../target/types/debt_manager";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("debt_manager", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DebtManager as Program<DebtManager>;

  let collateralMint: PublicKey;
  let borrowMint: PublicKey;
  let userCollateral: PublicKey;
  let userBorrow: PublicKey;
  let vault: PublicKey;
  
  const owner = Keypair.generate();
  const admin = provider.wallet;

  it("Is initialized!", async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    await program.methods
      .initializeProtocol()
      .accounts({
        config: configPda,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const configAccount = await program.account.protocolConfig.fetch(configPda);
    assert.ok(configAccount.admin.equals(admin.publicKey));
  });

  it("Opens a debt account", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(owner.publicKey, 1000000000),
      "confirmed"
    );

    const [debtAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("debt"), owner.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .openDebtAccount()
      .accounts({
        debtAccount: debtAccountPda,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const account = await program.account.userDebtAccount.fetch(debtAccountPda);
    assert.ok(account.owner.equals(owner.publicKey));
  });
});
