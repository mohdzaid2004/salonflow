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

export default function InvoicePage() {
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
                const customerDocRef = doc(firestore, `salons/${salonId}/customers`, apptData.customerId);
                
                let servicesSnap;
                if (apptData.serviceIds && apptData.serviceIds.length > 0) {
                    const servicesQuery = query(
                        collection(firestore, `salons/${salonId}/services`),
                        where('__name__', 'in', apptData.serviceIds)
                    );
                    servicesSnap = await getDocs(servicesQuery);
                }
                

                const [salonSnap, staffSnap, customerSnap] = await Promise.all([
                    getDoc(salonDocRef),
                    getDoc(staffDocRef),
                    getDoc(customerDocRef),
                ]);

                if (!salonSnap.exists() || !staffSnap.exists() || !customerSnap.exists()) {
                    setStatus('invalid');
                    return;
                }

                setSalon({ id: salonSnap.id, ...salonSnap.data() } as Salon);
                setStaff({ id: staffSnap.id, ...staffSnap.data() } as Staff);
                setCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer);

                if (servicesSnap) {
                    const fetchedServices = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
                    setServices(fetchedServices);
                }

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


    return (
        <div className="min-h-screen p-4 sm:p-8">
             <div className="absolute top-4 right-4 print:hidden flex gap-2">
                <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                <Button variant="outline" onClick={() => window.close()}>Close</Button>
             </div>
            <Card className="max-w-2xl mx-auto p-8 shadow-lg print:shadow-none print:border-none print:p-0">
                <header className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <Logo className="h-12 w-12 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold font-headline">{salon?.name}</h1>
                            <p className="text-sm text-muted-foreground">{salon?.address}</p>
                            <p className="text-sm text-muted-foreground">{salon?.phone}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold text-muted-foreground">INVOICE</h2>
                        <p className="text-sm">#{appointment.id.slice(0, 6).toUpperCase()}</p>
                    </div>
                </header>
                
                <Separator className="my-6" />

                <section className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold">Bill To</h3>
                        <p>{customer?.name}</p>
                        <p>{customer?.phone}</p>
                    </div>
                    <div className="text-right">
                        <p><span className="font-semibold">Invoice Date:</span> {formatDateSafe(appointment.date)}</p>
                        <p><span className="font-semibold">Billed by:</span> {staff?.name}</p>
                    </div>
                </section>
                
                 <section className="mt-8">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-3/5">Service</TableHead>
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
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {pointsRedeemed > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Points Redeemed</span>
                                <span>- {formatCurrency(pointsRedeemed)}</span>
                            </div>
                        )}
                         <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total Paid</span>
                            <span>{formatCurrency(appointment.amountPaid)}</span>
                        </div>
                    </div>
                </section>
                
                 <Separator className="my-6" />

                <footer className="text-center text-sm text-muted-foreground">
                    <p>Payment Method: {appointment.paymentMethod}</p>
                    <p className="mt-2">Thank you for your business!</p>
                </footer>
            </Card>
        </div>
    )
}
