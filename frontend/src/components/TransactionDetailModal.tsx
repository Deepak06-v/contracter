import React, { useState, useEffect } from 'react';
import { Transaction, transactionApi } from '../api/transactionApi';
import { formatINR, formatDate } from '../utils/formatters';
import { X, Calendar, MapPin, User, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { DiscrepancyAlert } from './DiscrepancyAlert';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tx: Transaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  useEffect(() => {
    if (!transaction || !isOpen) {
      setImageUrl(null);
      return;
    }

    let active = true;
    setImageLoading(true);
    setImageError(false);

    transactionApi
      .getPhotoBlob(transaction._id)
      .then((blobUrl) => {
        if (active) {
          setImageUrl(blobUrl);
          setImageLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load transaction photo', err);
        if (active) {
          setImageError(true);
          setImageLoading(false);
        }
      });

    return () => {
      active = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const outstanding = Math.max(0, transaction.totalAmount - transaction.amountPaid);

  const statusBadgeStyles = {
    Paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'Partially Paid': 'bg-amber-50 text-amber-800 border-amber-200',
    Unpaid: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                {transaction.category}
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                  statusBadgeStyles[transaction.paymentStatus] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {transaction.paymentStatus}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {transaction.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 text-xs text-center">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Total</span>
              <p className="text-sm font-bold text-slate-900 tabular-nums">
                {formatINR(transaction.totalAmount)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Paid</span>
              <p className="text-sm font-semibold text-emerald-700 tabular-nums">
                {formatINR(transaction.amountPaid)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Due</span>
              <p
                className={`text-sm font-semibold tabular-nums ${
                  outstanding > 0 ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                {formatINR(outstanding)}
              </p>
            </div>
          </div>

          {/* Discrepancy Alert */}
          <DiscrepancyAlert
            totalAmount={transaction.totalAmount}
            quantity={transaction.quantity}
            unitPrice={transaction.unitPrice}
          />

          {/* Metadata list */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-900">{transaction.site?.name}</span>
              {transaction.site?.code && (
                <span className="text-[10px] text-slate-400">({transaction.site.code})</span>
              )}
            </div>

            <div className="flex items-center gap-4 text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formatDate(transaction.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{transaction.createdBy?.name || 'Agent'}</span>
              </div>
            </div>

            {transaction.materialName && (
              <div className="text-slate-600">
                <span className="text-slate-400">Item: </span>
                <span className="font-medium text-slate-800">{transaction.materialName}</span>
                {transaction.quantity && (
                  <span className="ml-2 text-slate-500">
                    ({transaction.quantity} {transaction.unit || 'units'}{' '}
                    {transaction.unitPrice ? `@ ${formatINR(transaction.unitPrice)}` : ''})
                  </span>
                )}
              </div>
            )}

            {transaction.supplier && (
              <div className="text-slate-600">
                <span className="text-slate-400">Supplier: </span>
                <span className="font-medium text-slate-800">{transaction.supplier}</span>
              </div>
            )}

            {transaction.notes && (
              <div className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-600 flex items-start gap-1.5">
                <FileText className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                <span>{transaction.notes}</span>
              </div>
            )}
          </div>

          {/* Photo Proof */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-800">Photo Proof</span>
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-800 hover:text-amber-900 font-medium inline-flex items-center gap-1 shrink-0"
                >
                  <span>Open Full Image</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center min-h-[160px] max-h-[300px]">
              {imageLoading && (
                <div className="py-8 flex flex-col items-center gap-1 text-slate-400 text-xs">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Loading proof...</span>
                </div>
              )}

              {imageError && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40 shrink-0" />
                  <p>Photo could not be loaded</p>
                </div>
              )}

              {imageUrl && !imageLoading && (
                <img
                  src={imageUrl}
                  alt={transaction.title}
                  onClick={() => setIsZoomed(!isZoomed)}
                  className={`w-full max-h-[300px] object-contain cursor-pointer transition-transform duration-150 ${
                    isZoomed ? 'scale-125' : 'hover:scale-[1.01]'
                  }`}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-lg shadow-xs transition-colors shrink-0"
            >
              Edit Transaction
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
