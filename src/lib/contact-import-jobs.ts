export interface TrackedContactImportJob {
  import_id: string
  created_at: string
  file_name?: string
  organization_id?: string
  source: "csv"
}

const KEY = "contact-import-jobs:v1"

const readJobs = (): TrackedContactImportJob[] => {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((job) => job && typeof job.import_id === "string")
  } catch {
    return []
  }
}

const writeJobs = (jobs: TrackedContactImportJob[]) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(KEY, JSON.stringify(jobs))
  } catch {
    // Ignore storage errors.
  }
}

export const getTrackedContactImportJobs = (organizationId?: string | null): TrackedContactImportJob[] => {
  const jobs = readJobs()
  const filtered = organizationId
    ? jobs.filter((job) => !job.organization_id || job.organization_id === organizationId)
    : jobs
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export const trackContactImportJob = (job: TrackedContactImportJob) => {
  const existing = readJobs()
  const withoutCurrent = existing.filter((item) => item.import_id !== job.import_id)
  const next = [job, ...withoutCurrent].slice(0, 200)
  writeJobs(next)
}

