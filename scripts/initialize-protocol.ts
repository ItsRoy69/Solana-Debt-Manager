import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DebtManager } from "../target/types/debt_manager";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DebtManager as Program<DebtManager>;

  console.log("Program ID:", program.programId.toString());
  console.log("Admin:", provider.wallet.publicKey.toString());

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log("Config PDA:", configPda.toString());

  try {
    const tx = await program.methods
      .initializeProtocol()
      .accountsPartial({
        config: configPda,
        admin: provider.wallet.publicKey,
      })
      .rpc();

    console.log("✅ Protocol initialized successfully!");
    console.log("Transaction signature:", tx);
    console.log("\nConfig account:", configPda.toString());
    console.log("\nYou can now:");
    console.log("1. Create your debt account in the UI");
    console.log("2. Add supported collateral and borrow assets (need admin functions)");
    console.log("3. Start testing deposit/borrow functionality");

  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("⚠️  Protocol already initialized!");
      console.log("Config PDA:", configPda.toString());
      
      try {
        const config = await program.account.protocolConfig.fetch(configPda);
        console.log("\nCurrent config:");
        console.log("- Admin:", config.admin.toString());
        console.log("- Treasury:", config.treasury.toString());
        console.log("- Supported collaterals:", config.supportedCollaterals.length);
        console.log("- Supported borrows:", config.supportedBorrows.length);
      } catch (fetchErr) {
        console.log("Could not fetch config details");
      }
    } else {
      console.error("❌ Error:", err);
    }
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
