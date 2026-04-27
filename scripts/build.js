const { spawnSync } = require("node:child_process")

const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_TRACE_UPLOAD_DISABLED: "1",
}

const result = spawnSync(
  process.execPath,
  [
    "--require",
    require.resolve("./suppress-localstorage-warning"),
    require.resolve("next/dist/bin/next"),
    "build",
    "--webpack",
  ],
  {
    env,
    shell: false,
    stdio: "inherit",
  }
)

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
