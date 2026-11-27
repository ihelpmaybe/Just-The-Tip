import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem'
import { quoteAmount, POOL_PRESETS } from '../src/chain/pools'

async function main() {
  const pair = POOL_PRESETS[0]!
  const client = createPublicClient({
    transport: http('https://rpc.pulsechain.com', { timeout: 25_000 }),
  })
  const tip = await client.getBlockNumber()
  const from = tip - 40n
  console.log('tip', tip.toString())
  console.log('pool', pair.label, pair.address)
  const swapEvent = parseAbiItem(
    'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
  )
  const logs = await client.getLogs({
    address: pair.address,
    event: swapEvent,
    fromBlock: from,
    toBlock: tip,
  })
  console.log('swaps in ~40 blocks', logs.length)
  for (const log of logs.slice(0, 4)) {
    const a = log.args as {
      amount0In: bigint
      amount1In: bigint
      amount0Out: bigint
      amount1Out: bigint
    }
    const q = quoteAmount(pair, {
      amount0In: a.amount0In,
      amount1In: a.amount1In,
      amount0Out: a.amount0Out,
      amount1Out: a.amount1Out,
    })
    const human = Number(formatUnits(q.amountWei, pair.decimals))
    console.log(
      q.side,
      human.toFixed(1),
      q.quoteSymbol,
      'minOk=',
      human >= pair.minAmount,
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
