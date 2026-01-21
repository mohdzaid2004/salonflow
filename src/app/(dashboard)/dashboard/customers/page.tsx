'use client';

import { useState, useRef, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MoreHorizontal, Star, Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { collection, query, doc, writeBatch } from 'firebase/firestore';
import type { Customer, Salon } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export default function CustomersPage({}) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const salonId = user?.uid;

  const customersQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/customers`));
  }, [firestore, salonId]);
  
  const salonDocRef = useMemo(() => {
    if (!firestore || !salonId) return null;
    return doc(firestore, 'salons', salonId);
  }, [firestore, salonId]);

  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  const { data: salon, isLoading: isLoadingSalon } = useDoc<Salon>(salonDocRef);
  
  const isLoading = isLoadingCustomers || isLoadingSalon || isUserLoading;
  const showLoyalty = salon?.loyaltyProgramEnabled;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };
  
  const handleDownloadCSV = () => {
    if (!customers || customers.length === 0) {
      return;
    }

    const headers = ['Name', 'Phone', 'Date of Birth', 'Loyalty Points'];
    const csvRows = [headers.join(',')];

    customers.forEach(customer => {
      const row = [
        `"${customer.name}"`,
        `"${customer.phone}"`,
        `"${customer.dob || 'N/A'}"`,
        customer.loyaltyPoints || 0
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'customers.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    if (!firestore || !salonId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot import customers. Not logged in.",
      });
      return;
    }

    const file = event.target.files[0];
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
            throw new Error("The selected file is empty or in an invalid format.");
        }
        
        const batch = writeBatch(firestore);
        const customersRef = collection(firestore, `salons/${salonId}/customers`);
        let customersAdded = 0;

        json.forEach((row) => {
          const name = row.Name || row.name;
          let phone = row.Phone || row.phone || row['Phone Number'];
          let dob = row.DOB || row.dob || row['Date of Birth'];
          
          if (phone) {
              phone = String(phone).replace(/\D/g, ''); // Clean phone number
          }

          if (name && phone && phone.match(/^\d{10}$/)) {
            const newCustomerRef = doc(customersRef);
            batch.set(newCustomerRef, {
              salonId: salonId,
              name: String(name),
              phone: String(phone),
              dob: dob ? new Date(dob).toISOString().split('T')[0] : '', // Basic date handling
              loyaltyPoints: 0,
              visitHistory: [],
            });
            customersAdded++;
          }
        });

        if (customersAdded === 0) {
            throw new Error("No valid customer data found. Please ensure columns are named 'Name' and 'Phone'.");
        }

        await batch.commit();

        toast({
          title: "Import Successful",
          description: `${customersAdded} customers have been successfully imported.`,
        });

      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: error.message || "An error occurred while importing the file.",
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };


  const renderSkeleton = () => {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16" />
        </TableCell>
        {showLoyalty && (
          <TableCell>
            <Skeleton className="h-4 w-12" />
          </TableCell>
        )}
        <TableCell>
          <div className="flex justify-end">
            <Skeleton className="h-8 w-8" />
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="grid flex-1 items-start gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>
                Here is a list of all customers for your salon.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                 <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileImport}
                    accept=".csv, .xls, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />
                 <Button onClick={handleImportClick} size="sm" variant="outline" disabled={isLoading || isImporting}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Import
                </Button>
                <Button onClick={handleDownloadCSV} size="sm" variant="outline" disabled={isLoading || !customers || customers.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                {showLoyalty && <TableHead>Loyalty Points</TableHead>}
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderSkeleton()
              ) : customers && customers.length > 0 ? (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.dob || ''}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.phone}
                    </TableCell>
                    {showLoyalty && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-400" />
                          <span>{customer.loyaltyPoints || 0}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className='flex justify-end'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/customers/${customer.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={showLoyalty ? 4 : 3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No customers found. Use the "Customer Check-in" button to add one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
