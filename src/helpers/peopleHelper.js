import moment from "moment";
import listScanHelper from "./listScanHelper";

// People awareness: tasks can mention @person in their text. This helper
// extracts those mentions, aggregates them across every list, and classifies
// each (person, task) pair into one of three buckets:
//
//   waiting_on_them    - a task tagged `#waiting` / `#waiting-on` / `#esperando`
//                        plus their @mention (= they owe you)
//   they_waiting_on_us - a task tagged `#owe` / `#debo`, or a task starting
//                        with "ask", "send", "reply", "pregunta", "manda"...
//                        aimed at them (= you owe them something)
//   together           - any other task mentioning them
//
// The classification is a convention you can lean into or ignore: without the
// hint tags every mention lands in "together".
//
// A person key (slug) is the name typed after @, lowercased, without accents
// and without punctuation, so "@Mercedes", "@mercedes" and "@Mercédes" all
// collide into one person. The display name keeps the first form typed.

// A mention is "@" followed by a letter, not glued to a previous word
// character (so e-mail addresses like pau@itq.csic.es are not mentions).
const LETTERS = "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F";
const MENTION_RE = new RegExp("(^|[^" + LETTERS + "0-9_.])@([" + LETTERS + "][" + LETTERS + "0-9_-]{1,30})", "g");
const OWE_TAGS = ["owe", "owe-them", "waiting-reply", "debo", "les-debo"];
const WAITING_TAGS = ["waiting", "waiting-on", "waiting-for", "blocked", "esperando", "espero"];
const OWE_VERBS = [
  "ask", "send", "reply", "answer", "share",
  "pregunta", "pregúntale", "preguntale", "manda", "mándale", "mandale",
  "envía", "envia", "envíale", "enviale", "contesta", "responde",
];

// Day lists older than this are ignored: unchecked tasks left behind in the
// past are history, not something somebody is still waiting on.
const DAY_LOOKBACK = 30;

function slugify(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function prettyName(display) {
  let s = String(display || "").replace(/[-_]+$/, "");
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mentionsIn(text) {
  if (!text) return [];
  let out = [];
  let seen = new Set();
  let m;
  // Reset lastIndex because the regex is a module-level global.
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text))) {
    let display = m[2].replace(/[-_]+$/, "");
    let slug = slugify(display);
    if (slug.length < 2) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug: slug, display: display });
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
  if (OWE_VERBS.includes(firstWord)) return "they_waiting_on_us";
  return "together";
}

export default {
  // Extracts the @mentions from a single task's text. Each returned entry has
  // `slug` (normalised key) and `display` (as the user typed it).
  mentionsIn: mentionsIn,
  slugify: slugify,
  prettyName: prettyName,

  // Reads every list straight from IndexedDB (see listScanHelper).
  // Resolves { listId: tasks[] }.
  scanAll() {
    return listScanHelper.scanAll();
  },

  // Keeps only the lists whose open tasks still matter: projects that exist
  // and are not archived, and day lists from the last DAY_LOOKBACK days on.
  // Orphan records (deleted projects) are dropped.
  relevantLists(allLists, cTodoListIds) {
    let projects = {};
    (cTodoListIds || []).forEach((l) => {
      projects[l.listId] = l;
    });
    let oldest = moment().subtract(DAY_LOOKBACK, "days").format("YYYYMMDD");
    let out = {};
    Object.keys(allLists || {}).forEach((listId) => {
      if (/^\d{8}$/.test(listId)) {
        if (listId >= oldest) out[listId] = allLists[listId];
      } else if (projects[listId] && !projects[listId].archived) {
        out[listId] = allLists[listId];
      }
    });
    return out;
  },

  // Walks every task in the given lists, returns a map keyed by slug:
  //   { slug: { slug, display, counts: {waiting_on_them, they_waiting_on_us, together},
  //             tasks: [{text, listId, index, listName, bucket, priority, deadline}...] } }
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
              display: prettyName(m.display),
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

  // Two-letter avatar text from a display name (or slug): "Mercedes" -> "Me".
  initialsFor(name) {
    let letters = String(name || "").match(new RegExp("[" + LETTERS + "]", "g")) || [];
    if (!letters.length) return "?";
    return letters[0].toUpperCase() + (letters[1] || "").toLowerCase();
  },
};
