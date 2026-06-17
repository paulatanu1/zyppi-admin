import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS: Record<string, string> = {
  pending: '#f59e0b', confirmed: '#3b82f6', driverArriving: '#06b6d4',
  arrived: '#0ea5e9', inProgress: '#6366f1', completed: '#10b981',
  cancelled: '#ef4444', rejected: '#f43f5e', expired: '#9ca3af',
};

interface Props {
  data: { status: string; value: number }[];
  loading?: boolean;
}

export function StatusDonut({ data, loading }: Props) {
  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-gray-100" />;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="status" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
          {data.map(entry => (
            <Cell key={entry.status} fill={COLORS[entry.status] ?? '#e5e7eb'} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number, name: string) => [v, name]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
