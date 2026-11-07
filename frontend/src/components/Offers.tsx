import { useCallback, useEffect, useState } from 'react'
import { BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import {
    getAccount,
    getAssociatedTokenAddressSync,
    getMint,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'

import {
    fetchEscrows,
    takeEscrow,
    refundEscrow,
} from '../solana/escrow'

type EscrowOffer = {
    publicKey: PublicKey
    seed: BN
    maker: PublicKey
    mintA: PublicKey
    mintB: PublicKey
    receive: BN
    bump: number
}

type OfferDisplay = EscrowOffer & {
    depositedAmount: bigint
    tokenADecimals: number
    tokenBDecimals: number
}

const EXPLORER = 'https://explorer.solana.com/address/'

function formatTokenAmount(amount: bigint, decimals: number) {
    const divisor = 10n ** BigInt(decimals)
    const whole = amount / divisor
    const fraction = amount % divisor

    if (fraction === 0n) return whole.toString()

    const fractionString = fraction
        .toString()
        .padStart(decimals, '0')
        .replace(/0+$/, '')

    return `${whole}.${fractionString} `
}

function Offers() {
    const wallet = useWallet()
    const { connection } = useConnection()

    const [offers, setOffers] = useState<OfferDisplay[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [takingOffer, setTakingOffer] = useState<string | null>(null)
    const [refundingOffer, setRefundingOffer] = useState<string | null>(null)

    const [txSignature, setTxSignature] = useState('')
    const [txAction, setTxAction] = useState<'take' | 'refund' | ''>('')

    const loadOffers = useCallback(async () => {
        if (!wallet.publicKey) {
            setOffers([])
            return
        }

        setLoading(true)
        setError('')

        try {
            const result = await fetchEscrows(wallet)

            const enrichedOffers = await Promise.all(
                result.map(async (offer) => {
                    const [mintAInfo, mintBInfo] = await Promise.all([
                        connection.getAccountInfo(offer.mintA),
                        connection.getAccountInfo(offer.mintB),
                    ])

                    if (!mintAInfo || !mintBInfo) {
                        throw new Error('Unable to find an offer token mint')
                    }

                    const supportedPrograms = [
                        TOKEN_PROGRAM_ID,
                        TOKEN_2022_PROGRAM_ID,
                    ]

                    const tokenProgram = mintAInfo.owner

                    if (
                        !supportedPrograms.some((programId) =>
                            programId.equals(tokenProgram)
                        ) ||
                        !tokenProgram.equals(mintBInfo.owner)
                    ) {
                        throw new Error('Unsupported token program in offer')
                    }

                    const [mintA, mintB] = await Promise.all([
                        getMint(connection, offer.mintA, 'confirmed', tokenProgram),
                        getMint(connection, offer.mintB, 'confirmed', tokenProgram),
                    ])

                    const vault = getAssociatedTokenAddressSync(
                        offer.mintA,
                        offer.publicKey,
                        true,
                        tokenProgram,
                    )

                    const vaultAccount = await getAccount(
                        connection,
                        vault,
                        'confirmed',
                        tokenProgram,
                    )

                    return {
                        ...offer,
                        depositedAmount: vaultAccount.amount,
                        tokenADecimals: mintA.decimals,
                        tokenBDecimals: mintB.decimals,
                    }
                }),
            )

            setOffers(enrichedOffers)
        } catch (err) {
            console.error('Failed to fetch offers:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to fetch escrow offers'
            )
        } finally {
            setLoading(false)
        }
    }, [wallet.publicKey, connection, wallet])

    useEffect(() => {
        void loadOffers()
    }, [loadOffers])

    // TAKE OFFER
    const handleTakeOffer = async (offer: OfferDisplay) => {
        if (!wallet.publicKey) {
            setError('Connect your wallet first')
            return
        }

        const offerId = offer.publicKey.toBase58()

        setTakingOffer(offerId)
        setError('')
        setTxSignature('')
        setTxAction('')

        try {
            const signature = await takeEscrow(wallet, offer)

            setTxSignature(signature)
            setTxAction('take')

            await loadOffers()
        } catch (err) {
            console.error('Take offer failed:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to take offer'
            )
        } finally {
            setTakingOffer(null)
        }
    }

    // REFUND OFFER
    const handleRefundOffer = async (offer: OfferDisplay) => {
        if (!wallet.publicKey) {
            setError('Connect your wallet first')
            return
        }

        const offerId = offer.publicKey.toBase58()

        setRefundingOffer(offerId)
        setError('')
        setTxSignature('')
        setTxAction('')

        try {
            const signature = await refundEscrow(wallet, offer)

            setTxSignature(signature)
            setTxAction('refund')

            await loadOffers()
        } catch (err) {
            console.error('Refund failed:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to refund offer'
            )
        } finally {
            setRefundingOffer(null)
        }
    }

    return (
        <section className="mt-12">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        Open Offers
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                        Active token exchanges on Solana Devnet
                    </p>
                </div>

                <button
                    onClick={() => void loadOffers()}
                    disabled={
                        loading ||
                        !wallet.connected ||
                        takingOffer !== null ||
                        refundingOffer !== null
                    }
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-cyan-400 transition hover:bg-slate-800 disabled:opacity-50"
                >
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {!wallet.connected && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                    <p className="text-slate-300">
                        Connect your wallet to load offers.
                    </p>
                </div>
            )}

            {wallet.connected && loading && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
                    Fetching on-chain offers and vault balances...
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {wallet.connected && !loading && !error && offers.length === 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
                    <h3 className="text-lg font-semibold text-white">
                        No active offers yet
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                        Create the first token exchange on LockMint.
                    </p>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {offers.map((offer) => {
                    const isMaker = wallet.publicKey?.equals(offer.maker)
                    const offerId = offer.publicKey.toBase58()

                    const isTaking = takingOffer === offerId
                    const isRefunding = refundingOffer === offerId

                    const busy =
                        takingOffer !== null ||
                        refundingOffer !== null ||
                        loading

                    return (
                        <article
                            key={offerId}
                            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500/40"
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                                    Active
                                </span>

                                <span className="text-xs text-cyan-400">
                                    {isMaker ? 'Your offer' : 'Available to take'}
                                </span>
                            </div>

                            <div className="mb-5 rounded-xl bg-slate-800/70 p-4">
                                <p className="text-xs text-slate-400">
                                    You receive
                                </p>

                                <p className="mt-1 text-2xl font-bold text-white">
                                    {formatTokenAmount(
                                        offer.depositedAmount,
                                        offer.tokenADecimals,
                                    )}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    Token A
                                </p>

                                <div className="my-4 border-t border-slate-700" />

                                <p className="text-xs text-slate-400">
                                    You pay
                                </p>

                                <p className="mt-1 text-2xl font-bold text-cyan-400">
                                    {formatTokenAmount(
                                        BigInt(offer.receive.toString()),
                                        offer.tokenBDecimals,
                                    )}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    Token B
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500">
                                        Offer PDA
                                    </p>

                                    <p className="mt-1 break-all text-xs text-slate-300">
                                        {offerId}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">
                                        Maker
                                    </p>

                                    <p className="mt-1 break-all text-xs text-slate-300">
                                        {offer.maker.toBase58()}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">
                                        Token A mint
                                    </p>

                                    <p className="mt-1 break-all text-xs text-slate-300">
                                        {offer.mintA.toBase58()}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">
                                        Token B mint
                                    </p>

                                    <p className="mt-1 break-all text-xs text-slate-300">
                                        {offer.mintB.toBase58()}
                                    </p>
                                </div>
                            </div>

                            <a
                                href={`${EXPLORER}${offerId}?cluster = devnet`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-5 inline-block text-sm text-cyan-400 hover:text-cyan-300"
                            >
                                View on Solana Explorer ↗
                            </a>

                            {/* TAKER ACTION */}
                            {!isMaker && wallet.connected && (
                                <button
                                    onClick={() => void handleTakeOffer(offer)}
                                    disabled={busy}
                                    className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isTaking
                                        ? 'Processing transaction...'
                                        : busy
                                            ? 'Please wait...'
                                            : 'Take Offer'}
                                </button>
                            )}

                            {/* MAKER ACTION */}
                            {isMaker && wallet.connected && (
                                <button
                                    onClick={() => void handleRefundOffer(offer)}
                                    disabled={busy}
                                    className="mt-4 w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isRefunding
                                        ? 'Processing refund...'
                                        : busy
                                            ? 'Please wait...'
                                            : 'Refund Offer'}
                                </button>
                            )}
                        </article>
                    )
                })}
            </div>

            {txSignature && (
                <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="font-medium text-emerald-400">
                        {txAction === 'refund'
                            ? 'Offer successfully refunded!'
                            : 'Offer successfully taken!'}
                    </p>

                    <a
                        href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block break-all text-sm text-cyan-400 hover:underline"
                    >
                        View transaction ↗
                    </a >
                </div >
            )}
        </section >
    )
}

export default Offers