import { Schema, model, Document, Types } from 'mongoose';

export type TransactionCategory =
  | 'Materials'
  | 'Labour'
  | 'Transport'
  | 'Equipment'
  | 'Miscellaneous';

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';

export interface IProofPhoto {
  storage: 'local' | 'cloudinary';
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
}

export interface ITransaction extends Document {
  _id: any;
  site: Types.ObjectId;
  date: Date;
  title: string;
  category: TransactionCategory;
  materialName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  supplier?: string;
  notes?: string;
  proofPhoto: IProofPhoto;
  createdBy: Types.ObjectId;
  lastEditedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const proofPhotoSchema = new Schema<IProofPhoto>(
  {
    storage: {
      type: String,
      enum: ['local', 'cloudinary'],
      default: 'local',
      required: true,
    },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const transactionSchema = new Schema<ITransaction>(
  {
    site: {
      type: Schema.Types.ObjectId,
      ref: 'Site',
      required: [true, 'Site reference is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Transaction title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: ['Materials', 'Labour', 'Transport', 'Equipment', 'Miscellaneous'],
      required: [true, 'Category is required'],
      index: true,
    },
    materialName: {
      type: String,
      trim: true,
      maxlength: [100, 'Material name cannot exceed 100 characters'],
    },
    quantity: {
      type: Number,
      min: [0, 'Quantity cannot be negative'],
    },
    unit: {
      type: String,
      trim: true,
      maxlength: [50, 'Unit cannot exceed 50 characters'],
    },
    unitPrice: {
      type: Number,
      min: [0, 'Unit price cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0.01, 'Total amount must be greater than zero'],
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Amount paid cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Unpaid'],
      required: true,
      index: true,
    },
    supplier: {
      type: String,
      trim: true,
      maxlength: [150, 'Supplier cannot exceed 150 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    proofPhoto: {
      type: proofPhotoSchema,
      required: [true, 'Proof photo is required for transactions'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastEditedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast querying and filtering
transactionSchema.index({ site: 1, date: -1 });
transactionSchema.index({ site: 1, category: 1 });
transactionSchema.index({ site: 1, paymentStatus: 1 });
transactionSchema.index({ date: -1 });

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
