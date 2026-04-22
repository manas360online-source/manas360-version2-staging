import { Router } from 'express';
import { sendSuccess } from '../utils/response';

const router = Router();

// Lightweight activation endpoint used by the clinical launch screen.
// This is intentionally idempotent and does not mutate server state.
router.post('/activate', (req, res) => {
	const hasAuthorization = Boolean(req.headers.authorization);
	sendSuccess(
		res,
		{
			activated: true,
			idempotent: true,
			hasAuthorization,
			timestamp: new Date().toISOString(),
		},
		'System activation acknowledged',
	);
});

export default router;
