'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Appointment, Service } from '@/lib/data';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
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
  Tooltip
} from 'recharts';
import { 
  IndianRupee, 
  Calendar, 
  TrendingUp, 
  ChevronDown, 
  FileText, 
  Search, 
  Info 
} from 'lucide-react';

const COLORS = [
  '#7C3AED',
  '#A855F7',
  '#EC4899',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
];

export default function OverviewPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const salonId = user?.uid;

  const [serviceFilter, setServiceFilter] = useState('This Month');
  const [revenueFilter, setRevenueFilter] = useState('This Week');

  // Timestamps memoized
  const { monthStartTimestamp, sevenDaysAgoTimestamp } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    return {
      monthStartTimestamp: Timestamp.fromDate(monthStart),
      sevenDaysAgoTimestamp: Timestamp.fromDate(sevenDaysAgo),
    };
  }, []);

  const appointmentsQuery = useMemo(() => {
    if (!salonId || !firestore || isUserLoading) return null;
    return query(
      collection(firestore, `salons/${salonId}/appointments`),
      where('status', '==', 'completed')
    );
  }, [salonId, firestore, isUserLoading]);

  const servicesQuery = useMemo(() => {
    if (!salonId || !firestore || isUserLoading) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [salonId, firestore, isUserLoading]);

  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesQuery);

  const getApptDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date.toDate === 'function') return date.toDate();
    if (date.seconds !== undefined) return new Date(Number(date.seconds) * 1000);
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  };

  const todaysAppointments = useMemo(() => {
    if (!appointments) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter(appt => {
      const apptDate = getApptDate(appt.date);
      if (!apptDate) return false;
      return apptDate >= today && apptDate < tomorrow;
    });
  }, [appointments]);

  const monthlyAppointments = useMemo(() => {
    if (!appointments) return [];
    const monthStart = monthStartTimestamp.toDate();
    return appointments.filter(appt => {
      const apptDate = getApptDate(appt.date);
      if (!apptDate) return false;
      return apptDate >= monthStart;
    });
  }, [appointments, monthStartTimestamp]);

  const todaysStats = useMemo(() => {
    if (!todaysAppointments) {
      return { totalRevenue: 0, completedAppointments: 0 };
    }
    const completedAppointments = todaysAppointments.length;
    const totalRevenue = todaysAppointments.reduce((acc, appt) => acc + (appt.amountPaid || 0), 0);
    return { totalRevenue, completedAppointments };
  }, [todaysAppointments]);

  const monthlyStats = useMemo(() => {
    if (!monthlyAppointments) {
      return { totalRevenue: 0 };
    }
    const totalRevenue = monthlyAppointments.reduce((acc, appt) => acc + (appt.amountPaid || 0), 0);
    return { totalRevenue };
  }, [monthlyAppointments]);
  
  const revenueByService = useMemo(() => {
    if (!monthlyAppointments || !services || monthlyAppointments.length === 0) return [];
    
    const serviceMap = new Map(services.map(s => [s.id, { name: s.name, price: s.price }]));
    const revenueMap = new Map<string, number>();

    monthlyAppointments.forEach(appt => {
      if (appt.serviceIds && appt.serviceIds.length > 0) {
        const revenuePerService = (appt.amountPaid || 0) / appt.serviceIds.length;
        appt.serviceIds.forEach(serviceId => {
          const service = serviceMap.get(serviceId);
          if (service) {
            const currentRevenue = revenueMap.get(service.name) || 0;
            revenueMap.set(service.name, currentRevenue + revenuePerService);
          }
        });
      }
    });

    return Array.from(revenueMap.entries()).map(([name, value]) => ({ name, value }));
  }, [monthlyAppointments, services]);
  
  const last7DaysRevenue = useMemo(() => {
    const sevenDaysAgo = sevenDaysAgoTimestamp.toDate();
    const days: { name: string; revenue: number }[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ name: dateString, revenue: 0 });
    }

    if (!appointments || appointments.length === 0) {
      return days;
    }

    const last7DaysAppointments = appointments.filter(appt => {
      const apptDate = getApptDate(appt.date);
      if (!apptDate) return false;
      return apptDate >= sevenDaysAgo;
    });
    
    const revenueMap = new Map<string, number>();
    days.forEach(d => revenueMap.set(d.name, 0));

    last7DaysAppointments.forEach(appt => {
      const apptDate = getApptDate(appt.date);
      if (!apptDate) return;
      const dateString = apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const current = revenueMap.get(dateString) || 0;
      revenueMap.set(dateString, current + (appt.amountPaid || 0));
    });
    
    return Array.from(revenueMap.entries()).map(([name, revenue]) => ({ name, revenue }));
  }, [appointments, sevenDaysAgoTimestamp]);

  const has7DaysData = useMemo(() => {
    return last7DaysRevenue.some(d => d.revenue > 0);
  }, [last7DaysRevenue]);

  const currentMonthLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const isLoading = isUserLoading || isLoadingAppointments || isLoadingServices;
  const adminDisplayName = user?.displayName || 'Admin';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-5 h-96 rounded-3xl" />
          <Skeleton className="lg:col-span-7 h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Overview
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Welcome back, {adminDisplayName}! Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* 3 Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Today's Revenue */}
        <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="h-14 w-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            <span className="font-serif text-2xl font-bold">₹</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-500 truncate">Today&apos;s Revenue</span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="w-2.5 h-2.5" /> 0%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
              ₹{todaysStats.totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">0% vs yesterday</p>
          </div>
        </div>

        {/* Card 2: This Month's Revenue */}
        <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <span className="font-serif text-2xl font-bold">₹</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-500 truncate">This Month&apos;s Revenue</span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="w-2.5 h-2.5" /> 0%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
              ₹{monthlyStats.totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">0% vs last month</p>
          </div>
        </div>

        {/* Card 3: Appointments */}
        <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="h-14 w-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-500 truncate">Appointments</span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="w-2.5 h-2.5" /> 0%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
              +{todaysStats.completedAppointments}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Completed today</p>
          </div>
        </div>

      </div>

      {/* 2 Bottom Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Card: Revenue by Service */}
        <div className="lg:col-span-5 bg-white rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[380px]">
          
          {/* Card Top */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue by Service</h2>
              <p className="text-xs text-slate-400 mt-0.5">{currentMonthLabel}</p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50">
              <span>{serviceFilter}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          {/* Card Body / Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            {revenueByService.length > 0 ? (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Pie
                      data={revenueByService}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {revenueByService.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center max-w-xs">
                <div className="relative mb-4">
                  <div className="h-20 w-20 rounded-full bg-purple-50/80 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                    <FileText className="w-9 h-9 text-purple-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  No revenue data for this month yet
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Once you have transactions, the revenue by service will appear here.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Card: Last 7 Days Revenue */}
        <div className="lg:col-span-7 bg-white rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[380px]">
          
          {/* Card Top */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Last 7 Days Revenue</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                A bar graph showing total revenue per day for the last week.
              </p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50">
              <span>{revenueFilter}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          {/* Card Body / Chart Area */}
          <div className="flex-1 relative flex flex-col justify-end w-full pt-4">
            
            {/* Chart Grid */}
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7DaysRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickFormatter={(val) => `₹${val}`}
                    domain={[0, (dataMax: number) => (dataMax > 0 ? dataMax * 1.2 : 1)]}
                  />
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#7C3AED" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Empty Notification Overlay if no revenue in 7 days */}
            {!has7DaysData && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl px-5 py-3 shadow-md flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">No data to display</h4>
                    <p className="text-[11px] text-slate-500">No revenue recorded for this period.</p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
