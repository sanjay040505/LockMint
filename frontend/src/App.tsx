
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Offers from './components/Offers'
import CreateOffer from './components/CreateOffer'

function App() {
  const { connected, publicKey } = useWallet()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur md:px-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Lock<span className="text-cyan-400">Mint</span>
          </h1>
          <p className="text-xs text-slate-400">
            Trustless Token Exchange
          </p>
        </div>

        <WalletMultiButton />
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {/* Hero */}
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Solana Devnet
          </div>

          <h2 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Exchange tokens.
            <br />
            <span className="text-cyan-400">
              Trustlessly.
            </span>
          </h2>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
            Create secure peer-to-peer token exchanges.
            Your assets stay protected by transparent,
            on-chain escrow smart contracts.
          </p>
        </section>

        {/* Wallet Status */}
        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-semibold">
                Wallet Status
              </h3>

              {connected && publicKey ? (
                <>
                  <p className="mt-2 text-sm text-emerald-400">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    Wallet connected
                  </p>

                  <p className="mt-2 break-all text-xs text-slate-400">
                    {publicKey.toBase58()}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  Connect Phantom to explore active token offers.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
              <p className="text-xs text-slate-500">
                Network
              </p>
              <p className="mt-1 text-sm font-medium text-cyan-400">
                Solana Devnet
              </p>
            </div>
          </div>
        </section>

        <CreateOffer />
        <Offers />

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-800 pt-6 text-center">
          <p className="text-sm font-semibold text-slate-300">
            Lock<span className="text-cyan-400">Mint</span>
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Trustless Token Exchange · Powered by Solana
          </p>

          <a
            href="https://explorer.solana.com/?cluster=devnet"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs text-cyan-400 hover:text-cyan-300"
          >
            Solana Explorer ↗
          </a>
        </footer>
      </main>
    </div>
  )
}

export default App
