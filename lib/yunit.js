// YUNIT, the assistant inside the app: what he may reach, how a conversation
// with him runs, and how a change he proposed is carried out once confirmed.
//
// He works the church's records through the same tools as the Claude
// connector (lib/mcp/tools.js), plus what only he offers: the deletes
// (lib/mcp/deletes.js), reads of every other record the church keeps
// (lib/mcp/records.js), and changes to them and to the church's own details
// (lib/mcp/changes.js). How far he reaches for a given person is
// YUNIT_ACCESS, below. Whatever it is, he keeps to the apps the church has,
// and every write is signed with the person's name and written to the audit
// log.
//
// Reading he does on his own, as often as the question needs. Changing he
// never does on his own. When he decides something should be added, changed
// or removed, the call is not run: it comes back to the page as a card saying
// what will happen, and runs only when the person presses Confirm (`perform`).
// So a misunderstood request costs a tap on Cancel, not a wrong record.
//
// He answers by calling `present`: a sentence or two, then cards — records
// to open, changes to confirm — and a few things the person might say next.
// A wall of text is the thing a phone screen is worst at; cards are what it
// is best at.
import Anthropic from "@anthropic-ai/sdk";
import { enabledTools } from "./mcp/tools.js";
import { DELETE_TOOLS, DELETE_AREAS } from "./mcp/deletes.js";
import { recordTools } from "./mcp/records.js";
import { changeTools } from "./mcp/changes.js";
import { runInChurch, MCP_ACTOR_ID } from "./mcp/church.js";
import { auditToolWrite } from "./audit.js";
import { accessFor } from "./audience.js";
import { enabledAppsFrom } from "./apps.js";

const MOODS = ["plain", "happy", "celebrate", "confused", "sorry"];
const ICONS = ["person", "event", "task", "song", "prayer", "group", "money", "minute", "attendance", "church", "info"];

// The pages a card may open. A link the model makes up that is not one of
// these is dropped rather than sent somewhere that 404s.
const LINKS = [
  /^\/members(\/[\w-]+)?$/,
  /^\/events(\/calendar(\/\d{4}-\d{2})?)?(\?date=\d{4}-\d{2}-\d{2})?$/,
  /^\/tasks(\/(mine|all|ministries|done))?$/,
  /^\/prayer-concerns(\/(now|ongoing|answered|all))?(\?open=[\w-]+)?$/,
  /^\/songs(\/[\w-]+)?$/,
  /^\/small-groups(\/[\w-]+)?$/,
  /^\/minutes(\/[\w-]+)?$/,
  /^\/gallery(\/[\w-]+)?$/,
  /^\/attendance$/,
  /^\/finances$/,
  /^\/schedules$/,
  // A chapter, and the verses to light up in it (Bible.vue reads ?v=).
  /^\/bible(\/[\w-]+\/\d+(\?v=\d+(-\d+)?)?)?$/,
];
const cleanLink = (link) => {
  const value = String(link || "").trim();
  return LINKS.some((pattern) => pattern.test(value)) ? value : "";
};

/* ------------------------------------------------------------- the tools */

// How far YUNIT reaches, whoever is talking to him.
//
//   "everything"  Every record the church keeps, to read and to change, for
//                 anyone signed in to the church: not held to what that person
//                 could open in the app. A change still waits for them to
//                 press Confirm, and still goes in the audit log as theirs.
//   "person"      Only what the person could do by hand in the app: `.view` on
//                 an area to read it, `.manage` to change it. The records
//                 beyond the dedicated tools are read by administrators only.
//
// "everything" for now, by choice: a panel for choosing how much YUNIT may do
// is to come, and when it does it replaces this constant rather than adding a
// second switch beside it.
const YUNIT_ACCESS = "everything";

/**
 * The tools this person has through YUNIT: the connector's tools, writes
 * included, the deletes, and the reads of every other record — within the
 * church's apps, and within this person's own access when YUNIT_ACCESS is
 * "person". Someone not signed in to this church gets nothing either way.
 */
export async function toolsFor(church, uid) {
  const [access, apps] = await Promise.all([
    accessFor(church.ref, uid),
    church.ref.collection("subscription").doc("apps").get().then((snap) => enabledAppsFrom(snap.exists ? snap.data() : null)),
  ]);
  if (!access) return [];
  // null asks no one: every capability.
  const capabilities = YUNIT_ACCESS === "everything" ? null : access.capabilities;
  const deletes = DELETE_TOOLS.filter((tool) => {
    const area = DELETE_AREAS[tool.name];
    return (!apps || apps.has(area)) && (!capabilities || capabilities.has(`${area}.manage`));
  });
  // Every other record, to read and to change (records.js, changes.js): for
  // everyone while YUNIT_ACCESS is "everything", for administrators only
  // otherwise, since these answer to no one area's capability.
  const everything = YUNIT_ACCESS === "everything" || access.isAdmin;
  const records = everything ? [...recordTools(apps), ...changeTools(apps)] : [];
  return [...enabledTools(true, apps, capabilities), ...deletes, ...records];
}

