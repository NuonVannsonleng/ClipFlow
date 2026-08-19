#!/usr/bin/env node
/**
 * Installs the media tooling ClipFlow needs into `server/bin`, which is
 * gitignored and can be deleted at any time.
 *
 *   node scripts/setup-tools.mjs            # yt-dlp only
 *   node scripts/setup-tools.mjs --ffmpeg   # yt-dlp + FFmpeg (Windows build)
 *   node scripts/setup-tools.mjs --update   # refresh yt-dlp already installed
 *
 * yt-dlp tracks its nightly channel. Platforms change their extraction
 * requirements constantly and nightly carries those fixes days to weeks ahead
 * of stable, which is the difference between a link working and returning
 * PLATFORM_RESTRICTED.
 *
 * Nothing is installed system-wide, and the server also honours YTDLP_PATH /
 * FFMPEG_PATH if you would rather point at copies you already have.
 */

import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binDir = path.join(root, 'server', 'bin');
const wantFfmpeg = process.argv.includes('--ffmpeg');
const wantUpdate = process.argv.includes('--update');

const YTDLP_ASSETS = {
  win32: 'yt-dlp.exe',
  darwin: 'yt-dlp_macos',
  linux: 'yt-dlp_linux',
};

// Tried in order: the GitHub mirror is usually the more reachable of the two.
const FFMPEG_WINDOWS_ZIPS = [
  'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip',
  'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
];

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function download(url, destination, redirects = 0) {
  if (redirects > 5) throw new Error('too many redirects');
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`download failed (${response.status}) for ${url}`);
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await pipeline(response.body, createWriteStream(destination));
}

async function installYtDlp() {
  const asset = YTDLP_ASSETS[process.platform];
  if (!asset) {
    log(`! No prebuilt yt-dlp for ${process.platform}. Install it yourself and set YTDLP_PATH.`);
    return false;
  }

  const target = path.join(binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  if (await exists(target)) {
    if (!wantUpdate) {
      log(`= yt-dlp already present at ${target}`);
      log('  (run with --update to pull the latest nightly)');
      return true;
    }
    log('> updating yt-dlp');
    await updateChannel(target);
    return true;
  }

  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
  log(`> downloading yt-dlp from ${url}`);
  await download(url, target);
  if (process.platform !== 'win32') await fs.chmod(target, 0o755);

  await updateChannel(target);
  log(`+ yt-dlp installed at ${target}`);
  return true;
}

/** Points the binary at the nightly channel and pulls the newest build. */
async function updateChannel(target) {
  try {
    const { stdout } = await run(target, ['--update-to', 'nightly'], { timeout: 120_000 });
    const last = stdout.trim().split(/[\r\n]+/).pop();
    log(`  ${last}`);
  } catch (error) {
    log(`! could not switch to nightly: ${error.message}`);
  }
  const { stdout } = await run(target, ['--version'], { timeout: 30_000 });
  log(`  yt-dlp ${stdout.trim()}`);
}

async function installFfmpegWindows() {
  const target = path.join(binDir, 'ffmpeg.exe');
  if (await exists(target)) {
    log(`= ffmpeg already present at ${target}`);
    return true;
  }

  const zipPath = path.join(binDir, 'ffmpeg.zip');
  const extractDir = path.join(binDir, '_ffmpeg');

  let downloaded = false;
  for (const url of FFMPEG_WINDOWS_ZIPS) {
    try {
      log(`> downloading FFmpeg from ${url} (this one is large)`);
      await download(url, zipPath);
      downloaded = true;
      break;
    } catch (error) {
      log(`! ${error.message}`);
    }
  }
  if (!downloaded) {
    log('! Could not reach any FFmpeg mirror. Install it manually and set FFMPEG_PATH.');
    return false;
  }

  log('> extracting');
  await new Promise((resolve, reject) => {
    const child = spawn(
      'powershell',
      ['-NoProfile', '-Command', `Expand-Archive -Path "${zipPath}" -DestinationPath "${extractDir}" -Force`],
      { stdio: 'inherit' },
    );
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`unzip exited ${code}`))));
  });

  // The archive nests everything under ffmpeg-<version>-essentials_build/bin.
  const entries = await fs.readdir(extractDir, { withFileTypes: true });
  const folder = entries.find((entry) => entry.isDirectory());
  if (!folder) throw new Error('unexpected FFmpeg archive layout');
  const sourceBin = path.join(extractDir, folder.name, 'bin');

  for (const name of ['ffmpeg.exe', 'ffprobe.exe']) {
    await fs.copyFile(path.join(sourceBin, name), path.join(binDir, name));
  }

  await fs.rm(zipPath, { force: true });
  await fs.rm(extractDir, { recursive: true, force: true });

  const { stdout } = await run(target, ['-version'], { timeout: 30_000 });
  log(`+ ${stdout.split('\n')[0]}`);
  return true;
}

async function main() {
  await fs.mkdir(binDir, { recursive: true });
  log(`ClipFlow tooling -> ${binDir}\n`);

  await installYtDlp();

  if (wantFfmpeg) {
    if (process.platform === 'win32') {
      await installFfmpegWindows();
    } else {
      log('! Automatic FFmpeg install is Windows-only here. Use your package manager:');
      log('    macOS:  brew install ffmpeg');
      log('    Debian: sudo apt install ffmpeg');
    }
  } else {
    log('\ni FFmpeg was not requested. Without it ClipFlow offers only ready-made');
    log('  formats and disables audio conversion (the UI says so).');
    log('  Add it with: npm run setup:tools -- --ffmpeg');
  }

  log('\nDone. Run `npm run doctor` to confirm what the server can see.');
}

main().catch((error) => {
  process.stderr.write(`\nsetup failed: ${error.message}\n`);
  process.exit(1);
});
