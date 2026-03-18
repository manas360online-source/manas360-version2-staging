import { Router } from 'express';
import * as systemStatusController from '../controllers/system-status.controller';

const router = Router();

router.get('/status', systemStatusController.getStatus);
router.post('/activate', systemStatusController.activate);

export default router;
