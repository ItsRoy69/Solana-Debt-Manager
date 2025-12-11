use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke;

#[derive(Accounts)]
pub struct JupiterSwapCpi<'info> {
    /// CHECK: The Jupiter Swap Program
    pub jupiter_program: AccountInfo<'info>,
    /// CHECK: The authority executing the swap (could be a user or a PDA)
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    /// CHECK: The Token Program
    pub token_program: AccountInfo<'info>,
}

pub fn jupiter_swap(ctx: Context<JupiterSwapCpi>, data: Vec<u8>) -> Result<()> {
    // This is a simple passthrough that invokes the Jupiter program.
    // In a production environment, you might want to validate input accounts or data.
    
    let mut account_metas = Vec::new();
    for acc in ctx.remaining_accounts.iter() {
        account_metas.push(if acc.is_writable {
            AccountMeta::new(acc.key(), acc.is_signer)
        } else {
            AccountMeta::new_readonly(acc.key(), acc.is_signer)
        });
    }

    let instruction = Instruction {
        program_id: ctx.accounts.jupiter_program.key(),
        accounts: account_metas,
        data,
    };

    invoke(
        &instruction,
        &ctx.remaining_accounts,
    )?;

    Ok(())
}
