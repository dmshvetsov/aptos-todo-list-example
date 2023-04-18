import { Network, Provider } from "aptos"

let aptosClient: Provider | null = null

export function getAptosClient(): Provider {
 if (aptosClient) {
   return aptosClient
 }

  aptosClient = new Provider(Network.DEVNET)
  return aptosClient
}
