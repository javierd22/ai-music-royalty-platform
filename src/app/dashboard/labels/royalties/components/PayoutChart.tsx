'use client';

/**
 * Payout Chart Component
 *
 * Visualizes payouts over time using recharts
 * Per PRD Section 9: Clear, accessible visualizations
 */

import { formatCurrency } from '@/lib/format';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PayoutChartProps {
  data: Array<{ date: string; amount: number }>;
}

export default function PayoutChart({ data }: PayoutChartProps) {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6'>
      <h2 className='text-lg font-semibold text-gray-900 mb-6'>Payouts Over Time</h2>

      {data.length === 0 ? (
        <div className='h-64 flex items-center justify-center text-gray-500'>
          No payout data available
        </div>
      ) : (
        <ResponsiveContainer width='100%' height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
            <XAxis
              dataKey='date'
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={value => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={value => `$${(value / 100).toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Payout']}
              labelFormatter={label => `Date: ${label}`}
            />
            <Line
              type='monotone'
              dataKey='amount'
              stroke='#111827'
              strokeWidth={2}
              dot={{ fill: '#111827', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
