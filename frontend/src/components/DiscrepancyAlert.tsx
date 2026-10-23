import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface DiscrepancyAlertProps {
  totalAmount: number;
  quantity?: number;
  unitPrice?: number;
}

export const DiscrepancyAlert: React.FC<DiscrepancyAlertProps> = ({
  totalAmount,
  quantity,
  unitPrice,
}) => {
  if (!quantity || !unitPrice || quantity <= 0 || unitPrice <= 0) {
    return null;
  }

  const calculated = Math.round(quantity * unitPrice * 100) / 100;
  const diff = Math.round(Math.abs(totalAmount - calculated) * 100) / 100;

  if (diff < 0.01) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="font-semibold">Calculation note: </span>
        {quantity} × {formatINR(unitPrice)} = <strong className="tabular-nums">{formatINR(calculated)}</strong>, but bill total is <strong className="tabular-nums">{formatINR(totalAmount)}</strong> (diff: {formatINR(diff)}).
        <p className="mt-0.5 text-[11px] text-amber-800">
          Allowed for bills with freight or taxes, but flagged for contractor review.
        </p>
      </div>
    </div>
  );
};
