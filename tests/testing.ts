import * as anchor from "@coral-xyz/anchor";
import { CreateToken } from "../target/types/create_token";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
const connection = new Connection(
  clusterApiUrl('devnet'),
  'confirmed'
);

describe("SPL Token Minter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.CreateToken as anchor.Program<CreateToken>;

  //?  Mint Address: BxCED6tEFyCpok6KiDmfVMW8z8WvE8QEyDfJXj2LP3FW
  
  let devwallet: any;
  let devwalletBump: number;
  let mintAccount: anchor.web3.Keypair;
  let mintAccounts: anchor.web3.PublicKey;
  let devTokenAccount: anchor.web3.PublicKey;
  let userPrivateKey: any;
  let userKeypair: any;
  let adminKeypair: anchor.web3.Keypair;
  let programCustomTokenVault: any, _bump: any;
  let customTokenMint:any

  const CUSTOM_USDT_MINT = new PublicKey(
    "GYNdve5Wdj38wpVTwwdaPZ6YhdygR5z4La34fRkxcB6C"
  );
  // "GYNdve5Wdj38wpVTwwdaPZ6YhdygR5z4La34fRkxcB6C"
  before(async () => {
    // Initialize mint account
    mintAccount = anchor.web3.Keypair.generate();
    
    mintAccounts = new PublicKey("GYNdve5Wdj38wpVTwwdaPZ6YhdygR5z4La34fRkxcB6C");
     
    customTokenMint = new PublicKey(CUSTOM_USDT_MINT);

      userPrivateKey =
      "2FbWj5unRi86bzkSee4asRwzkf7XeTbKWsahGZLx3VaAEmDp6D3LBkAJ12ZWJCywhPPnPrrTvD31jy8WnAn52UAj";
    // Example: assuming your private key is in base58 format, as Solana keys often are
    const adminPrivateKeyBase58 =
      "4aVKNvEk57BQtqtjuWwSJctF3MhKCCzBLbYez7ynj9VAJ5xj9PBPRVd9USF4xFDa9eoVR5Qr1818NsESGzrn72wM";
    const adminPrivateKeyBytess = bs58.decode(adminPrivateKeyBase58);
    const userPrivateKeyBase =
      "2FbWj5unRi86bzkSee4asRwzkf7XeTbKWsahGZLx3VaAEmDp6D3LBkAJ12ZWJCywhPPnPrrTvD31jy8WnAn52UAj";

    // Check the length of the decoded key
    console.log("Secret key length:", adminPrivateKeyBytess.length); // Should be 64 bytes
    console.log("Secret key length:", userPrivateKeyBase.length); // Should be 64 bytes

    if (adminPrivateKeyBytess.length === 64) {
      adminKeypair = Keypair.fromSecretKey(adminPrivateKeyBytess);
      console.log("Admin Public Key:", adminKeypair.publicKey.toString());
    } else {
      console.error("Error: Invalid secret key length. Expected 64 bytes.");
    }
    const userPrivateKeyBase58 =
      "2FbWj5unRi86bzkSee4asRwzkf7XeTbKWsahGZLx3VaAEmDp6D3LBkAJ12ZWJCywhPPnPrrTvD31jy8WnAn52UAj";
    const userPrivateKeyBytess = bs58.decode(userPrivateKeyBase58);
    if (userPrivateKeyBytess.length === 64) {
      userKeypair = Keypair.fromSecretKey(userPrivateKeyBytess);
    } else {
      console.error("Error: Invalid secret key length. Expected 64 bytes.");
    }
    
     // Derive devwallet PDA
     [devwallet, devwalletBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("DEV_WALLET"), adminKeypair.publicKey.toBuffer()],
      program.programId
    ); 

    [programCustomTokenVault, _bump] = PublicKey.findProgramAddressSync(
      [CUSTOM_USDT_MINT.toBuffer()],
      program.programId
    );

    // console.log("🚀 ~ before ~ [devwallet:", devwallet.toString())
   
  });

  const metadata = {
    decimals: 6,
    name: "SOL USDT",
    symbol: "USDT",
    uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json",
  };

  // Generate new keypair to use as address for mint account.
  const mintKeypair = new Keypair();

  // Define the public key of the USDT vault
  const programUsdtVault = new anchor.web3.PublicKey("BxCED6tEFyCpok6KiDmfVMW8z8WvE8QEyDfJXj2LP3F");
    // Create the associated token account for the dev wallet
    // devTokenAccount = getAssociatedTokenAddressSync(
    //   adminKeypair.publicKey,
    //   programUsdtVault
    // );


  // it("Creates a devwallet", async () => {
  //   await program.methods
  //     .create()
  //     .accounts({
  //       // @ts-ignore
  //       devwallet,
  //       programCustomTokenVault,
  //       customTokenMint,
  //       dev: adminKeypair.publicKey,
  //       systemProgram: SystemProgram.programId,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //     })
  //     .signers([adminKeypair])
  //     .rpc();

  //   // const devwalletAccount = await program.account.devwallet.fetch(devwallet);
  //   // assert.equal(
  //   //   devwalletAccount.admin.toBase58(),
  //   //   adminKeypair.publicKey.toBase58(),
  //   //   "Dev wallet admin should be the provider wallet"
  //   // );
  // });


  it("Adding to Whitelist by devwallet", async () => {
    await program.methods
    .whitelistWallet(userKeypair.publicKey, true)
      .accounts({
        // @ts-ignore
        devwallet,
        signer: adminKeypair.publicKey,
      })
      .signers([adminKeypair])
      .rpc();

    // const devwalletAccount = await program.account.devwallet.fetch(devwallet);
    // assert.equal(
    //   devwalletAccount.admin.toBase58(),
    //   adminKeypair.publicKey.toBase58(),
    //   "Dev wallet admin should be the provider wallet"
    // );
  });


  // it("Create an SPL Token!", async () => {
  //   const transactionSignature = await program.methods
  //     .createTokenMint(metadata.decimals, metadata.name, metadata.symbol, metadata.uri)
  //     .accounts({
  //       payer: adminKeypair.publicKey,
  //       mintAccount: mintKeypair.publicKey,
  //     })
  //     .signers([mintKeypair, adminKeypair])
  //     // .signers([adminKeypair])
  //     .rpc();

  //   console.log("Success!");
  //   console.log(`   Mint Address: ${mintKeypair.publicKey}`);
  //   console.log(`   Transaction Signature: ${transactionSignature}`);
  // });



  it("Mint some tokens to the USDT vault!", async () => {
    // Derive the associated token address for the mint and the USDT vault account.

    // Amount of tokens to mint.
    const amount = new anchor.BN(100);

    // Mint the tokens directly to the USDT vault's associated token account.
    const transactionSignature = await program.methods
      .buyToken(amount)
      .accounts({
        mintAuthority: adminKeypair.publicKey,       // Must be writable and a signer
        devwallet: devwallet,               // Must be writable
        recipient: adminKeypair.publicKey,               // Recipient account
        mintAccount: mintAccounts,           // Must be writable
        // // @ts-ignore
        // associatedTokenAccount: adminTokenAccount, // PDA, writable
        // tokenProgram: TOKEN_PROGRAM_ID,               // SPL Token Program
        // associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, // Associated Token Program
        // systemProgram: SystemProgram.programId        // Solana System Program
      })
      .signers([adminKeypair])
      .rpc();

        if(transactionSignature){
          const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            adminKeypair,
            mintAccounts,
            adminKeypair.publicKey
          )

          console.log("🚀 ~ it ~ adminTokenAccount:", adminTokenAccount)
        }

  //   console.log("Success!");
  //   console.log(`   USDT Vault Token Account Address: ${usdtVaultTokenAccountAddress}`);
  //   console.log(`   Transaction Signature: ${transactionSignature}`);
  });

  it("Burns tokens from the dev wallet's associated token account", async () => {
    const burnAmount = new anchor.BN(5 * 10 ** 6); // e.g., 5 tokens
    const amount = new anchor.BN(10 * 10 ** 6);
    // Retrieve the associated token account for `devwallet`
    const devWalletTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        adminKeypair,            // Payer for any creation fees
        mintAccounts,            // Mint address
        adminKeypair.publicKey                 // Owner of the associated token account
    );


    // Check if the associated token account was created successfully
    if (!devWalletTokenAccount || !devWalletTokenAccount.address) {
      throw new Error("Failed to retrieve or create devWalletTokenAccount");
    }
    const devwalletAcc = new PublicKey(devWalletTokenAccount.address.toString());
    await program.methods
      .sellToken(amount)
      .accounts({
        authority: adminKeypair.publicKey,
        devwallet,
        devWalletTokenAccount: devwalletAcc,
        mint: mintAccounts,
      })
      .signers([adminKeypair])
      .rpc();

    // const devTokenBalance = await provider.connection.getTokenAccountBalance(
    //   devTokenAc
    // );
    // assert.equal(
    //   devTokenBalance.value.amount,
    //   (5 * 10 ** 6).toString(),
    //   "The dev wallet should have the correct balance after burning tokens"
    // );
  });


  it("Transfers tokens from one wallet to another", async () => {
    // Retrieve the associated token account for `devwallet`
     const devWalletTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,            // Payer for any creation fees
      mintAccounts,            // Mint address
      adminKeypair.publicKey                 // Owner of the associated token account
    );

    const devwalletAcc = new PublicKey(devWalletTokenAccount.address.toString());
      
    const dumeAccount = new PublicKey("HWcqDC8VhUVEeNQdmrfCLUSJgMD6h4vaTE6wTJh5XvyG");
    // Retrieve the associated token account for `devwallet`
    const toWalletTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,            // Payer for any creation fees
      mintAccounts,            // Mint address
      dumeAccount                 // Owner of the associated token account
    );

    const towalletAcc = new PublicKey(toWalletTokenAccount.address.toString());
   
    const transferAmount = new anchor.BN(50000000); // e.g., 2 tokens

    await program.methods
      .transferToken(transferAmount)
      .accounts({
        authority: adminKeypair.publicKey,
        from: devwalletAcc,
        to: towalletAcc,
        // @ts-ignore
        mint: mintAccounts,
      })
      .signers([adminKeypair])
      .rpc();

    const recipientTokenBalance = await provider.connection.getTokenAccountBalance(
      towalletAcc
    );
    console.log("🚀 ~ it ~ recipientTokenBalance :", recipientTokenBalance.value.amount.toString() )
    // assert.equal(
    //   recipientTokenBalance.value.amount,
    //   transferAmount.toString(),
    //   "Recipient should receive the transferred tokens"
    // );
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
