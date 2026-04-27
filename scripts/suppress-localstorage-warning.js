const originalEmitWarning = process.emitWarning.bind(process)

process.emitWarning = (...args) => {
  const [warning] = args
  const message =
    typeof warning === "string" ? warning : warning && warning.message

  if (
    typeof message === "string" &&
    message.includes("--localstorage-file") &&
    message.includes("without a valid path")
  ) {
    return
  }

  return originalEmitWarning(...args)
}
