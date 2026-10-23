import { Router } from 'express';
import { exportTransactionsCsv } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/transactions/export', exportTransactionsCsv);

export default router;
