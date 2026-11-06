import 'server-only';

import { appRouter } from './router';

/** Server-side caller for RSC pages and server actions — same router as /api/trpc. */
export const api = appRouter.createCaller({});
