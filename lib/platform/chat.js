// The chat bubble on the platform's front door: whether the person who runs
// Ekkly is around right now, and the conversations visitors start with them.
//
//   frontDoorPresence/host   when the host was last seen signed in anywhere in
//                            Ekkly. Nobody but the server reads it.
//   frontDoorChats/{id}      one visitor's conversation, messages and all.
//
// Everything goes through /api/platform, so the Firestore rules stay shut on
// both collections. A visitor has not signed in and may never, so the visitor's
// side is written to be safe in the open, like frontDoor.js: short fields, a
// cap on how much one conversation can hold and how fast it can grow, and a
// thread that only answers to the secret its visitor was handed when it began.
//
// Who the host is comes from the console (Name & front door → chat):
// `hostEmail`. Being signed in as that address, with Ekkly open in a tab, is
// what "online" means; the page beats every minute while it is visible.
import crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { isMailConfigured, isValidEmail, sendTo } from "../mailer.js";
import { withBrandingDefaults } from "../platformDefaults.js";
import { getPlatformPublic } from "./config.js";
import { Refusal, clip, iso, logEntry, logRef } from "./common.js";

const presenceRef = () => db().collection("frontDoorPresence").doc("host");
const threadsRef = () => db().collection("frontDoorChats");

// A beat a minute, so two missed beats — a laptop lid closed, a tab asleep —
// and the bubble says away.
const ONLINE_MS = 150 * 1000;

// Enough for a real conversation, too little to be a place to dump text.
const MAX_TEXT = 1000;
const MAX_MESSAGES = 200;
// A visitor typing quickly is fine; a script is not.
const BURST_WINDOW_MS = 10 * 60 * 1000;
const BURST_LIMIT = 12;
// A message left while the host is away is emailed, but a visitor sending
// five in a row is one email, not five.
const EMAIL_GAP_MS = 15 * 60 * 1000;

const chatSettings = async () => withBrandingDefaults((await getPlatformPublic()).branding).chat;

const hash = (secret) => crypto.createHash("sha256").update(String(secret)).digest("hex");

/* ------------------------------------------------------------- presence */

// Every visitor with the bubble on the page asks about once a minute. A few
// seconds of staleness is invisible, and saves a read per question.
let presenceCache = { at: 0, lastSeen: 0 };

const lastSeen = async () => {
  if (Date.now() - presenceCache.at < 15 * 1000) return presenceCache.lastSeen;
  const snapshot = await presenceRef().get();
  const seen = snapshot.exists ? snapshot.get("lastSeen")?.toMillis?.() || 0 : 0;
  presenceCache = { at: Date.now(), lastSeen: seen };
  return seen;
};

const isOnline = async () => Date.now() - (await lastSeen()) < ONLINE_MS;

/**
 * A beat from a signed-in platform administrator's open tab. Only the host's
 * counts; anyone else's is quietly ignored, so every admin's app can call it
 * without knowing who the host is. Not logged: it is a heartbeat, not a change.
 */
export async function presenceBeat(admin) {
  const chat = await chatSettings();
  if (!chat.enabled || String(admin.email || "").toLowerCase() !== chat.hostEmail) return { host: false };
  await presenceRef().set({ lastSeen: FieldValue.serverTimestamp() }, { merge: true });
  presenceCache = { at: Date.now(), lastSeen: Date.now() };
  return { host: true };
}

/* -------------------------------------------------------------- threads */

const shapeMessage = (m) => ({
  from: m.from === "host" ? "host" : "visitor",
  text: m.text || "",
  at: iso(m.at),
});

const openThread = async (threadId, secret) => {
  const id = clip(threadId, 60);
  if (!/^[A-Za-z0-9]{10,60}$/.test(id) || !secret) throw new Refusal(404, "That conversation has ended.");
  const ref = threadsRef().doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.get("secretHash") !== hash(secret)) {
    throw new Refusal(404, "That conversation has ended.");
  }
  return { ref, snapshot };
};

/**
 * What the bubble asks every so often: whether the host is online, and, for a
 * visitor who has a conversation, its messages.
 *
 * { threadId?, secret? } -> { online, messages?, seen?, name?, email? }
 *
 * `seen` is true once the host has opened the conversation since the
 * visitor's last message.
 */
