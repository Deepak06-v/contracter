import React, { useState, useEffect } from 'react';
import { Transaction, transactionApi, TransactionCategory, PaymentStatus } from '../api/transactionApi';
import { Site } from '../api/siteApi';
import { toInputDate } from '../utils/formatters';
import { DiscrepancyAlert } from './DiscrepancyAlert';
import { X, UploadCloud, AlertCircle, Check } from 'lucide-react';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sites: Site[];
  initialSiteId?: string;
  transactionToEdit?: Transaction | null;
}

const CATEGORIES: TransactionCategory[] = [
  'Materials',
  'Labour',
  'Transport',
  'Equipment',
  'Miscellaneous',
];

const COMMON_UNITS = [
  'bags',
  'kg',
  'tonnes',
  'cubic feet',
  'cubic metres',
  'truckloads',
  'pieces',
  'days',
  'hours',
  'trips',
  'other',
];

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sites,
  initialSiteId,
  transactionToEdit,
}) => {
  const [site, setSite] = useState<string>('');
  const [date, setDate] = useState<string>(toInputDate(new Date()));
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<TransactionCategory>('Materials');
  const [materialName, setMaterialName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('bags');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // File upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Status flags
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (transactionToEdit) {
      setSite(transactionToEdit.site?._id || '');
      setDate(toInputDate(transactionToEdit.date));
      setTitle(transactionToEdit.title);
      setCategory(transactionToEdit.category);
      setMaterialName(transactionToEdit.materialName || '');
      setQuantity(transactionToEdit.quantity !== undefined ? String(transactionToEdit.quantity) : '');
      setUnit(transactionToEdit.unit || 'bags');
      setUnitPrice(transactionToEdit.unitPrice !== undefined ? String(transactionToEdit.unitPrice) : '');
      setTotalAmount(String(transactionToEdit.totalAmount));
      setAmountPaid(String(transactionToEdit.amountPaid || '0'));
      setPaymentStatus(transactionToEdit.paymentStatus);
      setSupplier(transactionToEdit.supplier || '');
      setNotes(transactionToEdit.notes || '');
      setPhotoFile(null);
      setPhotoPreview(null);
    } else {
      setSite(initialSiteId || (sites.length > 0 ? sites[0]._id : ''));
      setDate(toInputDate(new Date()));
      setTitle('');
      setCategory('Materials');
      setMaterialName('');
      setQuantity('');
      setUnit('bags');
      setUnitPrice('');
      setTotalAmount('');
      setAmountPaid('');
      setPaymentStatus('Paid');
      setSupplier('');
      setNotes('');
      setPhotoFile(null);
      setPhotoPreview(null);
    }
    setErrorMessage(null);
  }, [transactionToEdit, initialSiteId, sites, isOpen]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handleQuantityOrPriceChange = (newQty: string, newRate: string) => {
    const q = parseFloat(newQty);
    const r = parseFloat(newRate);
    if (!isNaN(q) && !isNaN(r) && q > 0 && r > 0) {
      const calculated = Math.round(q * r * 100) / 100;
      setTotalAmount(String(calculated));
      setAmountPaid(String(calculated));
      setPaymentStatus('Paid');
    }
  };

  const handleAmountPaidChange = (paidVal: string) => {
    setAmountPaid(paidVal);
    const total = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidVal) || 0;
    if (paid >= total && total > 0) {
      setPaymentStatus('Paid');
    } else if (paid > 0) {
      setPaymentStatus('Partially Paid');
    } else {
      setPaymentStatus('Unpaid');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Image exceeds 8MB limit. Please select a smaller photo.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Only JPEG, PNG, or WebP images are supported.');
      return;
    }

    setErrorMessage(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!site) {
      setErrorMessage('Please select a construction site.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please enter an expense title.');
      return;
    }
    const parsedTotal = parseFloat(totalAmount);
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setErrorMessage('Please enter a valid total amount greater than 0.');
      return;
    }
    if (!transactionToEdit && !photoFile) {
      setErrorMessage('Receipt photo proof is required for new entries.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('site', site);
      formData.append('date', date);
      formData.append('title', title.trim());
      formData.append('category', category);
      if (materialName.trim()) formData.append('materialName', materialName.trim());
      if (quantity) formData.append('quantity', quantity);
      if (unit) formData.append('unit', unit);
      if (unitPrice) formData.append('unitPrice', unitPrice);
      formData.append('totalAmount', String(parsedTotal));
      formData.append('amountPaid', amountPaid || '0');
      formData.append('paymentStatus', paymentStatus);
      if (supplier.trim()) formData.append('supplier', supplier.trim());
      if (notes.trim()) formData.append('notes', notes.trim());

      if (photoFile) {
        formData.append('proofPhoto', photoFile);
      }

      if (transactionToEdit) {
        await transactionApi.updateTransaction(transactionToEdit._id, formData);
      } else {
        await transactionApi.createTransaction(formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to save transaction.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const numTotal = parseFloat(totalAmount) || 0;
  const numQty = parseFloat(quantity);
  const numRate = parseFloat(unitPrice);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {transactionToEdit ? 'Edit Transaction' : 'Record Site Expense'}
            </h3>
            <p className="text-[11px] text-slate-400">
              Attach receipt photo and record bill details.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[82vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-lg flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Site Selector & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Site <span className="text-rose-500">*</span>
              </label>
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="" disabled>
                  Select Site
                </option>
                {sites.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Title / Item Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 200 Bags Cement or JCB Rental"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Category & Material Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Material Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Ultratech 53, M-Sand"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Quantity, Unit, Unit Price */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Quantity</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  handleQuantityOrPriceChange(e.target.value, unitPrice);
                }}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-amber-500"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Rate (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => {
                  setUnitPrice(e.target.value);
                  handleQuantityOrPriceChange(quantity, e.target.value);
                }}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Total Amount & Amount Paid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Total Bill Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Amount Paid (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => handleAmountPaidChange(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Discrepancy Alert */}
          <DiscrepancyAlert totalAmount={numTotal} quantity={numQty} unitPrice={numRate} />

          {/* Status & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Supplier / Payee</label>
              <input
                type="text"
                placeholder="e.g. ABC Cement Corp"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Photo Proof Upload */}
          <div className="border-t border-slate-100 pt-2.5">
            <label className="block text-[11px] font-semibold text-slate-800 mb-1">
              Photo Evidence {!transactionToEdit && <span className="text-rose-500">*</span>}
            </label>

            {photoPreview ? (
              <div className="rounded-lg border border-slate-200 p-2 flex items-center justify-between bg-slate-50">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0"
                />
                <div className="flex-1 px-2.5 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{photoFile?.name}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                    <Check className="w-3 h-3 shrink-0" /> Ready
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 shrink-0"
                >
                  <X className="w-4 h-4 shrink-0" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-3.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-amber-500 hover:bg-amber-50/20 transition-colors">
                <UploadCloud className="w-5 h-5 text-amber-600 mb-1 shrink-0" />
                <span className="text-xs font-semibold text-slate-800">
                  Snap or select receipt photo
                </span>
                <span className="text-[10px] text-slate-400">JPEG, PNG, WebP (Max 8MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span>{transactionToEdit ? 'Save' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
