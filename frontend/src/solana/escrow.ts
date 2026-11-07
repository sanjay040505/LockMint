
import { BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import type { WalletContextState } from '@solana/wallet-adapter-react'

import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    getAccount,
} from '@solana/spl-token'

import { getProgram } from './program'

// Escrow account data returned from the on-chain program
export type EscrowOffer = {
    publicKey: PublicKey
    seed: BN
    maker: PublicKey
    mintA: PublicKey
    mintB: PublicKey
    receive: BN
    bump: number
}

// Create a new escrow offer on Solana Devnet
export async function createEscrow(
    wallet: WalletContextState,
    mintAAddress: string,
    mintBAddress: string,
    depositAmount: bigint,
    receiveAmount: bigint,
) {
    if (!wallet.publicKey) {
        throw new Error('Connect your wallet first')
    }

    if (depositAmount <= 0n || receiveAmount <= 0n) {
        throw new Error('Amounts must be greater than zero')
    }

    const program = getProgram(wallet)
    const connection = program.provider.connection
    const maker = wallet.publicKey

    let mintA: PublicKey
    let mintB: PublicKey

    try {
        mintA = new PublicKey(mintAAddress)
        mintB = new PublicKey(mintBAddress)
    } catch {
        throw new Error('Invalid token mint address')
    }

    if (mintA.equals(mintB)) {
        throw new Error('Token A and Token B must be different')
    }

    // Verify both token mints exist
    const [mintAInfo, mintBInfo] = await Promise.all([
        connection.getAccountInfo(mintA),
        connection.getAccountInfo(mintB),
    ])

    if (!mintAInfo || !mintBInfo) {
        throw new Error('One or both token mints do not exist')
    }

    // Validate supported token programs
    const supportedPrograms = [
        TOKEN_PROGRAM_ID,
        TOKEN_2022_PROGRAM_ID,
    ]

    const isSupported = (owner: PublicKey) =>
        supportedPrograms.some((programId) => programId.equals(owner))

    if (!isSupported(mintAInfo.owner)) {
        throw new Error('Unsupported Token A program')
    }

    if (!isSupported(mintBInfo.owner)) {
        throw new Error('Unsupported Token B program')
    }

    // Both mints must use the same token program
    if (!mintAInfo.owner.equals(mintBInfo.owner)) {
        throw new Error('Both tokens must use the same token program')
    }

    const tokenProgram = mintAInfo.owner

    // Generate a unique u64 seed
    const seedValue =
        BigInt(Date.now()) * 1000n +
        BigInt(Math.floor(Math.random() * 1000))

    const seed = new BN(seedValue.toString())

    // Derive escrow PDA
    const [escrow] = PublicKey.findProgramAddressSync(
        [
            new TextEncoder().encode('escrow'),
            maker.toBytes(),
            new Uint8Array(seed.toArray('le', 8)),
        ],
        program.programId,
    )

    // Derive maker's Token A ATA
    const makerAtaA = getAssociatedTokenAddressSync(
        mintA,
        maker,
        false,
        tokenProgram,
    )

    // Derive escrow vault ATA
    const vault = getAssociatedTokenAddressSync(
        mintA,
        escrow,
        true,
        tokenProgram,
    )

    // Check maker's Token A account exists
    const makerTokenAccount = await connection.getAccountInfo(makerAtaA)

    if (!makerTokenAccount) {
        throw new Error(
            'You do not have a Token A associated token account',
        )
    }

    // Execute Anchor make instruction
    const signature = await program.methods
        .make(
            seed,
            new BN(receiveAmount.toString()),
            new BN(depositAmount.toString()),
        )
        .accounts({
            maker,
            escrow,
            mintA,
            mintB,
            makerAtaA,
            vault,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram,
            systemProgram: SystemProgram.programId,
        })
        .rpc()

    return {
        signature,
        escrow: escrow.toBase58(),
        seed: seed.toString(),
    }
}

// Fetch all active escrow accounts from the program
export async function fetchEscrows(
    wallet: WalletContextState,
): Promise<EscrowOffer[]> {
    if (!wallet.publicKey) {
        throw new Error('Connect your wallet first')
    }

    const program = getProgram(wallet)

    // The IDL is dynamically imported, so type the decoded account results.
    const escrowAccount = (program.account as any).escrow

    type DecodedEscrow = {
        publicKey: PublicKey
        account: {
            seed: BN
            maker: PublicKey
            mintA: PublicKey
            mintB: PublicKey
            receive: BN
            bump: number
        }
    }

    const escrows = await escrowAccount.all() as DecodedEscrow[]

    return escrows.map(({ publicKey, account }): EscrowOffer => ({
        publicKey,
        seed: account.seed,
        maker: account.maker,
        mintA: account.mintA,
        mintB: account.mintB,
        receive: account.receive,
        bump: account.bump,
    }))
}

