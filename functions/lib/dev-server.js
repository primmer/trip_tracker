import express from 'express';
import cors from 'cors';
import { router } from './router.js';
const app = express();
const port = 5001;
// Proper CORS for local frontend
app.use(cors({ origin: 'http://localhost:5173' }));
// The router handles both /health and /api/health
app.use(router);
// For compatibility with /api prefix often used in frontends
app.use('/api', router);
app.listen(port, () => {
    console.log(`Standalone Functions Dev Server listening at http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/api/health`);
});
//# sourceMappingURL=dev-server.js.map