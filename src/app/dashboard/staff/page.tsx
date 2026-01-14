'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, PlusCircle, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { collection, query, doc } from 'firebase/firestore';
import type { Staff, Review } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useHeaderActions } from '@/components/dashboard/header-actions-context';
import { AddStaffForm } from '@/components/dashboard/staff/add-staff-form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function StaffPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { setActions } = useHeaderActions();
  const { toast } = useToast();

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  useEffect(() => {
    setActions(
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add a New Staff Member</DialogTitle>
          </DialogHeader>
          <AddStaffForm setOpen={setAddDialogOpen} />
        </DialogContent>
      </Dialog>
    );
    // Cleanup on unmount
    return () => setActions(null);
  }, [setActions, isAddDialogOpen]);

  const salonId = user?.uid;

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/staff`));
  }, [firestore, salonId]);
  
  const reviewsQuery = useMemoFirebase(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/reviews`));
  }, [firestore, salonId]);

  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffQuery);
  const { data: reviews, isLoading: isLoadingReviews } = useCollection<Review>(reviewsQuery);
  
  const staffWithReviews = useMemo(() => {
    if (!staff || !reviews) return [];
    
    const reviewMap = new Map<string, { totalRating: number, count: number }>();
    
    reviews.forEach(review => {
      const existing = reviewMap.get(review.staffId) || { totalRating: 0, count: 0 };
      existing.totalRating += review.rating;
      existing.count += 1;
      reviewMap.set(review.staffId, existing);
    });

    return staff.map(s => {
      const reviewData = reviewMap.get(s.id);
      return {
        ...s,
        reviewCount: reviewData?.count || 0,
        averageRating: reviewData ? (reviewData.totalRating / reviewData.count) : 0,
      }
    });

  }, [staff, reviews]);


  const handleDeleteClick = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = () => {
    if (!selectedStaff || !firestore || !salonId) return;
    
    const staffDocRef = doc(firestore, `salons/${salonId}/staff`, selectedStaff.id);
    deleteDocumentNonBlocking(staffDocRef);

    toast({
      title: "Staff Deleted",
      description: `${selectedStaff.name} has been removed.`,
    });

    setDeleteDialogOpen(false);
    setSelectedStaff(null);
  }


  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const renderSkeleton = () => {
    return Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </TableCell>
        <TableCell>
            <Skeleton className="h-4 w-24" />
        </TableCell>
        <TableCell>
          <div className="flex justify-end">
            <Skeleton className="h-8 w-8" />
          </div>
        </TableCell>
      </TableRow>
    ));
  };
  
  const isLoading = isLoadingStaff || isLoadingReviews || isUserLoading;

  return (
    <>
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>
            Manage your team of stylists and professionals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Avg. Rating</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                renderSkeleton()
              ) : staffWithReviews && staffWithReviews.length > 0 ? (
                staffWithReviews.map((staffMember) => (
                  <TableRow key={staffMember.id}>
                    <TableCell>
                      <Link href={`/dashboard/staff/${staffMember.id}`} className="flex items-center gap-4 group">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(staffMember.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium group-hover:underline">{staffMember.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                        {staffMember.reviewCount > 0 ? (
                            <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                <span className="font-medium">{staffMember.averageRating.toFixed(1)}</span>
                                <span className="text-sm text-muted-foreground">({staffMember.reviewCount} reviews)</span>
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground">No reviews yet</span>
                        )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
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
                            <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteClick(staffMember)}>
                                <Trash2 className='mr-2 h-4 w-4' />
                                Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No staff found. Click "Add Staff" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the staff
                member <span className="font-semibold">{selectedStaff?.name}</span> and remove their data from our servers.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
                Continue
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
