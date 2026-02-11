import readline from "node:readline";
import { google } from "googleapis";

const GOOGLE_CLIENT_ID = "546392092664-7mtijf29thd5lln9rf4dnpkd2s43g402.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

const REDIRECT_URI = "http://localhost:3000/oauth2callback";

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

const oauth2 = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("\n1) Öffne diesen Link im Browser:\n");
console.log(authUrl);
console.log("\n2) Nach dem Login landest du auf einer localhost-Seite (die lädt nicht – ist egal).");
console.log("   Kopiere dann aus der URL den Parameter ?code=....\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("3) Code hier einfügen: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2.getToken(code.trim());
    console.log("\n✅ REFRESH TOKEN:\n", tokens.refresh_token);
    console.log("\n✅ ACCESS TOKEN:\n", tokens.access_token);

    if (!tokens.refresh_token) {
      console.log(
        "\n⚠️ Kein refresh_token erhalten.\n" +
        "→ Entferne im Google Account den Zugriff der App (Security → Third-party access) und versuche es nochmal.\n"
      );
    }
  } catch (e) {
    console.error("\n❌ Fehler:", e?.message ?? e);
  }
});
