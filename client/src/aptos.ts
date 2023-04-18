import { Network, Provider } from 'aptos'

let aptosClient: Provider | null = null

export function getAptosClient(): Provider {
  if (aptosClient) {
    return aptosClient
  }

  aptosClient = new Provider(Network.DEVNET)
  return aptosClient
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-5)}`
}
