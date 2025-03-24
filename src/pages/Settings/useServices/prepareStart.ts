import {writeTextFile} from '@tauri-apps/plugin-fs'
import {ServiceData} from '.'

export async function prepareStart(services: ServiceData[]) {
  for (const service of services) {
    const env = `# Justo Runner V4.1
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

# Trap para matar procesos hijos al morir
trap 'echo "Killing child..."; kill 0' SIGINT SIGTERM EXIT

# Correr el child script en background
sh start.sh &

# Esperar al hijo
wait
`
    await writeTextFile(`${service.path}/.start.run.sh`, env)
  }
}
