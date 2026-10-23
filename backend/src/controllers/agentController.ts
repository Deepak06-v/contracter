import { Response } from 'express';
import { User } from '../models/User';
import { Site } from '../models/Site';
import { AuthenticatedRequest } from '../middleware/auth';
import { Types } from 'mongoose';

export async function getAgents(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agents = await User.find({ role: 'agent' }).sort({ createdAt: -1 });

    // Fetch site assignments for each agent
    const agentIds = agents.map((a) => a._id);
    const sites = await Site.find({ assignedAgents: { $in: agentIds } }).select('_id name code status assignedAgents');

    const agentList = agents.map((agent) => {
      const assignedSites = sites
        .filter((s) => s.assignedAgents.some((aid) => aid.toString() === agent._id.toString()))
        .map((s) => ({ _id: s._id, name: s.name, code: s.code, status: s.status }));

      const assignedSite = assignedSites[0] || null;

      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        isActive: agent.isActive,
        createdAt: agent.createdAt,
        assignedSites: assignedSite ? [assignedSite] : [],
        assignedSite,
      };
    });

    res.json({ agents: agentList });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch agents' });
  }
}

export async function createAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, assignedSiteIds, assignedSiteId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and initial password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(400).json({ message: 'An account with this email already exists.' });
      return;
    }

    const agent = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'agent',
      isActive: true,
    });

    await agent.save();

    // Enforce single site assignment: an agent is assigned to at most 1 site
    const targetSiteId =
      assignedSiteId ||
      (Array.isArray(assignedSiteIds) && assignedSiteIds.length > 0 ? assignedSiteIds[0] : null);

    if (targetSiteId && Types.ObjectId.isValid(targetSiteId)) {
      await Site.findByIdAndUpdate(targetSiteId, { $addToSet: { assignedAgents: agent._id } });
    }

    res.status(201).json({
      message: 'Agent created successfully',
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        isActive: agent.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create agent' });
  }
}

export async function updateAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, email, isActive, assignedSiteIds, assignedSiteId } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid agent ID' });
      return;
    }

    const agent = await User.findOne({ _id: id, role: 'agent' });
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    if (name) agent.name = name.trim();
    if (email) {
      const emailLower = email.toLowerCase().trim();
      const existing = await User.findOne({ email: emailLower, _id: { $ne: id } });
      if (existing) {
        res.status(400).json({ message: 'Another user is already registered with this email.' });
        return;
      }
      agent.email = emailLower;
    }

    if (typeof isActive === 'boolean') {
      agent.isActive = isActive;
    }

    await agent.save();

    // Enforce single site assignment rule
    const hasSiteUpdate =
      assignedSiteId !== undefined || Array.isArray(assignedSiteIds);

    if (hasSiteUpdate) {
      const targetSiteId =
        assignedSiteId !== undefined
          ? assignedSiteId
          : Array.isArray(assignedSiteIds) && assignedSiteIds.length > 0
          ? assignedSiteIds[0]
          : null;

      // 1. Remove agent from any site they were previously assigned to
      await Site.updateMany(
        { assignedAgents: agent._id },
        { $pull: { assignedAgents: agent._id } }
      );

      // 2. Assign agent to the single specified site (if provided)
      if (targetSiteId && Types.ObjectId.isValid(targetSiteId)) {
        await Site.findByIdAndUpdate(targetSiteId, {
          $addToSet: { assignedAgents: agent._id },
        });
      }
    }

    res.json({
      message: 'Agent updated successfully',
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        isActive: agent.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update agent' });
  }
}

export async function toggleAgentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid agent ID' });
      return;
    }

    const agent = await User.findOne({ _id: id, role: 'agent' });
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    agent.isActive = !agent.isActive;
    await agent.save();

    res.json({
      message: `Agent account ${agent.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: agent.isActive,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to toggle status' });
  }
}
