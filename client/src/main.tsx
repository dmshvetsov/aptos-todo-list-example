import { PetraWallet } from "petra-plugin-wallet-adapter";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const SUPPORTED_WALLETS = [
  new PetraWallet()
]

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AptosWalletAdapterProvider plugins={SUPPORTED_WALLETS} autoConnect>
      <App />
    </AptosWalletAdapterProvider>
  </React.StrictMode>,
)
