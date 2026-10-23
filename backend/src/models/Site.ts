import { Schema, model, Document, Types } from 'mongoose';

export interface ISite extends Document {
  _id: any;
  name: string;
  code?: string;
  location: string;
  description?: string;
  assignedAgents: Types.ObjectId[];
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<ISite>(
  {
    name: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true,
      maxlength: [150, 'Site name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Site code cannot exceed 20 characters'],
    },
    location: {
      type: String,
      required: [true, 'Site location is required'],
      trim: true,
      maxlength: [250, 'Location cannot exceed 250 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    assignedAgents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

siteSchema.index({ assignedAgents: 1 });
siteSchema.index({ status: 1 });
siteSchema.index({ name: 'text', location: 'text' });

export const Site = model<ISite>('Site', siteSchema);
