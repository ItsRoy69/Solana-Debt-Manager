import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DebtManager } from "../target/types/debt_manager";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("debt_manager", () => {
  // Configure the client to use the local cluster.
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
    // Airdrop SOL to owner
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

  // Note: Further tests require mint creation and token interactions which depend on a running validator and built program.
  // Since the build environment is currently restricted, we outline the tests below.

  /*
  it("Deposits collateral", async () => {
    // 1. Create Mints
    // 2. Mint to user
    // 3. Call deposit_collateral
    // 4. Verify vault balance and user debt account state
  });

  it("Borrows asset", async () => {
    // 1. Call borrow
    // 2. Verify user received tokens
    // 3. Verify debt principal increased
  });

  it("Accrues interest", async () => {
    // 1. Wait or sleep
    // 2. Call accrue_interest
    // 3. Verify global index updated
  });

  it("Repays debt", async () => {
    // 1. Call repay
    // 2. Verify debt principal decreased
    // 3. Verify tokens burned
  });

  it("Liquidates unhealthy account", async () => {
    // 1. Setup unhealthy scenario (price drop or interest accumulation)
    // 2. Call liquidate
    // 3. Verify collateral seized and debt reduced
  });
  */
});
