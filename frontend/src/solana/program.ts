
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import type { WalletContextState } from '@solana/wallet-adapter-react'
import idl from '../idl/anchor_escrow.json'

const PROGRAM_ID = new PublicKey(
    'E97PfH3cbDVEdNJHhb3C7QRgWDrNMMfSH1Qdoi6YqQyE',
)

const DEVNET_RPC = 'https://api.devnet.solana.com'

export function getProgram(wallet: WalletContextState) {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
        throw new Error('Wallet is not connected')
    }

    const connection = new Connection(DEVNET_RPC, 'confirmed')

    const provider = new AnchorProvider(
        connection,
        wallet as never,
        AnchorProvider.defaultOptions(),
    )

    const program = new Program(
        { ...idl, address: PROGRAM_ID.toBase58() } as never,
        provider,
    )

    return program
}
