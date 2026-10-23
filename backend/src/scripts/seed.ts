import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { User } from '../models/User';
import { Site } from '../models/Site';
import { Transaction } from '../models/Transaction';
import { determinePaymentStatus } from '../services/calculationService';

// Ensure upload directory exists
const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create a valid demo invoice image buffer if one doesn't exist
const sampleProofFilename = 'demo_bill_sample.png';
const sampleProofPath = path.join(uploadDir, sampleProofFilename);

// Minimal 1x1 transparent/colored PNG base64 or a clean SVG converted to PNG
// Here is a valid 80x80 PNG with a demo stamp
const demoPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABMSURBVHgB7dAxEQAACAOxv+lhT1sJmII5uL3O7p3vBwQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBN4C+48BEaRj1k0AAAAASUVORK5CYII=';

if (!fs.existsSync(sampleProofPath)) {
  fs.writeFileSync(sampleProofPath, Buffer.from(demoPngBase64, 'base64'));
}

export async function seedDatabase() {
  if (!env.DEMO_SEED_ENABLED) {
    console.log('[Seed] DEMO_SEED_ENABLED is false. Skipping database seed.');
    return;
  }

  if (env.NODE_ENV === 'production' && !process.env.FORCE_SEED) {
    console.warn('[Seed] Warning: Cannot seed in production without FORCE_SEED=true. Aborting.');
    return;
  }

  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('[Seed] Connected.');

  // 1. Seed or find Contractor
  let contractor = await User.findOne({ email: env.DEMO_CONTRACTOR_EMAIL.toLowerCase() });
  if (!contractor) {
    contractor = new User({
      name: 'Vikram Mehta (Contractor)',
      email: env.DEMO_CONTRACTOR_EMAIL.toLowerCase(),
      password: env.DEMO_CONTRACTOR_PASSWORD,
      role: 'contractor',
      isActive: true,
    });
    await contractor.save();
    console.log(`[Seed] Created Contractor account: ${contractor.email}`);
  } else {
    console.log(`[Seed] Contractor account exists: ${contractor.email}`);
  }

  // 2. Seed or find Agents (at least two agents)
  let agent1 = await User.findOne({ email: env.DEMO_AGENT_EMAIL.toLowerCase() });
  if (!agent1) {
    agent1 = new User({
      name: 'Ramesh Kumar (Site Supervisor)',
      email: env.DEMO_AGENT_EMAIL.toLowerCase(),
      password: env.DEMO_AGENT_PASSWORD,
      role: 'agent',
      isActive: true,
    });
    await agent1.save();
    console.log(`[Seed] Created Agent 1: ${agent1.email}`);
  } else {
    console.log(`[Seed] Agent 1 exists: ${agent1.email}`);
  }

  const agent2Email = 'agent2@example.com';
  let agent2 = await User.findOne({ email: agent2Email });
  if (!agent2) {
    agent2 = new User({
      name: 'Suresh Patil (Site Agent)',
      email: agent2Email,
      password: 'Agent2@123',
      role: 'agent',
      isActive: true,
    });
    await agent2.save();
    console.log(`[Seed] Created Agent 2: ${agent2.email}`);
  } else {
    console.log(`[Seed] Agent 2 exists: ${agent2.email}`);
  }

  // 3. Seed at least three sample construction sites
  // Site 1: Assigned to Agent 1 only
  let site1 = await Site.findOne({ code: 'SITE-BLR-01' });
  if (!site1) {
    site1 = new Site({
      name: 'Greenfield Heights Block-A',
      code: 'SITE-BLR-01',
      location: 'Sarjapur Main Road, Bengaluru',
      description: 'Residential tower construction - 14 floors G+13 with basement parking',
      assignedAgents: [agent1._id],
      status: 'active',
    });
    await site1.save();
    console.log(`[Seed] Created Site 1: ${site1.name}`);
  }

  // Site 2: Assigned to Agent 2 only
  let site2 = await Site.findOne({ code: 'SITE-BLR-02' });
  if (!site2) {
    site2 = new Site({
      name: 'Apex Commercial Plaza',
      code: 'SITE-BLR-02',
      location: 'Whitefield Tech Park Road, Bengaluru',
      description: 'Commercial corporate park development with retail ground floor',
      assignedAgents: [agent2._id],
      status: 'active',
    });
    await site2.save();
    console.log(`[Seed] Created Site 2: ${site2.name}`);
  }

  // Site 3: Prestige Villa Phase-2 (Direct Contractor managed)
  let site3 = await Site.findOne({ code: 'SITE-BLR-03' });
  if (!site3) {
    site3 = new Site({
      name: 'Prestige Villa Phase-2',
      code: 'SITE-BLR-03',
      location: 'Kanakapura Road, Bengaluru',
      description: 'Luxury villa community development - 24 units with clubhouse',
      assignedAgents: [],
      status: 'active',
    });
    await site3.save();
    console.log(`[Seed] Created Site 3: ${site3.name}`);
  }

  // 4. Seed sample transactions if none exist
  const existingTxCount = await Transaction.countDocuments();
  if (existingTxCount === 0) {
    console.log('[Seed] Seeding sample transactions with fictional details...');

    const sampleTransactions = [
      {
        site: site1._id,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        title: 'Ultratech OPC 53 Grade Cement - 200 Bags Delivery',
        category: 'Materials' as const,
        materialName: 'Cement',
        quantity: 200,
        unit: 'bags',
        unitPrice: 380,
        totalAmount: 76000,
        amountPaid: 50000,
        supplier: 'Karnataka Traders (Demo Supplier)',
        notes: 'Challan #KT-9921 signed by gate guard. 200 bags unloaded at Block A storage.',
        createdBy: agent1._id,
      },
      {
        site: site1._id,
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        title: 'M-Sand River Sand Alternative - 2 Truckloads',
        category: 'Materials' as const,
        materialName: 'M-Sand',
        quantity: 2,
        unit: 'truckloads',
        unitPrice: 18500,
        totalAmount: 37000,
        amountPaid: 37000,
        supplier: 'Sai Stone Crusher (Demo)',
        notes: 'Delivery slip receipt attached. Fully paid via bank transfer.',
        createdBy: agent1._id,
      },
      {
        site: site1._id,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        title: 'Bar Bending and Centering Labour Daily Wages',
        category: 'Labour' as const,
        materialName: 'Daily Labour',
        quantity: 12,
        unit: 'days',
        unitPrice: 850,
        totalAmount: 10200,
        amountPaid: 10200,
        supplier: 'Muster Roll - Team Alpha',
        notes: 'Cash wage disbursement receipt signed by sub-contractor head.',
        createdBy: agent1._id,
      },
      {
        site: site1._id,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        title: 'JCB Excavator 3DX Rental for Basement Footing',
        category: 'Equipment' as const,
        materialName: 'Excavator Rental',
        quantity: 8,
        unit: 'hours',
        unitPrice: 1600,
        totalAmount: 12800,
        amountPaid: 6400,
        supplier: 'Shree Earthmovers (Demo)',
        notes: 'Log sheet verified: 8 engine hours. 50% advance paid.',
        createdBy: agent1._id,
      },
      {
        site: site2._id,
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        title: 'Fe 550D TMT Rebars 12mm & 16mm - 4.5 Tonnes',
        category: 'Materials' as const,
        materialName: 'TMT Steel',
        quantity: 4.5,
        unit: 'tonnes',
        unitPrice: 58000,
        totalAmount: 261000,
        amountPaid: 200000,
        supplier: 'National Steel Corp (Demo)',
        notes: 'Weighbridge slip attached. Batch test certificate verified.',
        createdBy: agent2._id,
      },
      {
        site: site2._id,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        title: 'RMC M25 Grade Ready Mix Concrete - 3 Transit Mixers',
        category: 'Materials' as const,
        materialName: 'RMC Concrete',
        quantity: 18,
        unit: 'cubic metres',
        unitPrice: 4200,
        totalAmount: 75600,
        amountPaid: 75600,
        supplier: 'Prism RMC (Demo)',
        notes: 'Slump test conducted on site: 120mm. Cubes casted for 7/28 day curing.',
        createdBy: agent2._id,
      },
      {
        site: site2._id,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        title: 'Diesel Fuel for Backup Generator & Concrete Pump',
        category: 'Transport' as const,
        materialName: 'Diesel',
        quantity: 150,
        unit: 'litres',
        unitPrice: 92,
        totalAmount: 13800,
        amountPaid: 13800,
        supplier: 'HP Auto Fuel Station (Demo)',
        notes: 'Pump receipt attached. Poured into site bowser tank.',
        createdBy: agent2._id,
      },
      {
        site: site3._id,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        title: 'Safety Helmets, Boots and Reflective Jackets (25 Sets)',
        category: 'Miscellaneous' as const,
        materialName: 'Safety PPE Gear',
        quantity: 25,
        unit: 'pieces',
        unitPrice: 950,
        totalAmount: 23750,
        amountPaid: 0,
        supplier: 'SafeTech Equipments (Demo)',
        notes: 'Invoice #ST-440 received. Payment term: 15 days credit.',
        createdBy: agent1._id,
      },
    ];

    for (const item of sampleTransactions) {
      const tx = new Transaction({
        ...item,
        paymentStatus: determinePaymentStatus(item.totalAmount, item.amountPaid),
        proofPhoto: {
          storage: 'local',
          filename: sampleProofFilename,
          originalName: 'fictional_demo_bill_receipt.png',
          path: sampleProofFilename,
          mimetype: 'image/png',
          size: 1024,
        },
      });
      await tx.save();
    }

    console.log(`[Seed] Seeded ${sampleTransactions.length} sample transactions.`);
  } else {
    console.log(`[Seed] Database already has ${existingTxCount} transactions. Skipping transaction seed.`);
  }

  console.log('[Seed] Seeding completed successfully.');
  console.log('--------------------------------------------------');
  console.log('DEMO CREDENTIALS:');
  console.log(`Contractor: ${env.DEMO_CONTRACTOR_EMAIL} (Password: ${env.DEMO_CONTRACTOR_PASSWORD})`);
  console.log(`Agent 1:    ${env.DEMO_AGENT_EMAIL} (Password: ${env.DEMO_AGENT_PASSWORD})`);
  console.log(`Agent 2:    ${agent2Email} (Password: Agent2@123)`);
  console.log('--------------------------------------------------');
}

// Auto-run if executed directly via command line
if (require.main === module) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
