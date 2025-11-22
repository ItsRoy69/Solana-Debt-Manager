# Solana Debt Manager

A realistic, testable, security-oriented DeFi primitive on Solana built with Anchor.

## Features

- **User Debt Accounts**: Individual PDAs managing collateral and debt positions.
- **Multi-Collateral Support**: Deposit multiple types of SPL tokens as collateral.
- **Synthetic Borrowing**: Borrow synthetic assets against collateral.
- **Interest Accrual**: Global interest index model for efficient, constant-time accrual.
- **Liquidation**: Incentivized liquidation mechanism for unhealthy accounts.
- **Mock Oracles**: Integrated mock price feeds for testing.

## Architecture

### Accounts

- `ProtocolConfig`: Global configuration, supported assets, and admin keys.
- `UserDebtAccount`: User-specific PDA storing collateral and debt balances.
- `Vault`: Token accounts holding collateral (program-owned).

### Instructions

- `initialize_protocol`: Set up the protocol.
- `open_debt_account`: Create a new user account.
- `deposit_collateral`: Deposit SPL tokens.
- `withdraw_collateral`: Withdraw tokens (checks balance).
- `borrow`: Borrow synthetic assets (accrues interest, checks LTV).
- `repay`: Repay debt (burns tokens).
- `liquidate`: Liquidate unhealthy accounts.
- `accrue_interest`: Update global interest indices.

## Development

### Prerequisites

- Rust 1.75+
- Solana CLI 1.18+
- Anchor CLI 0.30+

### Build

```bash
anchor build
```

### Test

```bash
anchor test
```

## Testing

Unit tests for the interest accrual math are included in `src/math.rs`.
Integration tests are located in `tests/debt_manager.ts`.

### Note on Environment

Due to network restrictions in the current environment, the Solana SBF tools could not be installed, preventing a full build of the BPF program. However, the code is fully implemented and verified via `cargo check` and Rust unit tests.
