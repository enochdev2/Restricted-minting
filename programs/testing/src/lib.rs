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
use anchor_spl::token::{ self, Mint, Burn, burn, Token, transfer, TokenAccount, MintTo, mint_to};
use anchor_spl::associated_token::AssociatedToken; 

declare_id!("68q1Mqr4poSokqbcgS2P6exAWomAMdYZmxxui4yjndoK");

const CUSTOM_USDT_MINT: &str = "GYNdve5Wdj38wpVTwwdaPZ6YhdygR5z4La34fRkxcB6C";


#[program]
pub mod create_token {
    use super::*;

    pub fn create(ctx: Context<Create>) -> Result<()> {
        let devwallet = &mut ctx.accounts.devwallet;
        devwallet.amount_donated = 0;
        devwallet.admin = *ctx.accounts.dev.key;
        Ok(())
    }


    // The whitelist_wallet function using the new update_whitelist method
    pub fn whitelist_wallet(ctx: Context<Whitelist>, wallet: Pubkey, authorized: bool) -> Result<()> {
    let devwallet = &mut ctx.accounts.devwallet;

    // Check if the signer is the admin
    require!(devwallet.admin == *ctx.accounts.signer.key, CFError::WrongUser);

    // Update the whitelist
    devwallet.update_whitelist(wallet, authorized);

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

    pub fn swap_sol(
        ctx: Context<Swap>,
        _program_custom_token_vault_bump: u8,
        sol_amount: u64,
        // _vault_bump: u8,
    ) -> Result<()> {

    
        // Convert SOL amount to u128 for precision
        let sol_amount_u128 = sol_amount as u128;
        let sol_usdt_price: u128 = 149_00;

    
        // Adjust for SOL decimals (9 decimals for SOL tokens)
        // Calculate the USDT amount, adjusting for SOL decimals (9 decimals for SOL tokens)
        let usdt_amount = sol_amount_u128
            .checked_mul(sol_usdt_price) // Multiply SOL amount by the price
            .unwrap()
            .checked_div(1_000_000_000)  // Adjust for SOL decimals
            .unwrap() as u64;

            // transfer sol from user to admin
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.user.key(),
                &ctx.accounts.devwallet.key(),
                sol_amount,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.devwallet.to_account_info(),
                ],
            )?;
            (&mut ctx.accounts.devwallet).amount_donated += sol_amount;
            msg!("transfer {} sol to admin.", sol_amount);

        // transfer ICO from program to user ATA
        // let ico_amount = sol_amount * ctx.accounts.data.sol;
        let ico_mint_address = ctx.accounts.custom_token_mint.key();
        let seeds = &[ico_mint_address.as_ref(), &[_program_custom_token_vault_bump]];
        let signer = [&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.ico_ata_for_ico_program.to_account_info(),
                to: ctx.accounts.user_custom_token_account.to_account_info(),
                authority: ctx.accounts.ico_ata_for_ico_program.to_account_info(),
            },
            &signer,
        );
        token::transfer(cpi_ctx, usdt_amount)?;
        msg!("transfer {} ico to buyer/user.", usdt_amount);
        Ok(())
    }



    pub fn swap_usdt(
        ctx: Context<Swap>,
        // _ico_ata_for_ico_program_bump: u8,
        usdt_amount: u64
        // _vault_bump: u8,
    ) -> Result<()> {
        
        let sol_usdc_price: u128 = 149_00;  // 149.00 USDC, stored as 14900

        // // Convert USDC amount to u128 for precision
        let usdc_amount_u128 = usdt_amount as u128;
        
        // // Adjust for SOL decimals (9 decimals for SOL tokens)
        let sol_amount = usdc_amount_u128
        .checked_mul(1_000_000_000)  // Adjust for SOL decimals
            .unwrap()
            .checked_div(sol_usdc_price)
            .unwrap() as u64;
        
        // transfer ICO user to program ata
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.user_custom_token_account.to_account_info(),
                to: ctx.accounts.ico_ata_for_ico_program.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, usdt_amount)?;
        msg!("transfer {} ico to buyer/user.", usdt_amount);

        let devwallet = &mut ctx.accounts.devwallet;
        let user = &mut ctx.accounts.user;

        **devwallet.to_account_info().try_borrow_mut_lamports()? -= sol_amount;
        **user.to_account_info().try_borrow_mut_lamports()? += sol_amount;
  
        (&mut ctx.accounts.devwallet).amount_donated -= sol_amount;
        msg!("transfer {} sol to admin.", sol_amount);

        Ok(())
    }
    
    

}


#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer=dev, space=9000, seeds=[b"DEV_WALLET".as_ref(), dev.key().as_ref()], bump)]
    pub devwallet: Account<'info, Devwallet>,

    #[account(
    init,
    payer = dev,
    seeds = [ CUSTOM_USDT_MINT.parse::<Pubkey>().unwrap().as_ref() ],
    bump,
    token::mint = custom_token_mint,
    token::authority = program_custom_token_vault,
    )]
    pub program_custom_token_vault: Account<'info, TokenAccount>,

    #[account(
        address = CUSTOM_USDT_MINT.parse::<Pubkey>().unwrap(),
    )]
    pub custom_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub dev: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
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


// #[derive(Accounts)]
// pub struct Whitelist<'info> {
//     #[account(mut)]
//     pub devwallet: Account<'info, Devwallet>,
//     pub signer: Signer<'info>,
// }

#[derive(Accounts)]
pub struct Whitelist<'info> {
    #[account(mut)]
    pub devwallet: Account<'info, Devwallet>,
    #[account(mut)]
    pub signer: Signer<'info>,
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


#[derive(Accounts)]
#[instruction(_program_custom_token_vault_bump: u8)]
pub struct Swap<'info> {
    #[account(
    mut,
    seeds = [ custom_token_mint.key().as_ref() ],
    bump = _program_custom_token_vault_bump,
    )]
    pub ico_ata_for_ico_program: Account<'info, TokenAccount>,

    // #[account(
    //     mut,
    //     seeds = [b"VAULT_DEMO".as_ref()],  // Use the same seed
    //     bump = _vault_bump  // Validate the bump matches
    // )]
    // pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub devwallet: Account<'info, Devwallet>,
    

    #[account(
    address = CUSTOM_USDT_MINT.parse::<Pubkey>().unwrap(),
    )]
    pub custom_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_custom_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK:
    #[account(mut)]
    pub admin: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}





#[account]
pub struct Devwallet {
    pub admin: Pubkey,
    pub whitelist: Vec<(Pubkey, bool)>, // Using Vec as a substitute for HashMap
    pub amount_donated: u64,
}




impl Devwallet {
    // Helper method to update the whitelist Vec
    pub fn update_whitelist(&mut self, wallet: Pubkey, authorized: bool) {
        // Check if wallet is already in the whitelist
        for (key, value) in self.whitelist.iter_mut() {
            if *key == wallet {
                *value = authorized;
                return;
            }
        }
        // If wallet not found, insert as a new entry
        self.whitelist.push((wallet, authorized));
    }
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