export async function chatPoll({ threadId, secret } = {}) {
  const chat = await chatSettings();
  if (!chat.enabled) return { enabled: false, online: false };
  const online = await isOnline();
  if (!threadId) return { enabled: true, online };

  try {
    const { ref, snapshot } = await openThread(threadId, secret);
    const messages = (snapshot.get("messages") || []).map(shapeMessage);
    // Only when it has been a while, so an open bubble polling every few
    // seconds is not a write every few seconds.
    const seen = snapshot.get("visitorSeenAt")?.toMillis?.() || 0;
    if (Date.now() - seen > 60 * 1000) await ref.update({ visitorSeenAt: FieldValue.serverTimestamp() });
    return {
      enabled: true,
      online,
      messages,
      seen: (snapshot.get("unread") || 0) === 0,
      name: snapshot.get("name") || "",
      email: snapshot.get("email") || "",
    };
  } catch (error) {
    if (error instanceof Refusal) return { enabled: true, online, ended: true };
    throw error;
  }
}

const emailHost = async (chat, { name, email, text, page }) => {
  if (!isMailConfigured() || !isValidEmail(chat.hostEmail)) return;
  const root = process.env.VITE_ROOT_DOMAIN || "";
  const link = root ? `https://${root}/platform?section=chat` : "";
  const who = email ? `${name} (${email})` : name;
  const body = [`${who} left a message on the front door:`, text, page && `From ${page}`, link && `Reply: ${link}`]
    .filter(Boolean)
    .join("\n\n");
  try {
    await sendTo({
      to: chat.hostEmail,
      subject: `New message from ${name}`,
      text: body,
      html: `<p>${escapeHtml(who)} left a message on the front door:</p><blockquote style="border-left:3px solid #ccc;margin:0;padding:4px 12px;white-space:pre-line">${escapeHtml(text)}</blockquote>${link ? `<p><a href="${link}">Reply in the console</a></p>` : ""}`,
      churchName: "Ekkly chat",
    });
  } catch (error) {
    // The message is saved either way; the email is only a nudge.
    console.error("Could not email the host about a chat message:", error);
  }
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * A visitor's message. Starts a conversation when there is none, and then
 * hands back the secret that is the only way to read it again.
 *
 * { threadId?, secret?, name?, email?, text, page?, website? }
 *   -> { threadId, secret?, messages }
 *
 * A name is not needed to start: asking for one before the first message
 * turned people away. The bubble asks afterwards (chatIdentify).
 *
 * `website` is a field no person can see. Anything in it is a bot, which is
 * told it worked and nothing is kept.
 */
export async function chatSend({ threadId, secret, name, email, text, page, website } = {}) {
  const chat = await chatSettings();
  if (!chat.enabled) throw new Refusal(403, "Chat is switched off right now.");

  const message = clip(text, MAX_TEXT);
  if (!message) throw new Refusal(400, "Type a message first.");
  if (clip(website, 200)) return { threadId: "", messages: [] };

  const now = Timestamp.now();
  const entry = { from: "visitor", text: message, at: now };
  const online = await isOnline();

  // A new conversation.
  if (!threadId) {
    const visitorName = clip(name, 60) || "Visitor";
    const visitorEmail = clip(email, 120).toLowerCase();
    if (visitorEmail && !isValidEmail(visitorEmail)) throw new Refusal(400, "That email address does not look right.");

    const ref = threadsRef().doc();
    const newSecret = crypto.randomBytes(24).toString("hex");
    const fields = {
      name: visitorName,
      email: visitorEmail,
      page: clip(page, 200),
      secretHash: hash(newSecret),
      messages: [entry],
      lastText: message.slice(0, 140),
      lastFrom: "visitor",
      unread: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      visitorSeenAt: FieldValue.serverTimestamp(),
    };
    if (!online) fields.emailedAt = FieldValue.serverTimestamp();
    await ref.set(fields);
    if (!online) await emailHost(chat, { name: visitorName, email: visitorEmail, text: message, page: fields.page });
    return { threadId: ref.id, secret: newSecret, messages: [shapeMessage(entry)] };
  }

  // A reply in a conversation that already exists.
  const { ref } = await openThread(threadId, secret);
  let emailFor = null;
  const messages = await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const list = snapshot.get("messages") || [];
    if (list.length >= MAX_MESSAGES) throw new Refusal(429, "This conversation is full. Please email us instead.");
    const recent = list.filter((m) => m.from === "visitor" && now.toMillis() - (m.at?.toMillis?.() || 0) < BURST_WINDOW_MS);
    if (recent.length >= BURST_LIMIT) throw new Refusal(429, "That is a lot of messages at once. Please wait a few minutes.");

    const updates = {
      messages: [...list, entry],
      lastText: message.slice(0, 140),
      lastFrom: "visitor",
      unread: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      visitorSeenAt: FieldValue.serverTimestamp(),
    };
    const emailed = snapshot.get("emailedAt")?.toMillis?.() || 0;
    if (!online && now.toMillis() - emailed > EMAIL_GAP_MS) {
      updates.emailedAt = FieldValue.serverTimestamp();
      emailFor = { name: snapshot.get("name") || "A visitor", email: snapshot.get("email") || "", page: snapshot.get("page") || "" };
    }
    tx.update(ref, updates);
    return [...list, entry].map(shapeMessage);
  });
  if (emailFor) await emailHost(chat, { ...emailFor, text: message });
  return { threadId: ref.id, messages };
}

