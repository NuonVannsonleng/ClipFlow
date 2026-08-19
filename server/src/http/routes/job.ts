import { Router } from 'express';
import type { Job } from '../../core/types.js';
import { getQueue } from '../../services/jobs/queue.js';
import { jobStore, toPublicJob } from '../../services/jobs/store.js';
import { removeJobFiles } from '../../services/storage/tempStore.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const jobRouter = Router();

jobRouter.get(
  '/job/:id',
  asyncHandler(async (req, res) => {
    const job = jobStore.require(req.params.id as string, req.sessionId);
    res.json({ job: toPublicJob(job) });
  }),
);

/**
 * Live job status over Server-Sent Events. Polling GET /api/job/:id also
 * works; this just avoids the delay between polls.
 */
jobRouter.get('/job/:id/events', (req, res) => {
  const jobId = req.params.id as string;
  const job = jobStore.require(jobId, req.sessionId);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (payload: Job) => {
    res.write(`data: ${JSON.stringify({ job: payload })}\n\n`);
  };

  send(job);

  const onJob = (updated: Job) => {
    if (updated.id !== jobId) return;
    send(updated);
    if (['completed', 'failed', 'expired'].includes(updated.state)) {
      cleanup();
      res.end();
    }
  };

  // Comment frames keep proxies from closing an idle stream.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);

  function cleanup() {
    clearInterval(heartbeat);
    jobStore.off('job', onJob);
  }

  jobStore.on('job', onJob);
  req.on('close', cleanup);

  if (['completed', 'failed', 'expired'].includes(job.state)) {
    cleanup();
    res.end();
  }
});

/** Cancels a running job and deletes anything it already wrote to disk. */
jobRouter.delete(
  '/job/:id',
  asyncHandler(async (req, res) => {
    const jobId = req.params.id as string;
    jobStore.require(jobId, req.sessionId);
    await getQueue().cancel(jobId);
    await removeJobFiles(jobId);
    jobStore.remove(jobId, req.sessionId);
    res.status(204).end();
  }),
);
