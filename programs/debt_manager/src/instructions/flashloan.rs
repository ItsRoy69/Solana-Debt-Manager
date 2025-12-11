use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke;

#[derive(Accounts)]
pub struct FlashLoanAction<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(mut)]
    pub borrower_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault", borrow_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    pub borrow_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    /// CHECK: The program that will be called via CPI
    pub target_program: AccountInfo<'info>,
}

pub fn flash_loan(
    ctx: Context<FlashLoanAction>, 
    amount: u64,
    instruction_data: Vec<u8>
) -> Result<()> {
    // 1. Calculate Fee (e.g. 0.05% = 5 basis points)
    let fee = amount.checked_mul(5).unwrap() / 10000;
    let _total_repayment = amount.checked_add(fee).ok_or(ErrorCode::MathOverflow)?;

    let vault_balance_before = ctx.accounts.vault.amount;

    // 2. Transfer Tokens to Borrower
    let mint_key = ctx.accounts.borrow_mint.key();
    let bump = ctx.bumps.vault;
    let seeds = &[
        b"vault".as_ref(),
        mint_key.as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.borrower_token_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;

    // 3. Execute CPI (Callback)
    // Construct instruction for the target program.
    // The remaining accounts are passed to the target program.
    let mut account_metas = Vec::new();
    for acc in ctx.remaining_accounts.iter() {
        account_metas.push(if acc.is_writable {
            AccountMeta::new(acc.key(), acc.is_signer)
        } else {
            AccountMeta::new_readonly(acc.key(), acc.is_signer)
        });
    }

    let instruction = Instruction {
        program_id: ctx.accounts.target_program.key(),
        accounts: account_metas,
        data: instruction_data,
    };

    invoke(
        &instruction,
        ctx.remaining_accounts,
    )?;

    // 4. Verify Repayment
    // We expect the borrower (or the callback logic) to have transferred `total_repayment` back to the vault.
    // We reload the vault account to check the balance.
    ctx.accounts.vault.reload()?;
    let vault_balance_after = ctx.accounts.vault.amount;

    if vault_balance_after < vault_balance_before.checked_add(fee).unwrap() {
        return Err(ErrorCode::FlashReplyError.into());
    }

    Ok(())
}
