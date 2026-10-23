import { Router } from 'express';
import {
  getSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
} from '../controllers/siteController';
import { authenticate, requireContractor } from '../middleware/auth';

const router = Router();

// Both contractor and agent can get sites (agents get only assigned sites)
router.get('/', authenticate, getSites);
router.get('/:id', authenticate, getSiteById);

// Contractor only
router.post('/', authenticate, requireContractor, createSite);
router.put('/:id', authenticate, requireContractor, updateSite);
router.delete('/:id', authenticate, requireContractor, deleteSite);

export default router;
