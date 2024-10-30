import * as anchor from "@coral-xyz/anchor";
import { CreateToken } from "../target/types/create_token";
import { Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

describe("SPL Token Minter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.CreateToken as anchor.Program<CreateToken>;

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
      .mintToken(amount)
      .accounts({
        mintAuthority: payer.publicKey,
        recipient: programUsdtVault, // Use the vault public key here
        mintAccount: mintKeypair.publicKey,
        associatedTokenAccount: usdtVaultTokenAccountAddress,
      })
      .rpc();

    console.log("Success!");
    console.log(`   USDT Vault Token Account Address: ${usdtVaultTokenAccountAddress}`);
    console.log(`   Transaction Signature: ${transactionSignature}`);
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
