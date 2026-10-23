import { Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Site } from '../models/Site';
import { AuthenticatedRequest, canUserAccessSite } from '../middleware/auth';
import { StorageService } from '../services/storageService';
import {
  determinePaymentStatus,
  roundToTwoDecimals,
  hasPriceDiscrepancy,
  calculateOutstandingAmount,
} from '../services/calculationService';
import { Types } from 'mongoose';
import fs from 'fs';

export async function getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const {
      siteId,
      startDate,
      endDate,
      category,
      paymentStatus,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const query: any = {};

    // Enforce role-based site scoping
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
      // Contractor
      if (siteId) {
        if (!Types.ObjectId.isValid(siteId as string)) {
          res.status(400).json({ message: 'Invalid site ID' });
          return;
        }
        query.site = siteId;
      }
    }

    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Filter by payment status
    if (paymentStatus && paymentStatus !== 'All') {
      query.paymentStatus = paymentStatus;
    }

    // Search query on title, materialName, and supplier
    if (search && typeof search === 'string' && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { materialName: regex }, { supplier: regex }];
    }

    // Determine sorting
    const sortField = sortBy === 'amount' ? 'totalAmount' : 'date';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const transactions = await Transaction.find(query)
      .populate('site', 'name code location')
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .sort({ [sortField]: sortDirection });

    // Calculate aggregated summaries on the matched records
    let totalExpenses = 0;
    let totalPaid = 0;

    for (const tx of transactions) {
      totalExpenses += tx.totalAmount || 0;
      totalPaid += tx.amountPaid || 0;
    }

    totalExpenses = roundToTwoDecimals(totalExpenses);
    totalPaid = roundToTwoDecimals(totalPaid);
    const totalOutstanding = calculateOutstandingAmount(totalExpenses, totalPaid);

    res.json({
      summary: {
        totalExpenses,
        totalPaid,
        totalOutstanding,
        count: transactions.length,
      },
      transactions,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch transactions' });
  }
}

export async function getTransactionById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = req.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid transaction ID' });
      return;
    }

    const tx = await Transaction.findById(id)
      .populate('site', 'name code location')
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email');

    if (!tx) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    const hasAccess = await canUserAccessSite(user, tx.site._id.toString());
    if (!hasAccess) {
      res.status(403).json({ message: 'Access denied. You do not have permission to view this transaction.' });
      return;
    }

    const discrepancy = hasPriceDiscrepancy(tx.totalAmount, tx.quantity, tx.unitPrice);
    const outstanding = calculateOutstandingAmount(tx.totalAmount, tx.amountPaid);

    res.json({
      transaction: tx,
      outstandingAmount: outstanding,
      discrepancy,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch transaction' });
  }
}

export async function createTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const {
      site,
      date,
      title,
      category,
      materialName,
      quantity,
      unit,
      unitPrice,
      totalAmount,
      amountPaid,
      paymentStatus: requestedStatus,
      supplier,
      notes,
    } = req.body;

    // Validate required fields
    if (!site || !date || !title || !category || totalAmount === undefined) {
      res.status(400).json({ message: 'Site, date, title, category, and total amount are required.' });
      return;
    }

    if (!Types.ObjectId.isValid(site)) {
      res.status(400).json({ message: 'Invalid site ID' });
      return;
    }

    // Access control check
    const hasAccess = await canUserAccessSite(user, site);
    if (!hasAccess) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this site.' });
      return;
    }

    // Validate proof photo file
    if (!req.file) {
      res.status(400).json({ message: 'Proof photo is required when recording a transaction.' });
      return;
    }

    const parsedTotal = roundToTwoDecimals(parseFloat(totalAmount));
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      res.status(400).json({ message: 'Total amount must be a positive number greater than 0.' });
      return;
    }

    let parsedPaid = 0;
    if (amountPaid !== undefined && amountPaid !== '') {
      parsedPaid = roundToTwoDecimals(parseFloat(amountPaid));
      if (isNaN(parsedPaid) || parsedPaid < 0) {
        res.status(400).json({ message: 'Amount paid cannot be negative.' });
        return;
      }
      if (parsedPaid > parsedTotal) {
        res.status(400).json({ message: 'Amount paid cannot exceed total amount.' });
        return;
      }
    }

    // Auto-calculate payment status consistently
    const autoStatus = determinePaymentStatus(parsedTotal, parsedPaid);
    const finalStatus = requestedStatus || autoStatus;

    const parsedQuantity = quantity !== undefined && quantity !== '' ? parseFloat(quantity) : undefined;
    const parsedUnitPrice = unitPrice !== undefined && unitPrice !== '' ? roundToTwoDecimals(parseFloat(unitPrice)) : undefined;

    // Save uploaded proof photo
    const proofPhoto = await StorageService.saveFile(req.file);

    const transaction = new Transaction({
      site,
      date: new Date(date),
      title: title.trim(),
      category,
      materialName: materialName ? materialName.trim() : undefined,
      quantity: parsedQuantity,
      unit: unit ? unit.trim() : undefined,
      unitPrice: parsedUnitPrice,
      totalAmount: parsedTotal,
      amountPaid: parsedPaid,
      paymentStatus: finalStatus,
      supplier: supplier ? supplier.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      proofPhoto,
      createdBy: user._id,
    });

    await transaction.save();
    const populated = await transaction.populate([
      { path: 'site', select: 'name code location' },
      { path: 'createdBy', select: 'name email' },
    ]);

    const discrepancy = hasPriceDiscrepancy(parsedTotal, parsedQuantity, parsedUnitPrice);

    res.status(201).json({
      message: 'Transaction recorded successfully',
      transaction: populated,
      discrepancy,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to record transaction' });
  }
}

