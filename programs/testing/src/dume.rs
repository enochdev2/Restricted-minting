use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};

declare_id!("YourProgramIDHere");

#[program]
mod your_program {
    use super::*;

    // Initialize the contract with dev_wallet and mint
    pub fn initialize(ctx: Context<Initialize>, dev_wallet: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.dev_wallet = dev_wallet;
        Ok(())
    }

    // Whitelist a wallet for swap
    pub fn whitelist_wallet(ctx: Context<Whitelist>, wallet: Pubkey, authorized: bool) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(config.dev_wallet == *ctx.accounts.signer.key, Unauthorized);
        config.whitelist.insert(wallet, authorized);
        Ok(())
    }

    // Mint (Buy) tokens to the dev wallet
    pub fn buy_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(config.dev_wallet == *ctx.accounts.signer.key, Unauthorized);
        token::mint_to(ctx.accounts.mint_to_ctx(), amount)?;
        Ok(())
    }

    // Burn (Sell) tokens from the dev wallet
    pub fn sell_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(config.dev_wallet == *ctx.accounts.signer.key, Unauthorized);
        token::burn(ctx.accounts.burn_ctx(), amount)?;
        Ok(())
    }

    // Transfer tokens - open to all wallets
    pub fn transfer_tokens(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        token::transfer(ctx.accounts.transfer_ctx(), amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 32)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Whitelist<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub dev_wallet: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub dev_wallet_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub dev_wallet: Signer<'info>,
    #[account(mut)]
    pub dev_wallet_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Config {
    pub dev_wallet: Pubkey,
    pub whitelist: HashMap<Pubkey, bool>,
}

impl<'info> MintTokens<'info> {
    fn mint_to_ctx(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.dev_wallet_token_account.to_account_info(),
            authority: self.dev_wallet.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

impl<'info> BurnTokens<'info> {
    fn burn_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        let cpi_accounts = Burn {
            mint: self.dev_wallet_token_account.mint.to_account_info(),
            to: self.dev_wallet_token_account.to_account_info(),
            authority: self.dev_wallet.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

impl<'info> Transfer<'info> {
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.from.to_account_info(),
            to: self.to.to_account_info(),
            authority: self.authority.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}
