import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../models/User';
import { Site } from '../models/Site';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role: string };

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'User account no longer exists.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Your account has been deactivated. Contact the contractor.' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }
    res.status(401).json({ message: 'Invalid authentication token.' });
  }
}

export function requireContractor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'contractor') {
    res.status(403).json({ message: 'Access denied. Contractor privileges required.' });
    return;
  }
  next();
}

/**
 * Check if the authenticated user has access to a specific site.
 * Contractors can access all sites.
 * Agents can only access sites where they are listed in assignedAgents.
 */
export async function canUserAccessSite(user: IUser, siteId: string): Promise<boolean> {
  if (user.role === 'contractor') {
    return true;
  }

  const site = await Site.findById(siteId);
  if (!site) {
    return false;
  }

  const agentIdStr = user._id.toString();
  return site.assignedAgents.some((id) => id.toString() === agentIdStr);
}