/**
 * A visitor saying who they are and where to reply, after they have started.
 *
 * { threadId, secret, name?, email? } -> { name, email }
 */
export async function chatIdentify({ threadId, secret, name, email } = {}) {
  const { ref, snapshot } = await openThread(threadId, secret);
  const visitorName = clip(name, 60) || snapshot.get("name") || "Visitor";
  const visitorEmail = clip(email, 120).toLowerCase();
  if (visitorEmail && !isValidEmail(visitorEmail)) throw new Refusal(400, "That email address does not look right.");
  await ref.update({ name: visitorName, email: visitorEmail, updatedAt: FieldValue.serverTimestamp() });
  return { name: visitorName, email: visitorEmail };
}

/* -------------------------------------------------------------- console */

const shapeThread = (d) => ({
  id: d.id,
  name: d.get("name") || "",
  email: d.get("email") || "",
  page: d.get("page") || "",
  lastText: d.get("lastText") || "",
  lastFrom: d.get("lastFrom") || "visitor",
  unread: d.get("unread") || 0,
  // A visitor who has had the bubble open in the last couple of minutes is
  // still there to read a reply as it arrives.
  visitorHere: Date.now() - (d.get("visitorSeenAt")?.toMillis?.() || 0) < ONLINE_MS,
  createdAt: iso(d.get("createdAt")),
  updatedAt: iso(d.get("updatedAt")),
});

/** Every conversation, the latest first. */
export async function listChats() {
  const snapshot = await threadsRef().orderBy("updatedAt", "desc").limit(100).get();
  return snapshot.docs.map(shapeThread);
}

/** One conversation with its messages. Opening it marks it read. */
export async function readChat(_admin, { id }) {
  const ref = threadsRef().doc(clip(id, 60));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Refusal(404, "That conversation no longer exists.");
  if (snapshot.get("unread")) await ref.update({ unread: 0 });
  return { ...shapeThread(snapshot), unread: 0, messages: (snapshot.get("messages") || []).map(shapeMessage) };
}

/** The host's answer. The visitor's bubble picks it up on its next poll. */
export async function replyChat(admin, { id, text }) {
  const message = clip(text, MAX_TEXT);
  if (!message) throw new Refusal(400, "Type a reply first.");
  const ref = threadsRef().doc(clip(id, 60));

  await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new Refusal(404, "That conversation no longer exists.");
    const list = snapshot.get("messages") || [];
    if (list.length >= MAX_MESSAGES) throw new Refusal(429, "This conversation is full. Email them instead.");
    tx.update(ref, {
      messages: [...list, { from: "host", text: message, at: Timestamp.now(), by: admin.email || "" }],
      lastText: message.slice(0, 140),
      lastFrom: "host",
      unread: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(logRef(), logEntry(admin, "chat.reply", { target: ref.id, label: `Replied to ${snapshot.get("name") || "a visitor"} in chat` }));
  });

  // Replying is being here.
  await presenceBeat(admin);
  return readChat(admin, { id: ref.id });
}