// A write is offered to the model with one extra argument: the sentence the
// person will read on the card before confirming. It is taken off again
// before the tool runs.
const withSummary = (input) => ({
  ...input,
  properties: {
    ...input.properties,
    summary: {
      type: "string",
      description: "What this will do, in one short plain sentence the person reads before confirming, e.g. \"Add Ana Reyes to the roll as a member.\"",
    },
  },
  required: [...(input.required || []), "summary"],
});

const PRESENT = {
  name: "present",
  description:
    "Give your answer. Always finish by calling this exactly once — it is the only thing the person sees. Keep `message` to one or two short sentences and put the substance in `cards`.",
  input_schema: {
    type: "object",
    properties: {
      mood: { type: "string", enum: MOODS, description: "The face you make: plain for most answers, happy when you have helped or been thanked, celebrate for good news, confused when you need more, sorry when you cannot." },
      message: { type: "string", description: "One or two short sentences. No lists here." },
      cards: {
        type: "array",
        maxItems: 8,
        description: "The records or facts the answer is about, one card each: a person, an event, a task, a total. Empty when there is nothing to show.",
        items: {
          type: "object",
          properties: {
            icon: { type: "string", enum: ICONS, description: "What the card is about. The page shows a person's own photo, the church's logo, or the picture of the app a record lives in, so pick the kind that fits." },
            title: { type: "string", description: "For a person, their full name as on the roll." },
            subtitle: { type: "string", description: "A few words under the title." },
            details: {
              type: "array",
              maxItems: 4,
              items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] },
            },
            link: { type: "string", description: "The page to open it on. A person always links to /members/<id>, which is also how their photo is found. Others e.g. /events/calendar?date=YYYY-MM-DD, /tasks, /songs/<id>, /small-groups/<id>, /minutes/<id>, /prayer-concerns, /finances, /attendance, /gallery/<id>, /bible/<book>/<chapter>?v=<verse or verse-verse> (opens the passage with those verses lit)." },
          },
          required: ["title"],
        },
      },
      suggestions: {
        type: "array",
        maxItems: 3,
        items: { type: "string" },
        description: "Up to three short things the person might say next, written as they would say them.",
      },
    },
    required: ["mood", "message"],
  },
};

const instructions = ({ churchName, personName, today }) => `You are YUNIT — "Yet another Useful Intelligence Tool" — the assistant inside Ekkly, the app ${churchName || "this church"} uses to run its life together. You are talking with ${personName || "someone from the church"}. Today is ${today}.

You can look things up in the church's records with your tools, and you can add, change and remove records too — but only by proposing it. When you call a tool that changes something, it does NOT run: the person sees a card describing it and confirms or cancels it themselves. So:
- Look things up first (find the person's or record's id) before proposing a change to it.
- Propose each change with its own call, with a clear one-sentence summary.
- Never say a change is done. Say you have set it up for them to confirm.
- Prefer the gentler change: tick a task done or mark a prayer answered rather than delete it, unless they asked to delete.

How to answer:
- Always finish by calling present. Its message is one or two short sentences, warm and plain — the person is usually on a phone. Put people, events, tasks, songs and figures in cards, one each, with a link where there is a page for it. Offer up to three suggestions of what they might say next.
- Answer in the language they write in (English, Tagalog or Taglish).
- You may also help them write or plan — an announcement, a prayer, a lesson outline. Put a draft like that in the message only when it is short; otherwise in a card's details.
- Never invent a name, date, amount or fact about this church. If a tool cannot tell you, say so.
- Reach for the dedicated tools first. For anything they do not cover — a line in the books, follow-up notes, sermons, service plans, links, the gallery, who has an account, the audit log, the church's plan — call list_collections to see what the church keeps, then list_records and get_record. Look before saying you cannot find something.
- You can change anything the church keeps, too. The church's own details — its names, address, phone, mission and the rest — with update_church_profile. Anything no other tool changes with update_record, add_record or delete_record: look at the record first (get_record) and write fields in the shape already stored there. Never tell someone you cannot change something the church keeps; propose the change. Only billing, who may do what, and the logs are closed, and there say so plainly.
- A tool missing from your list is one this person cannot use, or an app the church does not have. Say so kindly rather than guessing.
- On Scripture, quote accurately or not at all, and give the reference.
- You are a tool for the church's records and busywork, never a replacement for anyone's ministry. Keep the lists, find the facts, draft the words; the pastor still shepherds, the people still pray and decide. When someone brings you a burden rather than a task, answer kindly and point them to their pastor or their small group leader, by name where the records say who that is.`;

/* ----------------------------------------------------------- the conversation */

