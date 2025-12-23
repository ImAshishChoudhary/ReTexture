import fs from 'fs';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

let googleClient: OAuth2Client | null = null;
let GOOGLE_CLIENT_ID: string | null = null;

try {
  const credsPath = path.join(__dirname, '../../google-creds.json');
  if (fs.existsSync(credsPath)) {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    googleClient = new OAuth2Client(
      creds.web.client_id,
      creds.web.client_secret,
      process.env.REDIRECT_URI
    );
    GOOGLE_CLIENT_ID = creds.web.client_id;
    console.log('✅ Google OAuth configured (optional)');
  } else {
    console.log('ℹ️  Google OAuth not configured (auth routes disabled)');
  }
} catch (error) {
  console.log('ℹ️  Google OAuth not configured (auth routes disabled)');
}

export { googleClient, GOOGLE_CLIENT_ID };

