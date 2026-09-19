// Vercel serverless function: an account's Claude connector link.
//
//   GET    /api/mcp-token                    -> { mine, links, isAdmin }
//   POST   /api/mcp-token { allowWrites }    -> { token, url }   (replaces your own)
//   DELETE /api/mcp-token                    -> { revoked }      (your own)
//   DELETE /api/mcp-token?id=<hash>          -> { revoked }      (administrators)
//
// A link belongs to the account that made it, not to the church, so making one
// never switches off anybody else's. You may always make and revoke your own;
// an administrator additionally sees every link in the church and can switch
// one off — somebody who has left, or a link that went astray.
//
// The token is returned once, on POST, and never again: only its hash is kept
// (lib/mcpTokens.js). Losing it means issuing a new one, which also retires the
// one before it.
import { describeToken, issueToken, listTokens, revokeToken, revokeTokensFor } from "../lib/mcpTokens.js";
import { requireChurchUser } from "../lib/tenant.js";

export default async function handler(req, res) {
  // A credential to the records the account can reach: the app's own origin only.
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const caller = await requireChurchUser(req);
    if (caller.error) return res.status(caller.status).json({ error: caller.error });
    const churchId = caller.church.id;

    // Administrators see the whole list. Everybody else sees their own link and
    // is told nothing about anyone else's.
    const isAdmin = (await caller.church.ref.collection("appAdmins").doc(caller.uid).get()).exists;

    if (req.method === "GET") {
      return res.status(200).json({
        isAdmin,
        mine: await describeToken(churchId, caller.uid),
        links: isAdmin ? await listTokens(churchId) : [],
      });
    }

    if (req.method === "DELETE") {
      // An id names somebody else's link, which only an administrator may
      // switch off. Without one, this is the caller taking back their own.
      // originalUrl, because the Vite dev middleware strips the mounted prefix.
      const id = new URL(req.originalUrl || req.url || "", "http://localhost").searchParams.get("id");
      if (id) {
        if (!isAdmin) return res.status(403).json({ error: "Administrators only" });
        return res.status(200).json({ revoked: await revokeToken(churchId, id) });
      }
      return res.status(200).json({ revoked: await revokeTokensFor(churchId, caller.uid) });
    }

    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch {
        body = {};
      }
    }

    const token = await issueToken(churchId, {
      uid: caller.uid,
      allowWrites: body.allowWrites === true,
      owner: { email: caller.email, displayName: caller.displayName },
    });

    // The address the connector is added with. The request's own host is the
    // church's address, whichever of its domains the caller is on.
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const protocol = /(^|\.)localhost(:\d+)?$/.test(String(host || "")) ? "http" : "https";
    return res.status(200).json({ token, url: `${protocol}://${host}/api/mcp/${token}` });
  } catch (error) {
    console.error("Error managing the MCP token:", error);
    return res.status(500).json({ error: error.message || "Could not manage the connector link" });
  }
}
