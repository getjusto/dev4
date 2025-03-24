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

# Start in a new process group explicitly
sh start.sh &
child_pid=$!

parent_pid=$PPID

# Polling to detect parent termination
while kill -0 "$parent_pid" 2>/dev/null; do
  sleep 1
done

echo "Parent app terminated. Killing child processes."
kill -TERM -"$(ps -o pgid= "$child_pid" | grep -o "[0-9]*")"
`
    await writeTextFile(`${service.path}/.start.run.sh`, script)

    const script2 = `#!/bin/bash
sh .start.run.sh
    `
    await writeTextFile(`${service.path}/.start.wrap.sh`, script2)
  }
}
