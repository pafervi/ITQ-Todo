// People awareness: tasks can mention @person in their text. This helper
// extracts those mentions, aggregates them across every loaded list, and
// classifies each (person, task) pair into one of three buckets:
//
//   waiting_on_them    — a task of yours tagged with `#waiting` or
//                        `#waiting-on` plus their @mention (= they owe you)
//   they_waiting_on_us — a task tagged `#owe` or `#for:<name>` (= you owe
//                        them something), or a task starting with "ask",
//                        "send", "share", "reply" aimed at them
//   together           — any other task mentioning them
//
// The classification is a convention Pau can lean into or ignore — if he
// doesn't use the hint tags, every mention lands in "together".
//
// A person "name" is the slug the user typed after @, lowercased, with
// hyphens stripped so "@mercedes" and "@Mercedes" collide into one key.
// A nice display name is kept for the UI (first letter uppercased).

const MENTION_RE = /(^|[^a-zA-Z0-9_])@([a-zA-Z][a-zA-Z0-9_-]{1,30})/g;
const OWE_TAGS = ["owe", "owe-them", "waiting-reply"];
const WAITING_TAGS = ["waiting", "waiting-on", "waiting-for", "blocked"];

function slugify(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function prettyName(slug) {
  if (!slug) return "";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function mentionsIn(text) {
  if (!text) return [];
  let out = [];
  let seen = new Set();
  let m;
  // Reset lastIndex because the regex is a module-level global.
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text))) {
    let slug = slugify(m[2]);
    if (!slug) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug: slug, display: m[2] });
  }
  return out;
}

function classify(task) {
  let tags = (task.tags || []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => WAITING_TAGS.includes(t))) return "waiting_on_them";
  if (tags.some((t) => OWE_TAGS.includes(t))) return "they_waiting_on_us";
  // Soft heuristic for English + Spanish verbs that imply the ball is on
  // the other side of the court. Only fires on the first word.
  let firstWord = String(task.text || "").trim().split(/\s+/)[0].toLowerCase();
  if (["ask", "send", "reply", "answer", "share", "pregunta", "pregúntale", "preguntale", "manda", "envía", "envia", "contesta", "responde"].includes(firstWord)) {
    return "they_waiting_on_us";
  }
  return "together";
}

export default {
  // Extracts the @mentions from a single task's text. Each returned entry has
  // `slug` (normalised key) and `display` (as the user typed it).
  mentionsIn: mentionsIn,
  slugify: slugify,
  prettyName: prettyName,

  // Walks every task in every loaded list, returns a map keyed by slug:
  //   { slug: { slug, display, counts: {waiting_on_them, they_waiting_on_us, together},
  //             tasks: [{task, listId, listName, bucket}...] } }
  aggregateFrom(allLists, listNameFor) {
    let people = {};
    Object.keys(allLists || {}).forEach((listId) => {
      let list = allLists[listId] || [];
      list.forEach((t, idx) => {
        if (!t || t.checked) return;
        let mentions = mentionsIn(t.text);
        if (!mentions.length) return;
        let bucket = classify(t);
        mentions.forEach((m) => {
          if (!people[m.slug]) {
            people[m.slug] = {
              slug: m.slug,
              display: prettyName(m.slug),
              counts: { waiting_on_them: 0, they_waiting_on_us: 0, together: 0 },
              tasks: [],
            };
          }
          people[m.slug].counts[bucket]++;
          people[m.slug].tasks.push({
            text: t.text,
            listId: listId,
            index: idx,
            listName: listNameFor ? listNameFor(listId) : listId,
            bucket: bucket,
            priority: t.priority || 0,
            deadline: t.deadline || null,
          });
        });
      });
    });
    return people;
  },

  // Deterministic colour for a person's avatar chip (same hue formula as the
  // project color helper, but seeded by the person slug so avatars read as a
  // separate palette family).
  colorFor(slug) {
    let str = String(slug || "person");
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    let hue = hash % 360;
    return `hsl(${hue}, 55%, 52%)`;
  },

  initialsFor(slug) {
    let str = prettyName(slug);
    if (!str) return "?";
    // Pick the first two uppercase-friendly letters.
    let letters = str.match(/[A-Za-z]/g) || [];
    return (letters[0] || "?").toUpperCase() + (letters[1] || "").toLowerCase();
  },
};
