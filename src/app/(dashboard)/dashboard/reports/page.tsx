'use client';

import { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  IndianRupee, 
  Users, 
  Scissors, 
  Crown, 
  Sparkles, 
  FileText,
  PieChart as PieIcon,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useToast } from '@/hooks/use-toast';

const MONTHLY_PERFORMANCE = [
  { month: 'Mar', revenue: 185000, appointments: 190, profit: 92000 },
  { month: 'Apr', revenue: 210000, appointments: 220, profit: 105000 },
  { month: 'May', revenue: 198000, appointments: 205, profit: 99000 },
  { month: 'Jun', revenue: 245000, appointments: 260, profit: 124000 },
  { month: 'Jul', revenue: 220000, appointments: 235, profit: 110000 },
  { month: 'Aug', revenue: 248600, appointments: 270, profit: 132000 },
];

const CATEGORY_DISTRIBUTION = [
  { name: 'Hair Services', value: 48, color: '#7C3AED' },
  { name: 'Facial & Skin', value: 24, color: '#A855F7' },
  { name: 'Hair Color', value: 16, color: '#EC4899' },
  { name: 'Bridal & Makeup', value: 8, color: '#3B82F6' },
  { name: 'Spa Therapies', value: 4, color: '#10B981' },
];

const STYLIST_LEADERBOARD = [
  { name: 'Rahul Sharma', role: 'Senior Stylist', bookings: 68, revenue: 94200, commission: 18840, rating: 4.9 },
  { name: 'Pooja Nair', role: 'Skin & Facial Lead', bookings: 54, revenue: 76500, commission: 15300, rating: 4.8 },
  { name: 'Suresh Kumar', role: 'Hair Stylist', bookings: 82, revenue: 58400, commission: 11680, rating: 4.7 },
  { name: 'Imran Khan', role: 'Stylist', bookings: 38, revenue: 42100, commission: 8420, rating: 4.8 },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('This Month');
  const { toast } = useToast();

  const handleExportPDF = () => {
    toast({ title: 'Generating PDF', description: 'Your business analytics report is downloading...' });
  };

  const handleExportCSV = () => {
    toast({ title: 'Export Complete', description: 'Financial CSV sheet has been generated.' });
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Comprehensive financial insights, staff productivity, service contribution, and client retention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            {['This Week', 'This Month', 'Quarterly', 'Yearly'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  dateRange === r
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Gross Collections</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">₹2,48,600</div>
          <span className="text-[10px] text-emerald-600 font-medium">+14.2% vs last period</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Net Estimated Profit</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">₹1,32,000</div>
          <span className="text-[10px] text-purple-600 font-medium">53% operating margin</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Avg Ticket Size</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">₹1,420</div>
          <span className="text-[10px] text-slate-400 font-medium">Per salon visit</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Repeat Client Rate</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">74.8%</div>
          <span className="text-[10px] text-emerald-600 font-medium">High customer retention</span>
        </div>
      </div>

      {/* 2 Main Visual Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Revenue & Profit Area Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue & Profit Trajectory</h2>
              <p className="text-xs text-slate-400 mt-0.5">6-Month historical performance and cash flow</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-purple-700"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Revenue</span>
              <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Profit</span>
            </div>
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_PERFORMANCE} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution Pie Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Service Share</h2>
            <p className="text-xs text-slate-400 mt-0.5">Revenue breakdown by category</p>
          </div>

          <div className="w-full h-48 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, 'Share']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Pie
                  data={CATEGORY_DISTRIBUTION}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {CATEGORY_DISTRIBUTION.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
            {CATEGORY_DISTRIBUTION.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Staff Commission Leaderboard Table */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Stylist Performance & Commission Leaderboard</h2>
          <p className="text-xs text-slate-400">Total bookings completed, gross revenue delivered, and commission payout</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Stylist</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Completed Bookings</th>
                <th className="pb-3">Revenue Delivered</th>
                <th className="pb-3">Commission (20%)</th>
                <th className="pb-3 text-right pr-1">Client Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {STYLIST_LEADERBOARD.map((stf) => (
                <tr key={stf.name} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 pl-1 font-bold text-slate-900">{stf.name}</td>
                  <td className="py-3.5 text-slate-500 font-medium">{stf.role}</td>
                  <td className="py-3.5 font-bold text-slate-800">{stf.bookings} bookings</td>
                  <td className="py-3.5 font-bold text-slate-900">₹{stf.revenue.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 font-bold text-purple-700">₹{stf.commission.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 text-right pr-1 font-bold text-amber-500">★ {stf.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