const RESULT_LIMIT = 24000;
const MAX_STEPS = 8;

/**
 * One turn of the conversation. Calls `onEvent` with what he is doing
 * ({ type: 'phase', phase, label }) and resolves to the answer:
 * { mood, message, cards, actions, suggestions }.
 */
export async function converse({ church, caller, model, messages, today, onEvent }) {
  const tools = await toolsFor(church, caller.uid);
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const personName = caller.displayName || "";
  const actor = { id: MCP_ACTOR_ID, name: `YUNIT (for ${personName || "a member"})`, uid: caller.uid };

  const offered = [
    ...tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.write ? withSummary(tool.input) : tool.input,
    })),
    PRESENT,
  ];

  const client = new Anthropic();
  const system = instructions({ churchName: String(church.data?.name || "").trim(), personName, today });
  const history = [...messages];
  const actions = [];

  for (let step = 0; step < MAX_STEPS; step += 1) {
    onEvent?.({ type: "phase", phase: "thinking" });
    const response = await client.messages.create({
      model,
      max_tokens: 6000,
      system,
      tools: offered,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      messages: history,
    });

    const calls = response.content.filter((block) => block.type === "tool_use");
    const answer = calls.find((call) => call.name === "present");
    if (answer || !calls.length) {
      const text = response.content.filter((block) => block.type === "text").map((block) => block.text).join("\n").trim();
      const input = answer?.input || {};
      return {
        mood: MOODS.includes(input.mood) ? input.mood : "plain",
        message: String(input.message || text || "").trim(),
        cards: (Array.isArray(input.cards) ? input.cards : []).slice(0, 8).map((card) => ({
          icon: ICONS.includes(card.icon) ? card.icon : "info",
          title: String(card.title || "").slice(0, 120),
          subtitle: String(card.subtitle || "").slice(0, 160),
          details: (Array.isArray(card.details) ? card.details : []).slice(0, 4).map((d) => ({ label: String(d.label || "").slice(0, 40), value: String(d.value || "").slice(0, 400) })),
          link: cleanLink(card.link),
        })),
        actions,
        suggestions: (Array.isArray(input.suggestions) ? input.suggestions : []).slice(0, 3).map((s) => String(s).slice(0, 80)),
      };
    }

    history.push({ role: "assistant", content: response.content });
    const results = [];
    for (const call of calls) {
      const tool = byName.get(call.name);
      if (!tool) {
        results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: `Unknown tool "${call.name}".` });
        continue;
      }
      if (tool.write) {
        // Not run: shown to the person to confirm.
        const { summary, ...args } = call.input || {};
        actions.push({ id: call.id, tool: tool.name, title: tool.title, summary: String(summary || tool.title), args, destructive: Boolean(tool.destructive) });
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: "Shown to the person as a card to confirm. It has NOT happened yet and will only happen if they press Confirm.",
        });
        continue;
      }
      onEvent?.({ type: "phase", phase: "looking", label: tool.title });
      try {
        const missing = (tool.input.required || []).filter((key) => call.input?.[key] === undefined || call.input?.[key] === "");
        if (missing.length) throw new Error(`Missing required argument(s): ${missing.join(", ")}.`);
        const answer = await runInChurch({ churchId: church.id, actor }, () => tool.run(call.input || {}));
        const text = JSON.stringify(answer);
        results.push({ type: "tool_result", tool_use_id: call.id, content: text.length > RESULT_LIMIT ? `${text.slice(0, RESULT_LIMIT)}… (cut short; narrow the search)` : text });
      } catch (error) {
        results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: `Error: ${error?.message || error}` });
      }
    }
    history.push({ role: "user", content: results });
  }

  return { mood: "confused", message: "That took more looking than I could do in one go. Could you ask it a narrower way?", cards: [], actions, suggestions: [] };
}

/* --------------------------------------------------------- carrying it out */

/**
 * Runs one change the person confirmed. Checked again from scratch — the
 * tool must still be one this person may use — because the card came back
 * from the browser and the browser is not to be trusted with what it says.
 */
export async function perform({ church, caller, tool: name, args }) {
  const tools = await toolsFor(church, caller.uid);
  const tool = tools.find((candidate) => candidate.name === name && candidate.write);
  if (!tool) throw Object.assign(new Error("That change is not one you can make here."), { status: 403 });

  const input = { ...(args || {}) };
  delete input.summary;
  const actor = { id: MCP_ACTOR_ID, name: `YUNIT (for ${caller.displayName || "a member"})`, uid: caller.uid };

  return runInChurch({ churchId: church.id, actor }, async () => {
    const result = await tool.run(input);
    try {
      await auditToolWrite({ tool: tool.name, args: input, result, actor: { uid: caller.uid, name: actor.name } });
    } catch (error) {
      console.error("Audit entry for a YUNIT change failed:", error);
    }
    return result;
  });
}
