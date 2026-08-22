'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import type { Appointment, Salon, Staff, Service, Customer } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

type PageStatus = 'loading' | 'loaded' | 'invalid';

export default function InvoiceClient() {
    const { invoiceId: compositeId } = useParams();
    const firestore = useFirestore();

    const [status, setStatus] = useState<PageStatus>('loading');
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [salon, setSalon] = useState<Salon | null>(null);
    const [staff, setStaff] = useState<Staff | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [customer, setCustomer] = useState<Customer | null>(null);

    const [salonId, appointmentId] = useMemo(() => {
        const id = Array.isArray(compositeId) ? compositeId[0] : compositeId;
        if (!id) return [null, null];
        const parts = id.split('_');
        return parts.length === 2 ? [parts[0], parts[1]] : [null, null];
    }, [compositeId]);

    useEffect(() => {
        if (!firestore || !salonId || !appointmentId) {
            if (compositeId) setStatus('invalid');
            return;
        }

        const fetchData = async () => {
            setStatus('loading');
            try {
                const appointmentDocRef = doc(firestore, `salons/${salonId}/appointments`, appointmentId);
                const appointmentSnap = await getDoc(appointmentDocRef);
                if (!appointmentSnap.exists()) {
                    setStatus('invalid');
                    return;
                }
                const apptData = { id: appointmentSnap.id, ...appointmentSnap.data() } as Appointment;
                setAppointment(apptData);

                const salonDocRef = doc(firestore, 'salons', salonId);
                const staffDocRef = doc(firestore, `salons/${salonId}/staff`, apptData.staffId);

                const [salonSnap, staffSnap] = await Promise.all([
                    getDoc(salonDocRef),
                    getDoc(staffDocRef)
                ]);

                if (!salonSnap.exists() || !staffSnap.exists()) {
                    setStatus('invalid');
                    return;
                }

                setSalon({ id: salonSnap.id, ...salonSnap.data() } as Salon);
                setStaff({ id: staffSnap.id, ...staffSnap.data() } as Staff);
                
                setCustomer({
                    id: apptData.customerId,
                    name: apptData.customerName,
                    phone: apptData.customerPhone,
                } as Customer);

                let fetchedServices: Service[] = [];
                if ((apptData as any).services && (apptData as any).services.length > 0) {
                    fetchedServices = (apptData as any).services;
                } else if (apptData.serviceIds && apptData.serviceIds.length > 0) {
                    const serviceSnaps = await Promise.all(
                        apptData.serviceIds.map(id => getDoc(doc(firestore, `salons/${salonId}/services`, id)))
                    );
                    fetchedServices = serviceSnaps
                        .filter(snap => snap.exists())
                        .map(snap => ({ id: snap.id, ...snap.data() } as Service));
                }
                setServices(fetchedServices);

                setStatus('loaded');
            } catch (error) {
                console.error("Error fetching invoice data:", error);
                setStatus('invalid');
            }
        };

        fetchData();
    }, [firestore, salonId, appointmentId, compositeId]);

    useEffect(() => {
      if (status === 'loaded') {
        const timeoutId = setTimeout(() => window.print(), 500);
        return () => clearTimeout(timeoutId);
      }
    }, [status]);

    const formatCurrency = (amount: number | undefined | null) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
    };
    
    const formatDateSafe = (date: unknown) => {
        if (!date) return 'N/A';
        if (date instanceof Timestamp) {
            return format(date.toDate(), 'PPP');
        }
        try {
            const d = new Date(date as any);
            if (!isNaN(d.getTime())) {
                return format(d, 'PPP');
            }
        } catch (e) {
            // ignore
        }
        return 'Invalid Date';
    }


    if (status === 'loading') {
        return (
            <div className="p-8 max-w-2xl mx-auto"><Skeleton className="h-[800px] w-full" /></div>
        )
    }

    if (status === 'invalid' || !appointment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="p-8 text-center">
                    <h2 className="text-xl font-bold">Invoice Not Found</h2>
                    <p className="text-muted-foreground">The requested invoice could not be found.</p>
                </Card>
            </div>
        );
    }

    const subtotal = appointment.subtotal ?? services.reduce((acc, s) => acc + s.price, 0);
    const pointsRedeemed = appointment.pointsRedeemed || 0;
    const grandTotal = appointment.amountPaid;

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-zinc-50 print:bg-white print:p-0">
             <div className="absolute top-4 right-4 print:hidden flex gap-2">
                <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print / Thermal</Button>
                <Button variant="outline" onClick={() => window.close()}>Close</Button>
             </div>
            <Card className="max-w-2xl mx-auto p-8 shadow-lg print:shadow-none print:border-none print:p-0 bg-white">
                <header className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <Logo className="h-12 w-12 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold font-headline">{salon?.name}</h1>
                            <p className="text-sm text-muted-foreground">{salon?.address}</p>
                            <p className="text-sm text-muted-foreground">Phone: {salon?.phone}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold text-muted-foreground">INVOICE RECEIPT</h2>
                        <p className="text-sm font-mono text-primary font-semibold">#{appointment.id.slice(0, 6).toUpperCase()}</p>
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 mt-1">Verified Online</span>
                    </div>
                </header>
                
                <Separator className="my-6" />

                <section className="flex justify-between items-start text-sm">
                    <div>
                        <h3 className="font-semibold text-muted-foreground">Bill To:</h3>
                        <p className="font-medium">{customer?.name}</p>
                        <p className="text-muted-foreground">{customer?.phone}</p>
                        <p className="text-xs text-muted-foreground font-mono">ID: {customer?.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <p><span className="font-semibold text-muted-foreground">Invoice Date:</span> {formatDateSafe(appointment.date)}</p>
                        <p><span className="font-semibold text-muted-foreground">Billed by:</span> {staff?.name}</p>
                        <p><span className="font-semibold text-muted-foreground">Payment Method:</span> {appointment.paymentMethod}</p>
                    </div>
                </section>
                
                 <section className="mt-8">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-4/5">Service / Item</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {services.map(service => (
                                <TableRow key={service.id}>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(service.price)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </section>

                <Separator className="my-6" />

                <section className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {pointsRedeemed > 0 && (
                            <div className="flex justify-between text-destructive">
                                <span>Discount / Loyalty</span>
                                <span>- {formatCurrency(pointsRedeemed)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t pt-2 text-primary">
                            <span>Grand Total</span>
                            <span>{formatCurrency(grandTotal)}</span>
                        </div>
                    </div>
                </section>
                
                 <Separator className="my-6" />

                <footer className="text-center text-xs text-muted-foreground space-y-2">
                    <p className="font-medium text-sm">Thank you for visiting! Please visit us again.</p>
                    <p className="text-[10px]">TERMS: 1. Services are non-refundable. 2. System generated invoice copy.</p>
                </footer>
            </Card>
        </div>
    );
}
