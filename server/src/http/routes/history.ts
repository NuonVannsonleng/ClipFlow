import { Router } from 'express';
import { jobStore, toPublicJob } from '../../services/jobs/store.js';
import { removeJobFiles } from '../../services/storage/tempStore.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const historyRouter = Router();

/**
 * Server-side history is scoped to the anonymous session cookie and exists
 * only so the UI can tell which temporary links are still alive. The
 * browser keeps its own copy locally, which is what the history page shows.
 */
historyRouter.get(
  '/history',
  asyncHandler(async (req, res) => {
    jobStore.expireStale();
    res.json({ jobs: jobStore.listForSession(req.sessionId).map(toPublicJob) });
  }),
);

historyRouter.delete(
  '/history/:id',
  asyncHandler(async (req, res) => {
    const jobId = req.params.id as string;
    jobStore.require(jobId, req.sessionId);
    await removeJobFiles(jobId);
    jobStore.remove(jobId, req.sessionId);
    res.status(204).end();
  }),
);

/** Clear everything this session left on the server. */
historyRouter.delete(
  '/history',
  asyncHandler(async (req, res) => {
    const ids = jobStore.removeSession(req.sessionId);
    await Promise.all(ids.map((id) => removeJobFiles(id)));
    res.status(204).end();
  }),
);
