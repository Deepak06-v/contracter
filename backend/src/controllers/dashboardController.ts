import { Response } from 'express';
import { Site } from '../models/Site';
import { Transaction } from '../models/Transaction';
import { AuthenticatedRequest } from '../middleware/auth';
import { roundToTwoDecimals, calculateOutstandingAmount } from '../services/calculationService';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const { period = 'all' } = req.query;

    let siteQuery: any = {};
    let txQuery: any = {};

    if (user.role === 'agent') {
      const assignedSites = await Site.find({ assignedAgents: user._id }).select('_id');
      const assignedIds = assignedSites.map((s) => s._id);
      siteQuery._id = { $in: assignedIds };
      txQuery.site = { $in: assignedIds };
    }

    // Date filtering based on period
    const now = new Date();
    if (period === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      txQuery.date = { $gte: startOfMonth };
    } else if (period === 'last_30_days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      txQuery.date = { $gte: past30 };
    } else if (period === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      txQuery.date = { $gte: startOfYear };
    }

    // Total active sites
    const activeSitesCount = await Site.countDocuments({
      ...siteQuery,
      status: 'active',
    });
    const totalSitesCount = await Site.countDocuments(siteQuery);

    // Aggregate totals for the period
    const totalsAgg = await Transaction.aggregate([
      { $match: txQuery },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          count: { $sum: 1 },
        },
      },
    ]);

    const periodStats = totalsAgg[0] || { totalExpenses: 0, totalPaid: 0, count: 0 };
    const totalExpenses = roundToTwoDecimals(periodStats.totalExpenses);
    const totalPaid = roundToTwoDecimals(periodStats.totalPaid);
    const totalOutstanding = calculateOutstandingAmount(totalExpenses, totalPaid);
    const transactionCount = periodStats.count;

    // Recent transactions
    const recentTransactions = await Transaction.find(txQuery)
      .populate('site', 'name code location')
      .populate('createdBy', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .limit(6);

    // Site-wise summaries
    const sites = await Site.find(siteQuery)
      .populate('assignedAgents', 'name email')
      .sort({ name: 1 });

    const siteIds = sites.map((s) => s._id);
    const siteAggs = await Transaction.aggregate([
      { $match: { site: { $in: siteIds } } },
      {
        $group: {
          _id: '$site',
          totalExpenses: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          count: { $sum: 1 },
          latestDate: { $max: '$date' },
        },
      },
    ]);

    const siteMap = new Map<string, any>();
    for (const agg of siteAggs) {
      siteMap.set(agg._id.toString(), agg);
    }

    const siteSummaries = sites.map((site) => {
      const agg = siteMap.get(site._id.toString()) || {
        totalExpenses: 0,
        totalPaid: 0,
        count: 0,
        latestDate: null,
      };
      const outstanding = Math.max(0, agg.totalExpenses - agg.totalPaid);

      return {
        _id: site._id,
        name: site.name,
        code: site.code,
        location: site.location,
        status: site.status,
        assignedAgents: site.assignedAgents,
        totalExpenses: roundToTwoDecimals(agg.totalExpenses),
        totalPaid: roundToTwoDecimals(agg.totalPaid),
        outstandingAmount: roundToTwoDecimals(outstanding),
        transactionCount: agg.count,
        latestTransactionDate: agg.latestDate,
      };
    });

    res.json({
      activeSitesCount,
      totalSitesCount,
      totalExpenses,
      totalPaid,
      totalOutstanding,
      transactionCount,
      period,
      recentTransactions,
      siteSummaries,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch dashboard stats' });
  }
}
