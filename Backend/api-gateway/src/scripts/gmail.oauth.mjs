import http from "node:http";
import { google } from "googleapis";
import "dotenv/config";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 5000;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("Fehler: GOOGLE_CLIENT_ID oder GOOGLE_CLIENT_SECRET fehlt in der .env-Datei.");
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Route nicht gefunden.");
      return;
    }

    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`OAuth-Fehler: ${error}`);
      console.error("OAuth-Fehler:", error);
      server.close();
      return;
    }

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Kein Authorization Code gefunden.");
      console.error("Kein Code in der Callback-URL gefunden.");
      server.close();
      return;
    }

    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Authentifizierung erfolgreich. Du kannst dieses Fenster schließen.");

    console.log("\nAuthentifizierung erfolgreich.\n");
    console.log("ACCESS TOKEN:\n", tokens.access_token ?? "Kein Access Token erhalten");
    console.log("\nREFRESH TOKEN:\n", tokens.refresh_token ?? "Kein Refresh Token erhalten");
    console.log("\nALLE TOKENS:\n", JSON.stringify(tokens, null, 2));

    if (!tokens.refresh_token) {
      console.log(
        "\nKein refresh_token erhalten.\n" +
        "Entferne testweise den App-Zugriff im Google-Konto und führe den Flow mit prompt=consent erneut aus."
      );
    }

    server.close();
  } catch (error) {
    console.error("\nFehler beim Token-Austausch:\n", error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Interner Fehler beim Token-Austausch.");
    server.close();
  }
});

server.on("error", (error) => {
  console.error("Fehler beim Starten des lokalen Servers:", error);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("\nÖffne diesen Link im Browser:\n");
  console.log(authUrl);
  console.log(`\nWarte auf Rückgabe von Google auf: ${REDIRECT_URI}\n`);
});