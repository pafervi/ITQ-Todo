// Parses the output of SLURM `squeue` / `sacct` pasted into the queue modal
// and returns one entry per job with { jobId, name, calcStatus }. The result
// feeds pasteQueueModal, which either updates an existing task that mentions
// the jobId or creates a new task tagged with that calcStatus.

const STATE_MAP = {
  PD: "queued",
  PENDING: "queued",
  CF: "queued",
  CONFIGURING: "queued",
  R: "running",
  RUNNING: "running",
  CG: "running",
  COMPLETING: "running",
  S: "running",
  SUSPENDED: "running",
  CD: "done",
  COMPLETED: "done",
  F: "failed",
  FAILED: "failed",
  TO: "failed",
  TIMEOUT: "failed",
  NF: "failed",
  NODE_FAIL: "failed",
  CA: "failed",
  CANCELLED: "failed",
  BF: "failed",
  BOOT_FAIL: "failed",
  DL: "failed",
  DEADLINE: "failed",
  OOM: "failed",
  PR: "failed",
  PREEMPTED: "failed",
};

function mapState(raw) {
  if (!raw) return null;
  let key = String(raw).toUpperCase().replace(/\+$/, "");
  return STATE_MAP[key] || null;
}

export default {
  parse(text) {
    if (!text) return [];
    let lines = String(text).split(/\r?\n/);
    let jobs = [];
    let seen = new Set();

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      // Skip headers and separators.
      if (/^-+$/.test(line)) continue;
      if (/^JOBID\b/i.test(line)) continue;

      // Whitespace-separated columns. squeue default and most sacct formats
      // put JOBID first; find the first numeric token (optionally with .batch
      // suffix for sacct steps) and the first SLURM state code anywhere in
      // the row.
      let cols = line.split(/\s+/);
      let jobId = null;
      let name = null;
      let state = null;

      for (let i = 0; i < cols.length; i++) {
        let c = cols[i];
        if (!jobId && /^\d+(_\d+)?(\.\w+)?$/.test(c)) {
          jobId = c.split(".")[0]; // strip step suffix
          continue;
        }
        if (!state) {
          let mapped = mapState(c);
          if (mapped) {
            state = mapped;
            continue;
          }
        }
      }

      if (!jobId) continue;
      if (seen.has(jobId)) continue;
      seen.add(jobId);

      // Best-effort name: squeue column 3 is NAME; sacct column 2 is JobName.
      // We take the shortest reasonable alphanumeric token right after jobId.
      let idIdx = cols.findIndex((c) => c.split(".")[0] === jobId);
      if (idIdx >= 0 && idIdx + 2 < cols.length) {
        let candidate = cols[idIdx + 2];
        if (candidate && !mapState(candidate) && !/^\d+$/.test(candidate)) {
          name = candidate;
        }
      }

      jobs.push({ jobId: jobId, name: name, calcStatus: state });
    }
    return jobs;
  },
};
