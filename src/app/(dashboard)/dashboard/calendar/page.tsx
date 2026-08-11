'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, User, Clock, Scissors, Check, Trash2, ShieldAlert, CreditCard, Play } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { CustomerCheckinForm } from '@/components/dashboard/customer-checkin-form';
import { CreateBillForm } from '@/components/dashboard/home/create-bill-form';
import type { Appointment, Staff, Service, Customer, Salon } from '@/lib/data';
import Link from 'next/link';

// Component to handle live countdown session timers
function ActiveSessionTimer({ checkinTime }: { checkinTime: any }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const checkinDate = checkinTime instanceof Timestamp 
      ? checkinTime.toDate() 
      : typeof checkinTime?.toDate === 'function' 
        ? checkinTime.toDate() 
        : checkinTime?.seconds !== undefined
          ? new Date(Number(checkinTime.seconds) * 1000)
          : new Date(checkinTime);

    if (isNaN(checkinDate.getTime())) {
      setElapsed('N/A');
      return;
    }

    const updateTimer = () => {
      const diffMs = Date.now() - checkinDate.getTime();
      if (diffMs <= 0) {
        setElapsed('0m 00s');
        return;
      }
      const totalSecs = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setElapsed(`${mins}m ${String(secs).padStart(2, '0')}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [checkinTime]);

  return (
    <span className="font-mono text-xs flex items-center gap-1 font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
      <Clock className="h-3.5 w-3.5 animate-pulse" /> {elapsed}
    </span>
  );
}

export default function CalendarPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const salonId = user?.uid;

  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [isCheckinOpen, setCheckinOpen] = useState(false);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState<string>('');
  
  // Checkout states
  const [activeCheckoutAppt, setActiveCheckoutAppt] = useState<Appointment | null>(null);
  const [activeCheckoutCustomer, setActiveCheckoutCustomer] = useState<Customer | null>(null);

  const { todayStart, todayEnd } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    return {
      todayStart: Timestamp.fromDate(todayStart),
      todayEnd: Timestamp.fromDate(todayEnd),
    };
  }, []);

  // Fetch collections
  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId, isUserLoading]);
  const { data: salon } = useDoc<Salon>(salonDocRef);

  const appointmentsQuery = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return query(
      collection(firestore, `salons/${salonId}/appointments`),
      where('date', '>=', todayStart),
      where('date', '<=', todayEnd)
    );
  }, [firestore, salonId, todayStart, todayEnd, isUserLoading]);
  const { data: appointments, isLoading: isLoadingAppts } = useCollection<Appointment>(appointmentsQuery);

  const staffQuery = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId, isUserLoading]);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);

  const servicesQuery = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return query(collection(firestore, `salons/${salonId}/services`));
  }, [firestore, salonId, isUserLoading]);
  const { data: services } = useCollection<Service>(servicesQuery);

  // Time Slot list (30 mins slots from 9:00 AM to 9:00 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    let current = new Date();
    current.setHours(9, 0, 0, 0);
    const end = new Date();
    end.setHours(21, 0, 0, 0);
    
    while (current < end) {
      slots.push(format(current, 'hh:mm a'));
      current = new Date(current.getTime() + 30 * 60 * 1000);
    }
    return slots;
  }, []);

  const getApptTimeStr = (date: any): string => {
    if (!date) return '';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return isNaN(d.getTime()) ? '' : format(d, 'hh:mm a');
  };

  // Maps slots to appointments
  const slotAppointments = useMemo(() => {
    if (!appointments) return new Map<string, Appointment[]>();
    const map = new Map<string, Appointment[]>();
    
    appointments.forEach(appt => {
      if (appt.status === 'cancelled') return;
      const timeStr = getApptTimeStr(appt.date);
      if (timeStr) {
        const list = map.get(timeStr) || [];
        list.push(appt);
        map.set(timeStr, list);
      }
    });
    return map;
  }, [appointments]);

  const getInitials = (name: string = '') => name.split(' ').map(n => n[0]).join('');
  const getStaffName = (id: string) => staff?.find(s => s.id === id)?.name || 'N/A';
  const getServiceListStr = (ids: string[]) => ids.map(id => services?.find(s => s.id === id)?.name).filter(Boolean).join(', ') || 'Service(s)';

  // Action methods
  const handleCheckIn = async (apptId: string) => {
    if (!firestore || !salonId) return;
    try {
      const docRef = doc(firestore, `salons/${salonId}/appointments`, apptId);
      await updateDoc(docRef, {
        status: 'active',
        checkinTime: Timestamp.now()
      });
      toast({
        title: "Checked In!",
        description: "Customer session is now active.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: "Could not start session. Please try again.",
      });
    }
  };

  const handleCancel = async (apptId: string) => {
    if (!firestore || !salonId) return;
    try {
      const docRef = doc(firestore, `salons/${salonId}/appointments`, apptId);
      await updateDoc(docRef, {
        status: 'cancelled'
      });
      toast({
        title: "Cancelled",
        description: "Appointment cancelled successfully.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Cancellation failed",
        description: "Could not cancel appointment. Please try again.",
      });
    }
  };

  const handleCheckoutClick = async (appt: Appointment) => {
    if (!firestore || !salonId) return;
    try {
      // Fetch customer doc to load points
      const custRef = doc(firestore, `salons/${salonId}/customers`, appt.customerId);
      const custSnap = await getDocs(query(collection(firestore, `salons/${salonId}/customers`), where('__name__', '==', appt.customerId), limit(1)));
      
      let customerObj: Customer = {
        id: appt.customerId,
        salonId,
        name: appt.customerName,
        phone: appt.customerPhone,
        visitHistory: [],
        loyaltyPoints: 0
      };
      
      if (!custSnap.empty) {
        customerObj = { id: custSnap.docs[0].id, ...custSnap.docs[0].data() } as Customer;
      }
      
      setActiveCheckoutAppt(appt);
      setActiveCheckoutCustomer(customerObj);
      setCheckoutOpen(true);
    } catch (err) {
      console.error("Error setting checkout context:", err);
    }
  };

  const handleOpenBookWalkin = (slotStr: string) => {
    setPrefilledTime(slotStr);
    setCheckinOpen(true);
  };

  const filteredSlots = useMemo(() => {
    return timeSlots.map(slot => {
      let appts = slotAppointments.get(slot) || [];
      if (selectedStaffId !== 'all') {
        appts = appts.filter(a => a.staffId === selectedStaffId);
      }
      return { slot, appointments: appts };
    });
  }, [timeSlots, slotAppointments, selectedStaffId]);

  const isLoading = isLoadingAppts || isLoadingStaff;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-50 border p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" /> Today's Lobby Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time walk-in lobby, active appointments, and checkout manager.
          </p>
        </div>
        
        {staff && staff.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm font-semibold shrink-0">Filter Staff:</span>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Slots Agenda Grid */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : (
          filteredSlots.map(({ slot, appointments: slotAppts }) => {
            const hasAppt = slotAppts.length > 0;
            return (
              <div 
                key={slot} 
                className={`flex flex-col md:flex-row border rounded-xl overflow-hidden transition-all duration-200 ${
                  hasAppt 
                    ? slotAppts[0].status === 'active' 
                      ? 'border-green-300 bg-green-50/20' 
                      : slotAppts[0].status === 'completed'
                        ? 'border-gray-200 bg-zinc-50/50'
                        : 'border-blue-300 bg-blue-50/10' 
                    : 'border-dashed border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                {/* Time Indicator */}
                <div className="w-full md:w-32 bg-zinc-100/80 px-4 py-3 flex md:flex-col items-center justify-between md:justify-center border-b md:border-b-0 md:border-r text-center shrink-0">
                  <span className="font-mono text-sm font-bold text-gray-700">{slot}</span>
                  {!hasAppt && <Badge variant="outline" className="text-[10px] md:mt-1 bg-white">Empty</Badge>}
                  {hasAppt && (
                    <Badge 
                      className={`text-[10px] md:mt-1 font-semibold ${
                        slotAppts[0].status === 'active' 
                          ? 'bg-green-600 text-white' 
                          : slotAppts[0].status === 'completed'
                            ? 'bg-gray-500 text-white'
                            : 'bg-blue-600 text-white'
                      }`}
                    >
                      {slotAppts[0].status.toUpperCase()}
                    </Badge>
                  )}
                </div>

                {/* Appointment Card Context */}
                <div className="flex-1 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {hasAppt ? (
                    slotAppts.map(appt => (
                      <div key={appt.id} className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10 border border-muted-foreground/20">
                            <AvatarFallback>{getInitials(appt.customerName)}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm">{appt.customerName}</h3>
                              <span className="text-xs text-muted-foreground font-mono">({appt.customerPhone})</span>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Scissors className="h-3 w-3" /> {getServiceListStr(appt.serviceIds)}
                            </p>
                            <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                              <User className="h-3 w-3" /> Assigned: {getStaffName(appt.staffId)}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          {appt.status === 'active' && (
                            <>
                              <ActiveSessionTimer checkinTime={(appt as any).checkinTime} />
                              <Button 
                                size="sm" 
                                className="bg-primary hover:bg-primary/90 text-xs py-1"
                                onClick={() => handleCheckoutClick(appt)}
                              >
                                <CreditCard className="h-3.5 w-3.5 mr-1" /> Checkout
                              </Button>
                            </>
                          )}

                          {appt.status === 'booked' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-green-600 text-green-700 hover:bg-green-50 text-xs py-1"
                                onClick={() => handleCheckIn(appt.id)}
                              >
                                <Play className="h-3.5 w-3.5 mr-1" /> Check In
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-destructive hover:bg-red-50 text-xs py-1"
                                onClick={() => handleCancel(appt.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Cancel
                              </Button>
                            </>
                          )}

                          {appt.status === 'completed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs py-1"
                              asChild
                            >
                              <Link href={`/invoice/${salonId}_${appt.id}`} target="_blank">
                                <Check className="h-3.5 w-3.5 mr-1 text-green-600" /> View Invoice
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="w-full flex justify-between items-center">
                      <span className="text-sm text-muted-foreground italic">Slot available for bookings</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs py-1 flex items-center gap-1 border-dashed hover:border-solid border-primary text-primary hover:bg-primary/5"
                        onClick={() => handleOpenBookWalkin(slot)}
                      >
                        + Book Walk-in
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Walk-in Booking Check-in Dialog */}
      <Dialog open={isCheckinOpen} onOpenChange={setCheckinOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Walk-in Check-in</DialogTitle>
            <DialogDescription>
              Book an appointment slot for the lobby lobby queue.
            </DialogDescription>
          </DialogHeader>
          {staff && services && (
            <CustomerCheckinForm 
              staff={staff} 
              services={services} 
              setOpen={setCheckinOpen} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout / Create Bill Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Checkout & Billing</DialogTitle>
            <DialogDescription>
              Calculate service prices, redeem loyalty points, and record invoice payments.
            </DialogDescription>
          </DialogHeader>
          {activeCheckoutCustomer && activeCheckoutAppt && staff && services && (
            <CreateBillForm
              customer={activeCheckoutCustomer}
              services={services}
              staff={staff}
              salon={salon}
              appointment={activeCheckoutAppt}
              setOpen={setCheckoutOpen}
              onBillCreated={() => {
                setCheckoutOpen(false);
                toast({
                  title: "Billing Complete",
                  description: "Invoice generated and whatsapp notification sent.",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
