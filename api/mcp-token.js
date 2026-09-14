// Vercel serverless function: a church's Claude connector token.
//
//   GET    /api/mcp-token                    -> { exists, allowWrites, createdAt, createdByEmail }
//   POST   /api/mcp-token { allowWrites }    -> { token, url }   (replaces any existing token)
//   DELETE /api/mcp-token                    -> { revoked }
//
// Administrators of the church only. The token is returned once, on POST, and
// never again: only its hash is kept (lib/mcpTokens.js). Losing it means issuing
// a new one, which also retires the old.
import { describeToken, issueToken, revokeTokens } from "../lib/mcpTokens.js";
import { requireChurchAdmin } from "../lib/tenant.js";

export default async function handler(req, res) {
  // A credential to every record the church keeps: the app's own origin only.
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");

  try {
    const admin = await requireChurchAdmin(req);
    if (admin.error) return res.status(admin.status).json({ error: admin.error });
    const churchId = admin.church.id;

    if (req.method === "GET") {
      return res.status(200).json(await describeToken(churchId));
    }

    if (req.method === "DELETE") {
      return res.status(200).json({ revoked: await revokeTokens(churchId) });
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
      allowWrites: body.allowWrites === true,
      createdBy: { uid: admin.uid, email: admin.email },
    });

    // The address the connector is added with. The request's own host is the
    // church's address, whichever of its domains the administrator is on.
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const protocol = /(^|\.)localhost(:\d+)?$/.test(String(host || "")) ? "http" : "https";
    return res.status(200).json({ token, url: `${protocol}://${host}/api/mcp/${token}` });
  } catch (error) {
    console.error("Error managing the MCP token:", error);
    return res.status(500).json({ error: error.message || "Could not manage the connector token" });
  }
}
