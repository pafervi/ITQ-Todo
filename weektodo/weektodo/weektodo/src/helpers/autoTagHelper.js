// Auto-tagging: when a task text mentions a known term from the daily
// computational-catalysis vocabulary, the matching tag is added automatically.
// Purely local, no network. Matching is case-insensitive and whole-word
// (or exact acronym), so "prepared" does not match "paper" and "activation"
// does not match "TS".
//
// Each entry maps a canonical tag to the patterns that trigger it. Patterns
// are matched with word boundaries against the raw task text.
const RULES = [
  { tag: "vasp", patterns: ["vasp", "outcar", "poscar", "incar", "kpoints", "contcar"] },
  { tag: "mace", patterns: ["mace"] },
  { tag: "dft", patterns: ["dft"] },
  { tag: "slurm", patterns: ["slurm", "squeue", "sacct", "sbatch"] },
  { tag: "ts", patterns: ["ts", "neb", "dimer", "saddle", "transition state"] },
  { tag: "irc", patterns: ["irc"] },
  { tag: "md", patterns: ["md", "molecular dynamics", "aimd"] },
  { tag: "activelearning", patterns: ["active learning", "al cycle", "al-cycle"] },
  { tag: "zeolita", patterns: ["zeolite", "zeolita", "mfi", "zsm-5", "zsm5", "faujasite", "chabazite"] },
  { tag: "paper", patterns: ["paper", "manuscript", "preprint", "referee", "reviewer", "revision"] },
  { tag: "reunion", patterns: ["meeting", "reunion", "reunión"] },
  { tag: "charla", patterns: ["talk", "charla", "conference", "congreso", "seminar", "seminario"] },
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A pattern matches when it appears as a whole token in the text. We allow
// surrounding non-alphanumerics (spaces, punctuation, hyphens at edges) so
// "ZSM-5" and "(DFT)" still match, but not substrings inside a longer word.
function patternMatches(text, pattern) {
  const re = new RegExp("(^|[^a-z0-9])" + escapeRegex(pattern) + "([^a-z0-9]|$)", "i");
  return re.test(text);
}

export default {
  rules: RULES,

  // Returns the tags that should be present given the text, merged with the
  // tags the task already has (never removes an existing tag, never dupes).
  tagsFor(text, existingTags) {
    let tags = Array.isArray(existingTags) ? existingTags.slice() : [];
    if (!text) return tags;
    let lower = String(text).toLowerCase();
    for (let rule of RULES) {
      if (tags.includes(rule.tag)) continue;
      if (rule.patterns.some((p) => patternMatches(lower, p))) {
        tags.push(rule.tag);
      }
    }
    return tags;
  },
};
