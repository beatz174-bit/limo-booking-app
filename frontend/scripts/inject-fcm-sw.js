import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = process.env.ENV || process.env.NODE_ENV || 'development';
loadEnv({ path: resolve(__dirname, `../.env.${env}`) });
const templatePath = resolve(__dirname, '../public/firebase-messaging-sw.template.js');
const targetPath = resolve(__dirname, '../public/firebase-messaging-sw.js');

const replacements = {
  VITE_FCM_API_KEY: process.env.VITE_FCM_API_KEY || '',
  VITE_FCM_PROJECT_ID: process.env.VITE_FCM_PROJECT_ID || '',
  VITE_FCM_APP_ID: process.env.VITE_FCM_APP_ID || '',
  VITE_FCM_SENDER_ID: process.env.VITE_FCM_SENDER_ID || '',
  VITE_FCM_VAPID_KEY: process.env.VITE_FCM_VAPID_KEY || '',
};

console.log('FCM env variables', replacements);

let content = readFileSync(templatePath, 'utf-8');
for (const [key, value] of Object.entries(replacements)) {
  content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
}

writeFileSync(targetPath, content);

if (!existsSync(targetPath)) {
  console.error(`Failed to create ${targetPath}`);
  process.exit(1);
}

const written = readFileSync(targetPath, 'utf-8');
if (/\$\{VITE_FCM_[^}]+\}/.test(written)) {
  console.error(`Unresolved VITE_FCM placeholders remain in ${targetPath}`);
  process.exit(1);
}