export async function takeEscrow(
    wallet: WalletContextState,
    offer: EscrowOffer,
) {
    if (!wallet.publicKey) {
        throw new Error('Connect your wallet first')
    }

    const program = getProgram(wallet)
    const connection = program.provider.connection
    const taker = wallet.publicKey

    // Confirm the escrow is still active
    const escrowInfo = await connection.getAccountInfo(offer.publicKey)
    if (!escrowInfo) {
        throw new Error('This offer is no longer active')
    }

    // Validate token mints
    const [mintAInfo, mintBInfo] = await Promise.all([
        connection.getAccountInfo(offer.mintA),
        connection.getAccountInfo(offer.mintB),
    ])

    if (!mintAInfo || !mintBInfo) {
        throw new Error('Token mint not found')
    }

    const supportedPrograms = [
        TOKEN_PROGRAM_ID,
        TOKEN_2022_PROGRAM_ID,
    ]

    const isSupported = (owner: PublicKey) =>
        supportedPrograms.some((id) => id.equals(owner))

    if (
        !isSupported(mintAInfo.owner) ||
        !isSupported(mintBInfo.owner) ||
        !mintAInfo.owner.equals(mintBInfo.owner)
    ) {
        throw new Error('Unsupported or incompatible token programs')
    }

    const tokenProgram = mintAInfo.owner

    // Derive associated token accounts
    const vault = getAssociatedTokenAddressSync(
        offer.mintA, offer.publicKey, true, tokenProgram,
    )

    const takerAtaA = getAssociatedTokenAddressSync(
        offer.mintA, taker, false, tokenProgram,
    )

    const takerAtaB = getAssociatedTokenAddressSync(
        offer.mintB, taker, false, tokenProgram,
    )

    const makerAtaB = getAssociatedTokenAddressSync(
        offer.mintB, offer.maker, false, tokenProgram,
    )

    // Verify taker has enough Token B
    let takerTokenAccount

    try {
        takerTokenAccount = await getAccount(
            connection,
            takerAtaB,
            'confirmed',
            tokenProgram,
        )
    } catch {
        throw new Error('You do not have a Token B account')
    }

    if (takerTokenAccount.amount < BigInt(offer.receive.toString())) {
        throw new Error('Insufficient Token B balance')
    }

    // Execute the on-chain take instruction
    const signature = await program.methods
        .take()
        .accounts({
            taker,
            maker: offer.maker,
            escrow: offer.publicKey,
            mintA: offer.mintA,
            mintB: offer.mintB,
            vault,
            takerAtaA,
            takerAtaB,
            makerAtaB,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram,
            systemProgram: SystemProgram.programId,
        })
        .rpc()

    return signature
}

export async function refundEscrow(
    wallet: WalletContextState,
    offer: EscrowOffer,
) {
    if (!wallet.publicKey) {
        throw new Error('Connect your wallet first')
    }

    // Only the maker can refund their offer
    if (!wallet.publicKey.equals(offer.maker)) {
        throw new Error('Only the offer maker can refund this escrow')
    }

    const program = getProgram(wallet)
    const connection = program.provider.connection
    const maker = wallet.publicKey

    // Verify escrow is still active
    const escrowInfo = await connection.getAccountInfo(offer.publicKey)

    if (!escrowInfo) {
        throw new Error('This offer is no longer active')
    }

    // Verify Token A mint
    const mintAInfo = await connection.getAccountInfo(offer.mintA)

    if (!mintAInfo) {
        throw new Error('Token A mint not found')
    }

    const supportedPrograms = [
        TOKEN_PROGRAM_ID,
        TOKEN_2022_PROGRAM_ID,
    ]

    const tokenProgram = mintAInfo.owner

    if (!supportedPrograms.some((id) => id.equals(tokenProgram))) {
        throw new Error('Unsupported token program')
    }

    // Derive vault and maker token account
    const vault = getAssociatedTokenAddressSync(
        offer.mintA,
        offer.publicKey,
        true,
        tokenProgram,
    )

    const makerAtaA = getAssociatedTokenAddressSync(
        offer.mintA,
        maker,
        false,
        tokenProgram,
    )

    // Execute refund instruction
    const signature = await program.methods
        .refund()
        .accounts({
            maker,
            escrow: offer.publicKey,
            mintA: offer.mintA,
            vault,
            makerAtaA,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram,
            systemProgram: SystemProgram.programId,
        })
        .rpc()

    return signature
}