#!/usr/bin/env node
/** Reports what the ClipFlow server can actually do on this machine. */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binDir = path.join(root, 'server', 'bin');
const isWindows = process.platform === 'win32';

async function probe(name, versionFlag) {
  const candidates = [
    path.join(binDir, isWindows ? `${name}.exe` : name),
    name,
  ];
  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && !fs.existsSync(candidate)) continue;
    try {
      const { stdout } = await run(candidate, [versionFlag], { timeout: 15_000, windowsHide: true });
      return { found: true, where: candidate, version: stdout.split('\n')[0]?.trim() };
    } catch {
      /* try the next candidate */
    }
  }
  return { found: false };
}

const results = {
  'yt-dlp': await probe('yt-dlp', '--version'),
  ffmpeg: await probe('ffmpeg', '-version'),
  ffprobe: await probe('ffprobe', '-version'),
};

process.stdout.write('ClipFlow doctor\n\n');
for (const [name, result] of Object.entries(results)) {
  const status = result.found ? 'OK  ' : 'MISS';
  process.stdout.write(`${status} ${name.padEnd(8)} ${result.found ? `${result.version}  (${result.where})` : 'not found'}\n`);
}

process.stdout.write('\nWhat this means:\n');
if (!results['yt-dlp'].found) {
  process.stdout.write('  - Analysis will return TOOLS_UNAVAILABLE. Run: npm run setup:tools\n');
  process.stdout.write('  - For UI work without any tooling, set MEDIA_PROVIDER=mock in server/.env\n');
} else if (!results.ffmpeg.found) {
  process.stdout.write('  - Only pre-muxed formats are offered; audio conversion is disabled.\n');
  process.stdout.write('  - Add FFmpeg with: npm run setup:tools -- --ffmpeg\n');
} else {
  process.stdout.write('  - Full capability: merged video qualities and audio conversion are available.\n');
}
