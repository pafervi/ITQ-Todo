// Heuristic parser for pasted `squeue` / `sacct` output. Not a strict format
// parser (SLURM output varies a lot by site config) — good enough to save
// Pau from typing job status by hand after checking a cluster queue.

const STATE_MAP = {
  R: "running",
  RUNNING: "running",
  CG: "running",
  COMPLETING: "running",
  PD: "queued",
  PENDING: "queued",
  CF: "queued",
  CONFIGURING: "queued",
  RS: "queued",
  RESIZING: "queued",
  CD: "done",
  COMPLETED: "done",
  F: "failed",
  FAILED: "failed",
  TO: "failed",
  TIMEOUT: "failed",
  CA: "failed",
  CANCELLED: "failed",
  NF: "failed",
  NODE_FAIL: "failed",
  OOM: "failed",
  OUT_OF_MEMORY: "failed",
  BF: "failed",
  BOOT_FAIL: "failed",
  DL: "failed",
  DEADLINE: "failed",
  PR: "failed",
  PREEMPTED: "failed",
};

function normalizeState(token) {
  if (!token) return null;
  let key = token
    .trim()
    .toUpperCase()
    .replace(/\+$/, "");
  return STATE_MAP[key] || null;
}

export default {
  // Returns [{ jobId, name, calcStatus }], de-duplicated by jobId.
  parse(text) {
    if (!text) return [];
    let lines = text
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let results = [];

    lines.forEach((line) => {
      if (/^JOBID\b/i.test(line) || /^JobID\|/i.test(line)) return; // header row

      let jobId, name, state;

      if (line.indexOf("|") !== -1) {
        // sacct --parsable(2) style: JobID|JobName|State|...
        let cols = line.split("|").map((c) => c.trim());
        jobId = (cols[0] || "").split(".")[0];
        if (!/^\d+$/.test(jobId)) return;
        name = cols[1] || "";
        state = cols.map(normalizeState).find((s) => s) || null;
      } else {
        // squeue-style whitespace-delimited: JOBID PARTITION NAME USER ST TIME ...
        let cols = line.split(/\s+/);
        if (!cols[0] || !/^\d+(_\d+)?$/.test(cols[0])) return;
        jobId = cols[0].split("_")[0];
        name = cols.length >= 3 ? cols[2] : "";
        state = cols.slice(1).map(normalizeState).find((s) => s) || null;
      }

      if (!jobId) return;
      results.push({ jobId: jobId, name: name, calcStatus: state });
    });

    let byId = {};
    results.forEach((r) => {
      byId[r.jobId] = r;
    });
    return Object.values(byId);
  },
};
