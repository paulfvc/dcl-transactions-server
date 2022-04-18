import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import {
  createServerComponent,
  createStatusCheckComponent,
} from '@well-known-components/http-server'
import { createLogComponent } from '@well-known-components/logger'
import { createMetricsComponent } from '@well-known-components/metrics'
import { createContractsComponent } from './ports/contracts/component'
import { createDatabaseComponent } from './ports/database/component'
import { createFetchComponent } from './ports/fetcher'
import { createSubgraphComponent } from './ports/subgraph/component'
import { createTransactionComponent } from './ports/transaction/component'
import { metricDeclarations } from './metrics'
import { AppComponents, GlobalContext } from './types'

export async function initComponents(): Promise<AppComponents> {
  // default config from process.env + .env file
  const config = await createDotEnvConfigComponent(
    { path: ['.env.defaults', '.env'] },
    process.env
  )

  const cors = {
    origin: await config.getString('CORS_ORIGIN'),
    method: await config.getString('CORS_METHOD'),
  }

  const logs = createLogComponent()
  const server = await createServerComponent<GlobalContext>(
    { config, logs },
    { cors, compression: {} }
  )
  const database = await createDatabaseComponent(
    { logs },
    { filename: 'database.db' }
  )
  const collectionsSubgraph = createSubgraphComponent(
    await config.requireString('COLLECTIONS_SUBGRAPH_URL')
  )
  const statusChecks = await createStatusCheckComponent({ server })
  const fetcher = await createFetchComponent()
  const metrics = await createMetricsComponent(metricDeclarations, {
    server,
    config,
  })
  const contracts = createContractsComponent({
    config,
    fetcher,
    collectionsSubgraph,
  })
  const transaction = createTransactionComponent({
    config,
    fetcher,
    database,
    contracts,
    metrics,
  })

  const globalLogger = logs.getLogger('transactions-server')

  return {
    config,
    logs,
    globalLogger,
    fetcher,
    metrics,
    server,
    database,
    transaction,
    contracts,
    collectionsSubgraph,
    statusChecks,
  }
}
