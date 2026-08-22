'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Appointment, Service } from '@/lib/data';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area
} from 'recharts';
import { 
  IndianRupee, 
  Calendar, 
  TrendingUp, 
  ChevronDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Scissors, 
  ArrowUpRight,
  UserCheck,
  CreditCard,
  Sparkles,
  Plus
} from 'lucide-react';

const SERVICE_COLORS = [
  '#7C3AED', // Hair
  '#A855F7', // Facial
  '#EC4899', // Skin Care
  '#3B82F6', // Spa
  '#10B981', // Hair Color
  '#F59E0B', // Makeup
];

// Sample realistic salon chart data
const REVENUE_TREND_DATA = [
  { name: 'Mon', revenue: 9800, appointments: 18 },
  { name: 'Tue', revenue: 14200, appointments: 26 },
  { name: 'Wed', revenue: 11500, appointments: 22 },
  { name: 'Thu', revenue: 16800, appointments: 30 },
  { name: 'Fri', revenue: 21400, appointments: 38 },
  { name: 'Sat', revenue: 28900, appointments: 46 },
  { name: 'Sun', revenue: 24500, appointments: 42 },
];

const DEFAULT_SERVICE_DATA = [
  { name: 'Haircut & Styling', value: 42000 },
  { name: 'Keratin Treatment', value: 68000 },
  { name: 'Hydra Facial', value: 38500 },
  { name: 'Balayage & Color', value: 52000 },
  { name: 'Bridal Makeup', value: 32000 },
  { name: 'Aroma Spa', value: 16100 },
];

const SAMPLE_TODAY_APPOINTMENTS = [
  { id: '1', customer: 'Ananya Verma', phone: '+91 98234 11209', service: 'Keratin Smooth Treatment', stylist: 'Rahul Sharma', time: '11:30 AM', duration: '90 min', amount: '₹4,500', status: 'In Progress', payment: 'Paid' },
  { id: '2', customer: 'Vikram Mehta', phone: '+91 98450 77123', service: 'Executive Haircut & Beard', stylist: 'Suresh Kumar', time: '12:00 PM', duration: '45 min', amount: '₹950', status: 'Confirmed', payment: 'Pending' },
  { id: '3', customer: 'Priya Sundaram', phone: '+91 97112 44901', service: 'Hydra Glow Facial', stylist: 'Pooja Nair', time: '01:15 PM', duration: '60 min', amount: '₹2,800', status: 'Confirmed', payment: 'Paid' },
  { id: '4', customer: 'Rohan Gupta', phone: '+91 99018 33219', service: 'Deep Hair Spa & Scalp Therapy', stylist: 'Rahul Sharma', time: '02:00 PM', duration: '50 min', amount: '₹1,600', status: 'Pending', payment: 'Pending' },
  { id: '5', customer: 'Kavita Patel', phone: '+91 98765 43210', service: 'Global Highlights & Gloss', stylist: 'Suresh Kumar', time: '03:30 PM', duration: '120 min', amount: '₹6,200', status: 'Confirmed', payment: 'Paid' },
];

export default function OverviewPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const salonId = user?.uid;

  const [serviceFilter, setServiceFilter] = useState('This Month');
  const [revenueFilter, setRevenueFilter] = useState('This Week');

  const displayName = user?.displayName || 'Mohammed Zaid';

  return (
    <div className="space-y-6 select-none">
      
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Welcome back, <span className="font-semibold text-slate-800">{displayName}</span>. Here&apos;s what&apos;s happening today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/appointments?new=true"
            title="Press N to create a new booking"
            className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
            <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-medium text-white/90">
              N
            </span>
          </Link>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all"
          >
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span>Create Bill</span>
          </Link>
        </div>
      </div>

      {/* 4 Realistic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Today's Revenue */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500">Today&apos;s Revenue</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-2.5 h-2.5" /> +18.4%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            ₹12,450
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">from yesterday (₹10,510)</p>
        </div>

        {/* Card 2: This Month's Revenue */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500">This Month&apos;s Revenue</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-2.5 h-2.5" /> +12.8%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            ₹2,48,600
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">from last month (₹2,20,400)</p>
        </div>

        {/* Card 3: Today's Appointments */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500">Today&apos;s Appointments</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
              <Calendar className="w-2.5 h-2.5" /> +6 new
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            24
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">18 completed, 6 upcoming</p>
        </div>

        {/* Card 4: Pending Payments */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition-all">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500">Pending Payments</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
              <AlertCircle className="w-2.5 h-2.5" /> 8 Invoices
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            ₹18,750
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">8 invoices awaiting settlement</p>
        </div>

      </div>

      {/* 2 Main Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Card: Revenue Trend Bar Chart */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Total daily collections and appointment load</p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs">
              <span>{revenueFilter}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#7C3AED" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Card: Revenue by Service Donut Chart */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue by Service</h2>
              <p className="text-xs text-slate-400 mt-0.5">Top contributing service categories</p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs">
              <span>{serviceFilter}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          <div className="w-full h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip 
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Pie
                  data={DEFAULT_SERVICE_DATA}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {DEFAULT_SERVICE_DATA.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
              <span className="text-base font-extrabold text-slate-900">₹2.48L</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
            {DEFAULT_SERVICE_DATA.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SERVICE_COLORS[idx] }} />
                <span className="text-slate-600 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Section: Today's Live Appointments & Quick Operations */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Today&apos;s Appointments</h2>
            <p className="text-xs text-slate-400">Live booking timeline and client arrivals for today</p>
          </div>
          <Link
            href="/dashboard/appointments"
            className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline"
          >
            <span>View All Bookings</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Client</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Stylist</th>
                <th className="pb-3">Time</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {SAMPLE_TODAY_APPOINTMENTS.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pl-1">
                    <div className="font-semibold text-slate-900">{appt.customer}</div>
                    <div className="text-[11px] text-slate-400">{appt.phone}</div>
                  </td>
                  <td className="py-3">
                    <span className="font-medium">{appt.service}</span>
                    <span className="block text-[11px] text-slate-400">{appt.duration}</span>
                  </td>
                  <td className="py-3 font-medium text-slate-800">{appt.stylist}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                      <Clock className="w-3 h-3 text-purple-600" />
                      {appt.time}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-slate-900">{appt.amount}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      appt.status === 'In Progress' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : appt.status === 'Confirmed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-1">
                    <span className={`font-semibold text-[11px] ${appt.payment === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {appt.payment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
