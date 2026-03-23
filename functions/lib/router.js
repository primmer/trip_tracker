import { Router } from 'express';
const router = Router();
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// For local dev where we might hit /api/health directly
router.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
export { router };
//# sourceMappingURL=router.js.map