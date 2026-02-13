import { google } from 'googleapis';
import readline from 'node:readline';
import 'dotenv/config';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\nÖffne diesen Link im Browser:\n');
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\nCode von Google hier einfügen: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code.trim());
  console.log('\nREFRESH TOKEN:\n');
  console.log(tokens.refresh_token);
  rl.close();
});
