'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser, deleteDocumentNonBlocking } from '@/firebase';
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
import { MoreHorizontal, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { collection, query, doc } from 'firebase/firestore';
import type { InventoryProduct } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { AddProductForm } from '@/components/dashboard/inventory/add-product-form';
import { EditProductForm } from '@/components/dashboard/inventory/edit-product-form';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function InventoryPage({}) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);

  const salonId = user?.uid;

  const inventoryQuery = useMemo(() => {
    if (!firestore || !salonId || isUserLoading) return null;
    return query(collection(firestore, `salons/${salonId}/inventory`));
  }, [firestore, salonId, isUserLoading]);

  const { data: products, isLoading } = useCollection<InventoryProduct>(inventoryQuery);

  const formatCurrency = (amount: number) => {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(amount);
    return <><span className="font-arial">₹</span>{formattedAmount}</>;
  };
  
  const handleEditClick = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedProduct || !firestore || !salonId) return;

    const productDocRef = doc(firestore, `salons/${salonId}/inventory`, selectedProduct.id);
    deleteDocumentNonBlocking(productDocRef);

    toast({
      title: "Product Deleted",
      description: `${selectedProduct.name} has been removed from your inventory.`,
    });

    setDeleteDialogOpen(false);
    setSelectedProduct(null);
  };

  const renderSkeleton = () => {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell>
          <div className="flex justify-end">
            <Skeleton className="h-8 w-8" />
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <>
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventory Management</CardTitle>
            <CardDescription>
              Track and manage your salon's product stock.
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add a New Product</DialogTitle>
              </DialogHeader>
              <AddProductForm setOpen={setAddDialogOpen} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isUserLoading ? (
                renderSkeleton()
              ) : products && products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      {product.brand}
                    </TableCell>
                     <TableCell>
                      <div className='flex items-center gap-2'>
                        <span>{product.stockQuantity}</span>
                        {product.stockQuantity <= product.lowStockThreshold && (
                            <Badge variant="destructive">Low Stock</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.unitPrice)}
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
                            <DropdownMenuItem onClick={() => handleEditClick(product)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteClick(product)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
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
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No products found. Click "Add Product" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

    {/* Edit Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
                <EditProductForm
                    key={selectedProduct.id}
                    product={selectedProduct}
                    setOpen={setEditDialogOpen}
                />
            )}
        </DialogContent>
    </Dialog>

    {/* Delete Alert Dialog */}
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the product
                <span className="font-semibold"> {selectedProduct?.name}</span>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProduct(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
                Continue
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
