import { Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Site } from '../models/Site';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateTransactionsCsv } from '../services/csvService';
import { Types } from 'mongoose';

export async function exportTransactionsCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const { siteId, startDate, endDate, category, paymentStatus, search } = req.query;

    const query: any = {};

    // Role-based site restriction
    if (user.role === 'agent') {
      const assignedSites = await Site.find({ assignedAgents: user._id }).select('_id');
      const assignedIds = assignedSites.map((s) => s._id);

      if (siteId) {
        if (!Types.ObjectId.isValid(siteId as string)) {
          res.status(400).json({ message: 'Invalid site ID' });
          return;
        }
        const hasAccess = assignedIds.some((id) => id.toString() === siteId.toString());
        if (!hasAccess) {
          res.status(403).json({ message: 'Access denied. You are not assigned to this site.' });
          return;
        }
        query.site = siteId;
      } else {
        query.site = { $in: assignedIds };
      }
    } else {
      if (siteId) {
        if (!Types.ObjectId.isValid(siteId as string)) {
          res.status(400).json({ message: 'Invalid site ID' });
          return;
        }
        query.site = siteId;
      }
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (category && category !== 'All') query.category = category;
    if (paymentStatus && paymentStatus !== 'All') query.paymentStatus = paymentStatus;

    if (search && typeof search === 'string' && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { materialName: regex }, { supplier: regex }];
    }

    const transactions = await Transaction.find(query)
      .populate('site', 'name code location')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    const csvData = generateTransactionsCsv(transactions);

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `construction_ledger_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to generate CSV export' });
  }
}
