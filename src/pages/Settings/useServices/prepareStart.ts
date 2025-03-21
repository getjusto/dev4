import {writeTextFile} from '@tauri-apps/plugin-fs'
import {ServiceData} from '.'

export async function prepareStart(services: ServiceData[]) {
  for (const service of services) {
    const env = `# Justo Runner V$
export LOCAL_NETWORK_NAME=host.docker.internal
export MONGO_URL=mongodb://host.docker.internal:3003/${service.config.dbName || service.name}
export KAFKA_BROKERS=host.docker.internal:30092
export REDIS_URL=redis://host.docker.internal:6379/0
export JUSTO_ENV=local
export ORION_ENV_SECRET_KEY=l/sfhfgkQLSzkJvlIXvdzMk/N2THomjPm3P8oEpmaSM=
export ORION_ENV_FILE_PATH=.env.local.yml
export SERVICE_NAME=${service.name}
export PORT=${service.port}
yarn --frozen-lockfile
sh start.sh`
    await writeTextFile(`${service.path}/.start.run.sh`, env)
  }
}
