import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = resolve(__dirname, '../public/firebase-messaging-sw.template.js');
const targetPath = resolve(__dirname, '../public/firebase-messaging-sw.js');

const replacements = {
  VITE_FCM_API_KEY: process.env.VITE_FCM_API_KEY || '',
  VITE_FCM_PROJECT_ID: process.env.VITE_FCM_PROJECT_ID || '',
  VITE_FCM_APP_ID: process.env.VITE_FCM_APP_ID || '',
  VITE_FCM_SENDER_ID: process.env.VITE_FCM_SENDER_ID || '',
  VITE_FCM_VAPID_KEY: process.env.VITE_FCM_VAPID_KEY || '',
};

let content = readFileSync(templatePath, 'utf-8');
for (const [key, value] of Object.entries(replacements)) {
  content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
}

writeFileSync(targetPath, content);
