import { readFileSync } from 'fs';
import https from 'https';

const config = JSON.parse(readFileSync(
  process.env.HOME + '/.config/configstore/firebase-tools.json', 'utf8'
));
const refreshToken = config.tokens.refresh_token;

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8zyaBWTmm',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data).access_token));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function restCall(token, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'firestore.googleapis.com', path, method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => {
        console.log('HTTP status:', res.statusCode);
        resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const token = await getAccessToken();
console.log('Token:', token ? 'obtained' : 'FAILED');

// Check what the API actually returns
const result = await restCall(token, '/v1/projects/zyppiride-2025/databases/(default)/documents/users?pageSize=5');
console.log('Raw response keys:', Object.keys(result));
console.log('Full response:', JSON.stringify(result).slice(0, 500));
process.exit(0);
