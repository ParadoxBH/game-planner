import { publish } from 'gh-pages';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cacheDir = path.join(rootDir, 'node_modules', '.cache', 'gh-pages');

console.log('--- Gh-Pages Custom Deployer ---');

// 1. Clear the deployment cache to ensure a fresh starting point.
// This is important on Windows because it prevents gh-pages from trying to 
// remove thousands of cached files individually, which causes ENAMETOOLONG.
if (fs.existsSync(cacheDir)) {
  console.log(`Cleaning project cache at: ${cacheDir}`);
  try {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('Could not clear cache automatically, continuing...');
  }
}

console.log('Starting deployment from "dist" folder...');

// 2. Publish with `add: true`.
// The `add: true` option skips the standard removal step that triggers the error.
// Because we cleared the cache above, the deployment will still be essentially clean.
publish('dist', {
  add: true,
  history: true,
  message: `Updates (${new Date().toISOString()})`
}, (err) => {
  if (err) {
    console.error('Deployment Failed:', err);
    process.exit(1);
  }
  console.log('Successfully Deployed to GitHub Pages!');
});
