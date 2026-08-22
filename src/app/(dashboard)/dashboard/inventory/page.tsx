'use client';

import { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  IndianRupee, 
  Pencil, 
  Trash2,
  TrendingDown,
  Building
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useFirestore, useUser, useCollection, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';

interface ProductItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  supplier: string;
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

  const { data: dbProducts } = useCollection<any>(inventoryQuery);

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formStock, setFormStock] = useState(10);
  const [formReorder, setFormReorder] = useState(5);
  const [formCost, setFormCost] = useState(500);
  const [formPrice, setFormPrice] = useState(850);
  const [formSupplier, setFormSupplier] = useState('');

  const products: ProductItem[] = useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts.map((p: any) => ({
      id: p.id,
      name: p.name || 'Product',
      brand: p.brand || '',
      category: p.category || 'General',
      stock: Number(p.stock) || 0,
      reorderLevel: Number(p.reorderLevel) || 5,
      costPrice: Number(p.costPrice) || 0,
      sellingPrice: Number(p.sellingPrice) || 0,
      supplier: p.supplier || '',
      status: Number(p.stock) === 0 ? 'Out of Stock' : (Number(p.stock) <= (Number(p.reorderLevel) || 5) ? 'Low Stock' : 'In Stock'),
    }));
  }, [dbProducts]);

  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  }, [products]);

  const stats = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.reorderLevel).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const totalValue = products.reduce((acc, p) => acc + (p.stock * p.sellingPrice), 0);
    return { total, lowStock, outOfStock, totalValue };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = categoryFilter === 'All' || p.category.toLowerCase() === categoryFilter.toLowerCase();
      return matchesCategory;
    });
  }, [products, categoryFilter]);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Product name is required.', variant: 'destructive' });
      return;
    }

    const newProd = {
      name: formName,
      brand: formBrand,
      category: formCategory || 'General',
      stock: Number(formStock) || 0,
      reorderLevel: Number(formReorder) || 5,
      costPrice: Number(formCost) || 0,
      sellingPrice: Number(formPrice) || 0,
      supplier: formSupplier,
    };

    if (salonId && firestore) {
      const invRef = collection(firestore, `salons/${salonId}/inventory`);
      addDocumentNonBlocking(invRef, {
        ...newProd,
        salonId,
        createdAt: new Date().toISOString(),
      });
    }

    toast({
      title: 'Product Added to Inventory',
      description: `${formName} has been saved to your stock register.`,
    });
    setAddDialogOpen(false);
    setFormName('');
    setFormBrand('');
    setFormCategory('');
    setFormStock(10);
    setFormReorder(5);
    setFormCost(500);
    setFormPrice(850);
    setFormSupplier('');
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (!salonId || !firestore) return;
    const docRef = doc(firestore, `salons/${salonId}/inventory`, productId);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Product Removed',
      description: `${productName} has been removed from inventory.`,
    });
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Inventory & Stock
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage professional salon retail products, backbar consumables, stock levels, and reorder alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Add Inventory Product</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddProduct} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Professional Hair Mask 200ml"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Brand</label>
                    <input
                      type="text"
                      placeholder="e.g. Brand Name"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Hair Care, Skin Care"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Current Stock</label>
                    <input
                      type="number"
                      value={formStock}
                      onChange={(e) => setFormStock(Number(e.target.value))}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Reorder Level</label>
                    <input
                      type="number"
                      value={formReorder}
                      onChange={(e) => setFormReorder(Number(e.target.value))}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Cost Price (₹)</label>
                    <input
                      type="number"
                      value={formCost}
                      onChange={(e) => setFormCost(Number(e.target.value))}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Selling Price (₹)</label>
                    <input
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Supplier / Vendor</label>
                    <input
                      type="text"
                      placeholder="e.g. Supplier Name"
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                </div>

                <button
                  type="submit"
                  className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-4"
                >
                  Save Product to Inventory
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Products</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{stats.total} SKUs</div>
          <span className="text-[10px] text-emerald-600 font-medium">Active catalog items</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Low Stock Alert</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">{stats.lowStock} Items</div>
          <span className="text-[10px] text-amber-600 font-medium">Reorder required soon</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Out of Stock</span>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1">{stats.outOfStock} Items</div>
          <span className="text-[10px] text-rose-600 font-medium">Needs vendor restock</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Stock Value</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">₹{stats.totalValue.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-slate-400 font-medium">Retail stock worth</span>
        </div>
      </div>

      {/* Main Table Card (Search bar removed) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Dynamic Category Filter Bar (Only if user has multiple categories) */}
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

        {/* Product Table */}
        <div className="overflow-x-auto">
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
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-2xs"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

    </div>
  );
}
