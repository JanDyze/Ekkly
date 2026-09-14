// The church's records as a Model Context Protocol server.
//
//   POST /api/mcp                Authorization: Bearer <MCP_TOKEN>
//   POST /api/mcp/<MCP_TOKEN>    the same thing, for clients that can only be
//                                given a URL
//
// Streamable HTTP, stateless: one POST carries one JSON-RPC message and the
// answer comes straight back as JSON. No SSE stream is offered, which the
// specification allows and which is the only honest thing to do on a platform
// where the next request may land on a different machine. lib/mcp/server.js
// holds the protocol; this file is the door.
//
// ------------------------------------------------------------------ access
//
// This endpoint reads with the Admin SDK, which means Firestore's rules do not
// apply to it: everything a church has recorded is behind this URL. Each church
// has its own token, issued by one of its administrators under Settings, and
// the token is what decides which church a conversation sees — that church, and
// never any other (lib/mcpTokens.js, lib/mcp/church.js). It fails closed: an
// absent or unknown token is a refusal, never an open door.
//
// The token may travel in the path because Claude's custom connectors take a
// URL and nothing else. That is a real trade-off: a URL is written into more
// logs and more histories than a header is, and anyone holding it holds the
// whole congregation's records. Prefer the header where the client supports
// one, treat the URL as the credential it is, and issue a new token from
// Settings if it is ever pasted somewhere it should not be — that retires the
// old one.
import { respondToBody, SERVER_INFO, ERRORS } from "../lib/mcp/server.js";
import { runInChurch } from "../lib/mcp/church.js";
import { grantFor } from "../lib/mcpTokens.js";
import { loadChurch } from "../lib/tenant.js";

/**
 * The credential, from wherever the client could put it: the standard header,
 * a query parameter, or the last segment of the path.
 */
const presentedToken = (req) => {
  const header = req.headers?.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();

  // originalUrl, because connect strips the mounted prefix off req.url and the
  // Vite dev server mounts this handler at /api/mcp. On Vercel there is no
  // prefix to strip and only req.url exists.
  const url = new URL(req.originalUrl || req.url || "/api/mcp", "http://localhost");
  const key = url.searchParams.get("key");
  if (key) return key;

  const tail = url.pathname.replace(/\/+$/, "").split("/").pop();
  return tail && tail !== "mcp" ? decodeURIComponent(tail) : "";
};

/**
 * Vercel parses a JSON body for us; the Vite dev middleware does too. Neither
 * is guaranteed, and a body that arrived as a string would otherwise be
 * dispatched as a JSON-RPC message with no method at all.
 */
const readBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : null;
};

const send = (res, status, payload, headers = {}) => {
  res.statusCode = status;
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.setHeader("Content-Type", "application/json");
  // Nothing here may sit in a cache: the answer depends on the token, and the
  // records change while the conversation is happening.
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
};

const cors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID"
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id, MCP-Protocol-Version");
  res.setHeader("Access-Control-Max-Age", "86400");
};

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  // Which church the token opens, if any, and whether its administrator allowed
  // writing when they issued it. A closed church opens nothing.
  let grant = null;
  try {
    grant = await grantFor(presentedToken(req));
    if (grant && !(await loadChurch(grant.churchId))) grant = null;
  } catch (error) {
    console.error("Could not check the MCP token:", error);
    return send(res, 503, {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: ERRORS.INTERNAL,
        message: "This MCP server is not configured. Set FIREBASE_SERVICE_ACCOUNT in the deployment.",
      },
    });
  }
  const authorised = Boolean(grant);

  if (req.method === "GET") {
    // A client opening the server-to-client stream is told there isn't one, as
    // the specification requires. A person pasting the URL into a browser gets
    // something readable instead — which is why the two cases are separated.
    if (String(req.headers.accept || "").includes("text/event-stream")) {
      res.statusCode = 405;
      res.setHeader("Allow", "POST, OPTIONS");
      return res.end();
    }
    return send(res, 200, {
      server: SERVER_INFO,
      transport: "streamable-http",
      endpoint: "POST this URL with a JSON-RPC 2.0 message",
      authorised,
      church: grant?.churchId || null,
      writesEnabled: Boolean(grant?.allowWrites),
    });
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST, GET, OPTIONS");
    return res.end();
  }

  // 403 rather than 401 on purpose: a 401 is the specification's signal to go
  // and start an OAuth flow, and there is no authorisation server here to find.
  // A client that guessed wrong should be told plainly, not sent looking.
  if (!authorised) {
    return send(res, 403, {
      jsonrpc: "2.0",
      id: null,
      error: { code: ERRORS.INVALID_REQUEST, message: "Bad or missing MCP token." },
    });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, {
      jsonrpc: "2.0",
      id: null,
      error: { code: ERRORS.PARSE, message: "Body is not valid JSON" },
    });
  }

  // Every tool this message reaches reads and writes inside the token's church.
  const reply = await runInChurch(grant.churchId, () =>
    respondToBody(body, { allowWrites: grant.allowWrites })
  );

  // Every message in the body was a notification. There is nothing to answer
  // with, and the specification says to say so with a bare 202.
  if (reply === null) {
    res.statusCode = 202;
    return res.end();
  }

  return send(res, 200, reply);
}
