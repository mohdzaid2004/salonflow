'use client';

import { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  IndianRupee, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Building2,
  Trash2,
  Pencil,
  Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';
import { 
  useFirestore, 
  useUser, 
  useCollection, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  stock: number;
  minStock: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export default function InventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const salonId = user?.uid;

  const inventoryQuery = useMemo(() => {
    if (!firestore || !salonId) return null;
    return query(collection(firestore, `salons/${salonId}/inventory`));
  }, [firestore, salonId]);

  const { data: dbInventory } = useCollection<any>(inventoryQuery);

  const [localProducts, setLocalProducts] = useState<InventoryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Form State
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formStock, setFormStock] = useState(10);
  const [formReorder, setFormReorder] = useState(3);
  const [formCost, setFormCost] = useState(300);
  const [formPrice, setFormPrice] = useState(550);
  const [formSupplier, setFormSupplier] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStock, setEditStock] = useState(10);
  const [editReorder, setEditReorder] = useState(3);
  const [editCost, setEditCost] = useState(300);
  const [editPrice, setEditPrice] = useState(550);
  const [editSupplier, setEditSupplier] = useState('');

  const displayProducts: InventoryItem[] = useMemo(() => {
    if (dbInventory) {
      return dbInventory.map((item: any) => {
        const stock = Number(item.stock) || 0;
        const minStock = Number(item.minStock) || 3;
        let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
        if (stock === 0) status = 'Out of Stock';
        else if (stock <= minStock) status = 'Low Stock';

        return {
          id: item.id,
          name: item.name || 'Product',
          category: item.category || 'General',
          brand: item.brand || '',
          stock,
          minStock,
          costPrice: Number(item.costPrice) || 0,
          sellingPrice: Number(item.sellingPrice) || 0,
          supplier: item.supplier || '',
          status,
        };
      });
    }
    return localProducts;
  }, [dbInventory, localProducts]);

  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('All');
    displayProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [displayProducts]);

  const filteredProducts = useMemo(() => {
    return displayProducts.filter((product) => {
      const matchesCategory =
        categoryFilter === 'All' || product.category.toLowerCase() === categoryFilter.toLowerCase();
      return matchesCategory;
    });
  }, [displayProducts, categoryFilter]);

  // Telemetry Aggregations
  const totalStockUnits = displayProducts.reduce((acc, p) => acc + p.stock, 0);
  const totalValuation = displayProducts.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
  const lowStockCount = displayProducts.filter((p) => p.status === 'Low Stock' || p.status === 'Out of Stock').length;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({ title: 'Validation Error', description: 'Product name is required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const newProductData = {
      salonId,
      name: formName.trim(),
      brand: formBrand.trim(),
      category: formCategory.trim() || 'General',
      stock: Number(formStock) || 0,
      minStock: Number(formReorder) || 3,
      costPrice: Number(formCost) || 0,
      sellingPrice: Number(formPrice) || 0,
      supplier: formSupplier.trim(),
      createdAt: new Date().toISOString(),
    };

    if (firestore && salonId) {
      addDocumentNonBlocking(collection(firestore, `salons/${salonId}/inventory`), newProductData);
    } else {
      setLocalProducts((prev) => [
        {
          id: String(Date.now()),
          ...newProductData,
          status: (Number(formStock) || 0) <= (Number(formReorder) || 3) ? 'Low Stock' : 'In Stock',
        },
        ...prev,
      ]);
    }

    toast({
      title: 'Product Added',
      description: `${formName} added to salon stock.`,
    });

    setFormName('');
    setFormBrand('');
    setFormCategory('');
    setFormStock(10);
    setFormReorder(3);
    setFormCost(300);
    setFormPrice(550);
    setFormSupplier('');
    setIsSubmitting(false);
    setAddDialogOpen(false);
  };

  const handleOpenEdit = (p: InventoryItem) => {
    setSelectedProduct(p);
    setEditName(p.name);
    setEditBrand(p.brand || '');
    setEditCategory(p.category);
    setEditStock(p.stock);
    setEditReorder(p.minStock);
    setEditCost(p.costPrice);
    setEditPrice(p.sellingPrice);
    setEditSupplier(p.supplier || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!editName.trim()) {
      toast({ title: 'Validation Error', description: 'Product name is required.', variant: 'destructive' });
      return;
    }

    if (firestore && salonId) {
      const prodRef = doc(firestore, `salons/${salonId}/inventory`, selectedProduct.id);
      updateDocumentNonBlocking(prodRef, {
        name: editName.trim(),
        brand: editBrand.trim(),
        category: editCategory.trim() || 'General',
        stock: Number(editStock) || 0,
        minStock: Number(editReorder) || 3,
        costPrice: Number(editCost) || 0,
        sellingPrice: Number(editPrice) || 0,
        supplier: editSupplier.trim(),
        updatedAt: new Date().toISOString(),
      });
    }

    toast({
      title: 'Product Updated',
      description: `${editName} stock updated successfully.`,
    });

    setEditDialogOpen(false);
  };

  const handleOpenDelete = (p: InventoryItem) => {
    setSelectedProduct(p);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedProduct) return;

    if (firestore && salonId) {
      const prodRef = doc(firestore, `salons/${salonId}/inventory`, selectedProduct.id);
      deleteDocumentNonBlocking(prodRef);
    } else {
      setLocalProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
    }

    toast({
      title: 'Product Removed',
      description: `${selectedProduct.name} removed from inventory.`,
    });

    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
              <Package className="w-3 h-3" /> Backbar & Retail Stock
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Inventory
          </h1>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="h-9 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[440px] rounded-3xl p-5 bg-white border border-slate-200 text-slate-900 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Add Inventory Product
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. L'Oréal Professional Shampoo 500ml"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. L'Oréal"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Hair Care"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Initial Stock Units</label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="1"
                    value={formReorder}
                    onChange={(e) => setFormReorder(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 3 Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Stock Units</span>
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{totalStockUnits}</div>
          <div className="text-[11px] text-slate-400 font-medium">Across {displayProducts.length} product SKUs</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Inventory Valuation</span>
            <IndianRupee className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700 font-mono">
            ₹{totalValuation.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Calculated at landed cost</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Low Stock Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-extrabold font-mono ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {lowStockCount}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Below reorder threshold</div>
        </div>
      </div>

      {/* Stock Table & Content */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        
        {/* Category Pills */}
        {dynamicCategories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter.toLowerCase() === cat.toLowerCase()
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Mobile Interactive Cards (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => (
              <div key={p.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                    {p.brand && <div className="text-[10px] text-slate-400">{p.brand}</div>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.status === 'In Stock'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : p.status === 'Low Stock'
                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Stock</span>
                    <span className="font-bold text-slate-900">{p.stock} units</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Retail Price</span>
                    <span className="font-bold text-purple-700">₹{p.sellingPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Cost Price</span>
                    <span className="text-slate-600">₹{p.costPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Category</span>
                    <span className="text-slate-700">{p.category}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-purple-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(p)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              No products in inventory yet. Tap &quot;Add Product&quot; above to register stock items.
            </div>
          )}
        </div>

        {/* Product Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Product</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Stock Units</th>
                <th className="pb-3">Cost Price</th>
                <th className="pb-3">Retail Price</th>
                <th className="pb-3">Supplier</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-1">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      {p.brand && <div className="text-[10px] text-slate-400">{p.brand}</div>}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">{p.stock} units</td>
                    <td className="py-3.5 text-slate-500 font-medium">₹{p.costPrice.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 font-bold text-slate-900">₹{p.sellingPrice.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 text-slate-500">{p.supplier || 'N/A'}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : p.status === 'Low Stock'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {p.status === 'In Stock' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-purple-700 transition-colors"
                          title="Edit Product"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(p)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No products in inventory yet. Click &quot;Add Product&quot; to register stock items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Edit Product Dialog */}
      {selectedProduct && (
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[440px] rounded-3xl p-5 bg-white border border-slate-200 text-slate-900 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Edit Product Details
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Stock Units</label>
                  <input
                    type="number"
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="1"
                    value={editReorder}
                    onChange={(e) => setEditReorder(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editCost}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-10 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Product Alert Dialog */}
      {selectedProduct && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-[400px] rounded-3xl p-5 bg-white border border-slate-200 text-slate-900 space-y-3">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-extrabold text-slate-900">
                Remove Product from Inventory?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500">
                Are you sure you want to remove <strong className="text-slate-900">{selectedProduct.name}</strong>? This product will be deleted from your stock list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-2 flex items-center justify-end gap-2">
              <AlertDialogCancel className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Remove Product
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
