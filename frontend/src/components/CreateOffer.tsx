
import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import {
    getMint,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'

import { createEscrow } from '../solana/escrow'

const EXPLORER = 'https://explorer.solana.com/tx/'

function parseTokenAmount(amount: string, decimals: number): bigint {
    if (!/^\d+(\.\d+)?$/.test(amount)) {
        throw new Error('Enter a valid positive token amount')
    }

    const [whole, fraction = ''] = amount.split('.')

    if (fraction.length > decimals) {
        throw new Error(`This token supports only ${decimals} decimal places`)
    }

    const baseUnits =
        whole + fraction.padEnd(decimals, '0')

    const result = BigInt(baseUnits)

    if (result <= 0n) {
        throw new Error('Amount must be greater than zero')
    }

    return result
}

function CreateOffer() {
    const wallet = useWallet()
    const { connection } = useConnection()

    const [mintA, setMintA] = useState('')
    const [mintB, setMintB] = useState('')
    const [depositAmount, setDepositAmount] = useState('')
    const [receiveAmount, setReceiveAmount] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [signature, setSignature] = useState('')

    async function handleCreateOffer(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (!wallet.publicKey) {
            setError('Connect your Phantom wallet first')
            return
        }

        setLoading(true)
        setError('')
        setSignature('')

        try {
            const mintAKey = new PublicKey(mintA.trim())
            const mintBKey = new PublicKey(mintB.trim())

            if (mintAKey.equals(mintBKey)) {
                throw new Error('Choose two different token mints')
            }

            // Fetch mint account information
            const [mintAInfo, mintBInfo] = await Promise.all([
                connection.getAccountInfo(mintAKey),
                connection.getAccountInfo(mintBKey),
            ])

            if (!mintAInfo || !mintBInfo) {
                throw new Error('One or both token mints do not exist on Devnet')
            }

            const supportedPrograms = [
                TOKEN_PROGRAM_ID,
                TOKEN_2022_PROGRAM_ID,
            ]

            const isSupported = (owner: PublicKey) =>
                supportedPrograms.some((id) => id.equals(owner))

            if (
                !isSupported(mintAInfo.owner) ||
                !isSupported(mintBInfo.owner)
            ) {
                throw new Error('Unsupported token program')
            }

            if (!mintAInfo.owner.equals(mintBInfo.owner)) {
                throw new Error('Both tokens must use the same token program')
            }

            // Read actual token decimals
            const [mintAData, mintBData] = await Promise.all([
                getMint(connection, mintAKey, 'confirmed', mintAInfo.owner),
                getMint(connection, mintBKey, 'confirmed', mintBInfo.owner),
            ])

            // Convert display amounts into token base units
            const deposit = parseTokenAmount(
                depositAmount,
                mintAData.decimals,
            )

            const receive = parseTokenAmount(
                receiveAmount,
                mintBData.decimals,
            )

            // Create actual on-chain escrow
            const result = await createEscrow(
                wallet,
                mintAKey.toBase58(),
                mintBKey.toBase58(),
                deposit,
                receive,
            )

            setSignature(result.signature)

            setMintA('')
            setMintB('')
            setDepositAmount('')
            setReceiveAmount('')
        } catch (err) {
            console.error('Create offer failed:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'Transaction failed',
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section
            id="create-offer"
            className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
            <div className="mb-7">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                    Create Exchange
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white">
                    Create an Offer
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                    Deposit one token and specify what you want in return.
                </p>
            </div>

            {!wallet.connected ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-5 text-center">
                    <p className="text-sm text-slate-400">
                        Connect your Phantom wallet to create an offer.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleCreateOffer} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Token A — Deposit
                        </label>

                        <input
                            type="text"
                            required
                            value={mintA}
                            onChange={(e) => setMintA(e.target.value)}
                            placeholder="Token A mint address"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                        />

                        <input
                            type="text"
                            required
                            inputMode="decimal"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="Amount to deposit"
                            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                        />
                    </div>

                    <div className="flex justify-center">
                        <div className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-cyan-400">
                            ↓ Exchange for ↓
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Token B — Request
                        </label>

                        <input
                            type="text"
                            required
                            value={mintB}
                            onChange={(e) => setMintB(e.target.value)}
                            placeholder="Token B mint address"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                        />

                        <input
                            type="text"
                            required
                            inputMode="decimal"
                            value={receiveAmount}
                            onChange={(e) => setReceiveAmount(e.target.value)}
                            placeholder="Amount you want to receive"
                            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {signature && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                            <p className="font-semibold text-emerald-400">
                                Offer created successfully!
                            </p>

                            <a
                                href={`${EXPLORER}${signature}?cluster=devnet`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block break-all text-sm text-cyan-400 hover:text-cyan-300"
                            >
                                View transaction on Explorer ↗
                            </a>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-cyan-400 px-5 py-4 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading
                            ? 'Waiting for transaction...'
                            : 'Create Escrow Offer'}
                    </button>

                    <p className="text-center text-xs text-slate-500">
                        Transactions require Phantom wallet approval.
                        Connected to Solana Devnet.
                    </p>
                </form>
            )}
        </section>
    )
}

export default CreateOffer
