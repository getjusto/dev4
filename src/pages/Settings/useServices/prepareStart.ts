import {writeTextFile} from '@tauri-apps/plugin-fs'
import {ServiceData} from '.'

export async function prepareStart(services: ServiceData[]) {
  for (const service of services) {
    const script = `#!/bin/bash
# Justo Runner V4.1
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

# Check if a process is running on the specified port (TCP)
PID=$(lsof -ti tcp:"$PORT")

if [ -n "$PID" ]; then
  echo "Process already running on port $PORT, PID(s): $PID"
  kill -TERM $PID
  echo "Killed process(es) with PID(s): $PID"
else
  echo "No process running on port $PORT"
fi

exec sh start.sh 
`
    await writeTextFile(`${service.path}/.start.run.sh`, script)
  }
}
