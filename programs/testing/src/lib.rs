#![allow(clippy::result_large_err)]
use {
    anchor_lang::prelude::*,
    anchor_spl::{
        metadata::{
            create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
            CreateMetadataAccountsV3, Metadata,
        },
        // token::{Mint, Token}, 
    },
};
use anchor_spl::token::{ Mint, Burn, burn, Token, transfer, TokenAccount, MintTo, mint_to};
use anchor_spl::associated_token::AssociatedToken; 

declare_id!("DsZK9at5qHE4dG5ezQaaZHjMYFGA43yzteX5gc9revH5");

#[program]
pub mod create_token {
    use super::*;

    pub fn create(ctx: Context<Create>) -> Result<()> {
        let devwallet = &mut ctx.accounts.devwallet;
        devwallet.admin = *ctx.accounts.dev.key;
        Ok(())
    }

    pub fn create_token_mint(
        ctx: Context<CreateTokenMint>,
        _token_decimals: u8,
        token_name: String,
        token_symbol: String,
        token_uri: String,
    ) -> Result<()> {
        msg!("Creating metadata account...");
        msg!( 
            "Metadata account address: {}",
            &ctx.accounts.metadata_account.key()
        );

        // Cross Program Invocation (CPI)
        // Invoking the create_metadata_account_v3 instruction on the token metadata program
        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata_account.to_account_info(),
                    mint: ctx.accounts.mint_account.to_account_info(),
                    mint_authority: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.payer.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            DataV2 {
                name: token_name,
                symbol: token_symbol,
                uri: token_uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            false, // Is mutable
            true,  // Update authority is signer
            None,  // Collection details
        )?;

        msg!("Token mint created successfully.");

        Ok(())
    }


    pub fn buy_token(ctx: Context<MintToken>, amount: u64) -> Result<()> {
        msg!("Minting tokens to associated token account...");
        msg!("Mint: {}", &ctx.accounts.mint_account.key());
        msg!(
            "Token Address: {}",
            &ctx.accounts.associated_token_account.key()
        );

        let devwallet = &mut ctx.accounts.devwallet;
        let dev = &mut ctx.accounts.mint_authority;

        
        require!(devwallet.admin == *dev.key, CFError::WrongUser);
    
        // Invoke the mint_to instruction on the token program 
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint_account.to_account_info(),
                    to: ctx.accounts.associated_token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
            ),
            amount * 10u64.pow(ctx.accounts.mint_account.decimals as u32), // Mint tokens, adjust for decimals
        )?;
    
        msg!("Token minted successfully.");
    
        Ok(())
    }


    // Only the dev wallet can burn tokens
    pub fn sell_token(ctx: Context<SellToken>, amount: u64) -> Result<()> {
        let devwallet = &mut ctx.accounts.devwallet;

        require_keys_eq!(ctx.accounts.authority.key(), devwallet.admin , CFError::UnauthorizedAccess);

        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.dev_wallet_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        burn(cpi_ctx, amount)?;

        Ok(())
    }


    // All wallets can transfer tokens
    pub fn transfer_token(ctx: Context<TransferToken>, amount: u64) -> Result<()> {
        let sender = &ctx.accounts.from;
        let recipient = &ctx.accounts.to;
    
        require!(sender.amount >= amount, CFError::InsufficientBalance);
    
        let transfer_instruction = anchor_spl::token::Transfer {
            from: sender.to_account_info(),
            to: recipient.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, transfer_instruction);
    
        transfer(cpi_ctx, amount)?;
    
        Ok(())
    }
    

}


#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer=dev, space=9000, seeds=[b"DEV_WALLET".as_ref(), dev.key().as_ref()], bump)]
    pub devwallet: Account<'info, Devwallet>,
    #[account(mut)]
    pub dev: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_token_decimals: u8)]
pub struct CreateTokenMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), mint_account.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub metadata_account: UncheckedAccount<'info>,
    // Create new mint account
    #[account(
        init,
        payer = payer,
        mint::decimals = _token_decimals,
        mint::authority = payer.key(),
    )]
    pub mint_account: Account<'info, Mint>,

    pub token_metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintToken<'info> {
    #[account(mut)]
    pub mint_authority: Signer<'info>, 

    #[account(mut)]
    pub devwallet: Account<'info, Devwallet>,

    pub recipient: SystemAccount<'info>,
    #[account(mut)]
    pub mint_account: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = mint_authority,
        associated_token::mint = mint_account,
        associated_token::authority = recipient,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct SellToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // dev wallet authority

    #[account(mut)]
    pub devwallet: Account<'info, Devwallet>,
    #[account(mut)]
    pub dev_wallet_token_account: Account<'info, TokenAccount>, // Dev's token account
    #[account(mut)]
    pub mint: Account<'info, Mint>, // Token mint account
    pub token_program: Program<'info, Token>, // SPL token program
}


#[derive(Accounts)]
pub struct TransferToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // sender's authority

    #[account(mut, has_one = mint)]
    pub from: Account<'info, TokenAccount>, // sender's token account

    #[account(mut)]
    pub to: Account<'info, TokenAccount>, // recipient's token account

    pub mint: Account<'info, Mint>, // token mint account (e.g., SOL USDT)

    pub token_program: Program<'info, Token>, // SPL token program
}


#[account]
pub struct Devwallet {
    pub admin: Pubkey,
}


#[error_code]
pub enum CFError {
    #[msg("Wrong user.")]
    WrongUser,
    #[msg("Wrong user.")]
    UnauthorizedAccess,
    #[msg("you have insufficient fund.")]
    InsufficientBalance,
}
