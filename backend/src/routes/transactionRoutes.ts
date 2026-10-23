import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionPhoto,
} from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';
import { uploadProof } from '../middleware/upload';

const router = Router();

// All transaction endpoints require authentication
router.use(authenticate);

router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.get('/:id/photo', getTransactionPhoto);
router.post('/', uploadProof.single('proofPhoto'), createTransaction);
router.put('/:id', uploadProof.single('proofPhoto'), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