export async function updateTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = req.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid transaction ID' });
      return;
    }

    const tx = await Transaction.findById(id);
    if (!tx) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // Access check on the transaction's site
    const hasAccess = await canUserAccessSite(user, tx.site.toString());
    if (!hasAccess) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this site.' });
      return;
    }

    const {
      site,
      date,
      title,
      category,
      materialName,
      quantity,
      unit,
      unitPrice,
      totalAmount,
      amountPaid,
      paymentStatus: requestedStatus,
      supplier,
      notes,
    } = req.body;

    // If site changed, verify access to the target site as well
    if (site && site !== tx.site.toString()) {
      const targetAccess = await canUserAccessSite(user, site);
      if (!targetAccess) {
        res.status(403).json({ message: 'Access denied to target site.' });
        return;
      }
      tx.site = site;
    }

    if (date) tx.date = new Date(date);
    if (title) tx.title = title.trim();
    if (category) tx.category = category;
    if (materialName !== undefined) tx.materialName = materialName ? materialName.trim() : undefined;
    if (unit !== undefined) tx.unit = unit ? unit.trim() : undefined;
    if (supplier !== undefined) tx.supplier = supplier ? supplier.trim() : undefined;
    if (notes !== undefined) tx.notes = notes ? notes.trim() : undefined;

    if (quantity !== undefined) {
      tx.quantity = quantity !== '' ? parseFloat(quantity) : undefined;
    }
    if (unitPrice !== undefined) {
      tx.unitPrice = unitPrice !== '' ? roundToTwoDecimals(parseFloat(unitPrice)) : undefined;
    }

    if (totalAmount !== undefined) {
      const parsedTotal = roundToTwoDecimals(parseFloat(totalAmount));
      if (isNaN(parsedTotal) || parsedTotal <= 0) {
        res.status(400).json({ message: 'Total amount must be greater than 0.' });
        return;
      }
      tx.totalAmount = parsedTotal;
    }

    if (amountPaid !== undefined) {
      const parsedPaid = amountPaid !== '' ? roundToTwoDecimals(parseFloat(amountPaid)) : 0;
      if (isNaN(parsedPaid) || parsedPaid < 0) {
        res.status(400).json({ message: 'Amount paid cannot be negative.' });
        return;
      }
      if (parsedPaid > tx.totalAmount) {
        res.status(400).json({ message: 'Amount paid cannot exceed total amount.' });
        return;
      }
      tx.amountPaid = parsedPaid;
    }

    if (requestedStatus) {
      tx.paymentStatus = requestedStatus;
    } else {
      tx.paymentStatus = determinePaymentStatus(tx.totalAmount, tx.amountPaid);
    }

    // If a new photo file was uploaded, replace the old photo
    if (req.file) {
      const oldPhoto = tx.proofPhoto;
      const newPhoto = await StorageService.saveFile(req.file);
      tx.proofPhoto = newPhoto;

      // Clean up old file asynchronously
      if (oldPhoto) {
        StorageService.deleteFile(oldPhoto).catch((err) =>
          console.warn('Failed to delete replaced photo', err)
        );
      }
    }

    tx.lastEditedBy = user._id;
    await tx.save();

    const populated = await tx.populate([
      { path: 'site', select: 'name code location' },
      { path: 'createdBy', select: 'name email' },
      { path: 'lastEditedBy', select: 'name email' },
    ]);

    const discrepancy = hasPriceDiscrepancy(tx.totalAmount, tx.quantity, tx.unitPrice);

    res.json({
      message: 'Transaction updated successfully',
      transaction: populated,
      discrepancy,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update transaction' });
  }
}

export async function deleteTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = req.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid transaction ID' });
      return;
    }

    const tx = await Transaction.findById(id);
    if (!tx) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // Verify site access
    const hasAccess = await canUserAccessSite(user, tx.site.toString());
    if (!hasAccess) {
      res.status(403).json({ message: 'Access denied. You are not assigned to this site.' });
      return;
    }

    // Remove photo proof cleanly from storage
    if (tx.proofPhoto) {
      await StorageService.deleteFile(tx.proofPhoto);
    }

    await Transaction.findByIdAndDelete(id);

    res.json({ message: 'Transaction and associated proof deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete transaction' });
  }
}

/**
 * Protected image streaming endpoint.
 * Ensures user has permission to view the site before sending the image.
 */
export async function getTransactionPhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = req.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid transaction ID' });
      return;
    }

    const tx = await Transaction.findById(id);
    if (!tx || !tx.proofPhoto) {
      res.status(404).json({ message: 'Photo not found for this transaction' });
      return;
    }

    // Verify site access
    const hasAccess = await canUserAccessSite(user, tx.site.toString());
    if (!hasAccess) {
      res.status(403).json({ message: 'Access denied. You do not have permission to view this proof.' });
      return;
    }

    if (tx.proofPhoto.storage === 'cloudinary') {
      res.redirect(tx.proofPhoto.path);
      return;
    }

    // Local storage: stream the file safely
    const filePath = StorageService.getLocalFilePath(tx.proofPhoto.path);
    if (!filePath) {
      res.status(404).json({ message: 'Physical image file is missing on the server.' });
      return;
    }

    res.setHeader('Content-Type', tx.proofPhoto.mimetype || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to stream photo' });
  }
}
