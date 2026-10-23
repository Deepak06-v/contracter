import { Router } from 'express';
import {
  getAgents,
  createAgent,
  updateAgent,
  toggleAgentStatus,
} from '../controllers/agentController';
import { authenticate, requireContractor } from '../middleware/auth';

const router = Router();

// All agent management endpoints are Contractor only
router.use(authenticate, requireContractor);

router.get('/', getAgents);
router.post('/', createAgent);
router.put('/:id', updateAgent);
router.put('/:id/status', toggleAgentStatus);

export default router;
