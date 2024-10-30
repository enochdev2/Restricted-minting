import * as anchor from "@coral-xyz/anchor";
import { CreateToken } from "../target/types/create_token";
import { Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("SPL Token Minter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.CreateToken as anchor.Program<CreateToken>;


  let devwallet: PublicKey;
  let devwalletBump: number;
  let mintAccount: anchor.web3.Keypair;
  let devTokenAccount: anchor.web3.PublicKey;

  before(async () => {
      // Derive devwallet PDA
      [devwallet, devwalletBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("DEV_WALLET"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      // Initialize mint account
      mintAccount = anchor.web3.Keypair.generate();

      // Create the associated token account for the dev wallet
      devTokenAccount = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        programUsdtVault
      );
  });

  const metadata = {
    decimals: 6,
    name: "Stallar",
    symbol: "USDT",
    uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json",
  };

  // Generate new keypair to use as address for mint account.
  const mintKeypair = new Keypair();
  console.log("🚀 ~ describe ~ mintKeypair:", mintKeypair);

  // Define the public key of the USDT vault
  const programUsdtVault = new anchor.web3.PublicKey("EV62byYdsPq9W7nR8TL2JtX5EVDrLwWmXYuMjttahbdJ");


  it("Creates a devwallet", async () => {
    await program.methods
      .create()
      .accounts({
        devwallet,
        dev: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([provider.wallet])
      .rpc();

    const devwalletAccount = await program.account.devwallet.fetch(devwallet);
    assert.equal(
      devwalletAccount.admin.toBase58(),
      provider.wallet.publicKey.toBase58(),
      "Dev wallet admin should be the provider wallet"
    );
  });

  it("Create an SPL Token!", async () => {
    const transactionSignature = await program.methods
      .createTokenMint(metadata.decimals, metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        payer: payer.publicKey,
        mintAccount: mintKeypair.publicKey,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("Success!");
    console.log(`   Mint Address: ${mintKeypair.publicKey}`);
    console.log(`   Transaction Signature: ${transactionSignature}`);
  });



  it("Mint some tokens to the USDT vault!", async () => {
    // Derive the associated token address for the mint and the USDT vault account.
    const usdtVaultTokenAccountAddress = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      programUsdtVault
    );

    // Amount of tokens to mint.
    const amount = new anchor.BN(100);

    // Mint the tokens directly to the USDT vault's associated token account.
    const transactionSignature = await program.methods
      .buyToken(amount)
      .accounts({
        mintAuthority: payer.publicKey,
        recipient: programUsdtVault, // Use the vault public key here
        mintAccount: mintKeypair.publicKey,
        // @ts-ignore
        associatedTokenAccount: usdtVaultTokenAccountAddress,
      })
      .rpc();

    console.log("Success!");
    console.log(`   USDT Vault Token Account Address: ${usdtVaultTokenAccountAddress}`);
    console.log(`   Transaction Signature: ${transactionSignature}`);
  });

  it("Burns tokens from the dev wallet's associated token account", async () => {
    const burnAmount = new anchor.BN(5 * 10 ** 6); // e.g., 5 tokens

    await program.methods
      .sellToken(burnAmount)
      .accounts({
        authority: provider.wallet.publicKey,
        devwallet,
        devWalletTokenAccount: devTokenAccount,
        mint: mintAccount.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([])
      .rpc();

    const devTokenBalance = await provider.connection.getTokenAccountBalance(
      devTokenAccount
    );
    assert.equal(
      devTokenBalance.value.amount,
      (5 * 10 ** 6).toString(),
      "The dev wallet should have the correct balance after burning tokens"
    );
  });


  it("Transfers tokens from one wallet to another", async () => {
    // Generate recipient token account
    const recipientWallet = anchor.web3.Keypair.generate();
    const recipientTokenAccount = await anchor.utils.token.associatedAddress({
      mint: mintAccount.publicKey,
      owner: recipientWallet.publicKey,
    });

    // Fund recipient's wallet to pay for account creation
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        recipientWallet.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      )
    );

    // Create recipient token account
    await provider.methods.createAssociatedTokenAccount({
      mint: mintAccount.publicKey,
      owner: recipientWallet.publicKey,
    });

    const transferAmount = new anchor.BN(2 * 10 ** 6); // e.g., 2 tokens

    await program.methods
      .transferToken(transferAmount)
      .accounts({
        authority: provider.wallet.publicKey,
        from: devTokenAccount,
        to: recipientTokenAccount,
        mint: mintAccount.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([])
      .rpc();

    const recipientTokenBalance = await provider.connection.getTokenAccountBalance(
      recipientTokenAccount
    );
    assert.equal(
      recipientTokenBalance.value.amount,
      transferAmount.toString(),
      "Recipient should receive the transferred tokens"
    );
  });





});

























// import * as anchor from "@coral-xyz/anchor";
// import { CreateToken } from "../target/types/create_token";
// import { Keypair } from "@solana/web3.js";
// import { getAssociatedTokenAddressSync } from "@solana/spl-token";

// describe("SPL Token Minter", () => {
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);
//   const payer = provider.wallet as anchor.Wallet;
//   const program = anchor.workspace
//     .CreateToken as anchor.Program<CreateToken>;

//   const metadata = {
//     decimals: 6,
//     name: "Stallar",
//     symbol: "USDT",
//     uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json",
//   };

//   // Generate new keypair to use as address for mint account.
//   const mintKeypair = new Keypair();
//   console.log("🚀 ~ describe ~ mintKeypair:", mintKeypair)

//   it("Create an SPL Token!", async () => {
//     const transactionSignature = await program.methods
//       .createTokenMint(metadata.decimals, metadata.name, metadata.symbol, metadata.uri)
//       .accounts({
//         payer: payer.publicKey,
//         mintAccount: mintKeypair.publicKey,
//       })
//       .signers([mintKeypair])
//       .rpc();

//     console.log("Success!");
//     console.log(`   Mint Address: ${mintKeypair.publicKey}`);
//     console.log(`   Transaction Signature: ${transactionSignature}`);
//   });

//   it("Mint some tokens to your wallet!", async () => {
//     // Derive the associated token address account for the mint and payer.
//     const associatedTokenAccountAddress = getAssociatedTokenAddressSync(
//       mintKeypair.publicKey,
//       payer.publicKey
//     );

//     // Amount of tokens to mint.
//     const amount = new anchor.BN(100);

//     // Mint the tokens to the associated token account.
//     const transactionSignature = await program.methods
//       .mintToken(amount)
//       .accounts({
//         mintAuthority: payer.publicKey,
//         recipient: payer.publicKey,
//         mintAccount: mintKeypair.publicKey,
//         associatedTokenAccount: associatedTokenAccountAddress,
//       })
//       .rpc();

//     console.log("Success!");
//     console.log(
//       `   Associated Token Account Address: ${associatedTokenAccountAddress}`
//     );
//     console.log(`   Transaction Signature: ${transactionSignature}`);
//   });
// });


















// // // import { OnchainVoting } from "../target/types/onchain_voting";
// // import * as anchor from "@coral-xyz/anchor";
// // import { Program } from "@coral-xyz/anchor";
// // import { Testing } from "../target/types/testing";

// // describe("testing", () => {
// //   // Configure the client to use the local cluster.
// //   anchor.setProvider(anchor.AnchorProvider.env());

// //   const program = anchor.workspace.Testing as Program<Testing>;

// //   let voteBank = anchor.web3.Keypair.generate();


// //   it("Creating vote bank for public to vote", async () => {
// //     const tx = await program.methods.initVoteBank()
// //       .accounts({
// //         voteAccount: voteBank.publicKey,
// //       })
// //       .signers([voteBank])
// //       .rpc();
// //     console.log("TxHash ::", tx);
// //   });

// //   it("Vote for GM", async () => { 
// //     const tx = await program.methods.gibVote({gm:{}})
// //     .accounts({
// //       voteAccount: voteBank.publicKey,
// //     })
// //     .rpc();
// //     console.log("TxHash ::", tx);


// //     let voteBankData = await program.account.voteBank.fetch(voteBank.publicKey);
// //     console.log(`Total GMs :: ${voteBankData.gm}`)
// //     console.log(`Total GNs :: ${voteBankData.gn}`)
// //   });


// //   // it("Vote for GN", async () => { 
// //   //   const tx = await program.methods.gibVote({g:{}})
// //   //   .accounts({
// //   //     voteAccount: voteBank.publicKey,
// //   //   })
// //   //   .rpc();
// //   //   console.log("TxHash ::", tx);


// //   //   let voteBankData = await program.account.voteBank.fetch(voteBank.publicKey);
// //   //   console.log(`Total GMs :: ${voteBankData.gm}`)
// //   //   console.log(`Total GNs :: ${voteBankData.gn}`)
// //   // });


// // });
