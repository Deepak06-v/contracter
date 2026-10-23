import { Response } from 'express';
import { Site } from '../models/Site';
import { Transaction } from '../models/Transaction';
import { AuthenticatedRequest, canUserAccessSite } from '../middleware/auth';
import { Types } from 'mongoose';

export async function getSites(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;
    let query: any = {};

    if (user.role === 'agent') {
      // Agents only see assigned sites
      query = { assignedAgents: user._id };
    }

    const sites = await Site.find(query)
      .populate('assignedAgents', 'name email isActive')
      .sort({ createdAt: -1 });

    // Aggregate expense totals and transaction counts per site
    const siteIds = sites.map((s) => s._id);

    const aggregations = await Transaction.aggregate([
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

    const statsMap = new Map<string, any>();
    for (const agg of aggregations) {
      statsMap.set(agg._id.toString(), agg);
    }

    const result = sites.map((site) => {
      const stats = statsMap.get(site._id.toString()) || {
        totalExpenses: 0,
        totalPaid: 0,
        count: 0,
        latestDate: null,
      };

      const outstanding = Math.max(0, stats.totalExpenses - stats.totalPaid);

      return {
        _id: site._id,
        name: site.name,
        code: site.code,
        location: site.location,
        description: site.description,
        assignedAgents: site.assignedAgents,
        status: site.status,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
        totalExpenses: Math.round(stats.totalExpenses * 100) / 100,
        totalPaid: Math.round(stats.totalPaid * 100) / 100,
        outstandingAmount: Math.round(outstanding * 100) / 100,
        transactionCount: stats.count,
        latestTransactionDate: stats.latestDate,
      };
    });

    res.json({ sites: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch sites' });
  }
}

export async function getSiteById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = req.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid site ID' });
      return;
    }

    const hasAccess = await canUserAccessSite(user, id);
    if (!hasAccess) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this site.' });
      return;
    }

    const site = await Site.findById(id).populate('assignedAgents', 'name email isActive');
    if (!site) {
      res.status(404).json({ message: 'Site not found' });
      return;
    }

    // Get site stats
    const stats = await Transaction.aggregate([
      { $match: { site: site._id } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          count: { $sum: 1 },
          latestDate: { $max: '$date' },
        },
      },
    ]);

    const siteStats = stats[0] || {
      totalExpenses: 0,
      totalPaid: 0,
      count: 0,
      latestDate: null,
    };

    const outstanding = Math.max(0, siteStats.totalExpenses - siteStats.totalPaid);

    res.json({
      site: {
        ...site.toObject(),
        totalExpenses: Math.round(siteStats.totalExpenses * 100) / 100,
        totalPaid: Math.round(siteStats.totalPaid * 100) / 100,
        outstandingAmount: Math.round(outstanding * 100) / 100,
        transactionCount: siteStats.count,
        latestTransactionDate: siteStats.latestDate,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch site' });
  }
}

export async function createSite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, code, location, description, assignedAgents, status } = req.body;

    if (!name || !location) {
      res.status(400).json({ message: 'Site name and location are required.' });
      return;
    }

    const site = new Site({
      name,
      code: code ? code.trim().toUpperCase() : undefined,
      location,
      description,
      assignedAgents: Array.isArray(assignedAgents) ? assignedAgents : [],
      status: status || 'active',
    });

    await site.save();

    // Enforce single site per agent rule: remove assigned agents from any other sites
    if (Array.isArray(assignedAgents) && assignedAgents.length > 0) {
      await Site.updateMany(
        { _id: { $ne: site._id }, assignedAgents: { $in: assignedAgents } },
        { $pull: { assignedAgents: { $in: assignedAgents } } }
      );
    }

    const populated = await site.populate('assignedAgents', 'name email isActive');

    res.status(201).json({
      message: 'Site created successfully',
      site: populated,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create site' });
  }
}

export async function updateSite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, code, location, description, assignedAgents, status } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid site ID' });
      return;
    }

    const site = await Site.findById(id);
    if (!site) {
      res.status(404).json({ message: 'Site not found' });
      return;
    }

    if (name) site.name = name;
    if (code !== undefined) site.code = code ? code.trim().toUpperCase() : undefined;
    if (location) site.location = location;
    if (description !== undefined) site.description = description;
    if (status) site.status = status;
    if (Array.isArray(assignedAgents)) {
      site.assignedAgents = assignedAgents;
      // Enforce single site per agent rule: remove assigned agents from any other sites
      if (assignedAgents.length > 0) {
        await Site.updateMany(
          { _id: { $ne: site._id }, assignedAgents: { $in: assignedAgents } },
          { $pull: { assignedAgents: { $in: assignedAgents } } }
        );
      }
    }

    await site.save();
    const populated = await site.populate('assignedAgents', 'name email isActive');

    res.json({
      message: 'Site updated successfully',
      site: populated,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update site' });
  }
}

export async function deleteSite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid site ID' });
      return;
    }

    const transactionCount = await Transaction.countDocuments({ site: id });
    if (transactionCount > 0) {
      res.status(400).json({
        message: `Cannot delete site. It contains ${transactionCount} recorded transactions. Please mark the site as 'completed' instead to preserve audit records.`,
      });
      return;
    }

    const deleted = await Site.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: 'Site not found' });
      return;
    }

    res.json({ message: 'Site deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete site' });
  }
}
