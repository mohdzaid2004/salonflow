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
import { useFirestore, useUser, useCollection, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formStock, setFormStock] = useState(10);
  const [formReorder, setFormReorder] = useState(3);
  const [formCost, setFormCost] = useState(300);
  const [formPrice, setFormPrice] = useState(550);
  const [formSupplier, setFormSupplier] = useState('');

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

  const stats = useMemo(() => {
    const totalItems = displayProducts.reduce((acc, p) => acc + p.stock, 0);
    const lowStock = displayProducts.filter((p) => p.status === 'Low Stock').length;
    const outOfStock = displayProducts.filter((p) => p.status === 'Out of Stock').length;
    const totalValue = displayProducts.reduce((acc, p) => acc + (p.stock * p.sellingPrice), 0);
    return { totalItems, lowStock, outOfStock, totalValue };
  }, [displayProducts]);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Product name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (formStock === 0) status = 'Out of Stock';
    else if (formStock <= formReorder) status = 'Low Stock';

    const newProduct: InventoryItem = {
      id: String(Date.now()),
      name: formName,
      brand: formBrand,
      category: formCategory || 'General',
      stock: formStock,
      minStock: formReorder,
      costPrice: formCost,
      sellingPrice: formPrice,
      supplier: formSupplier,
      status,
    };

    if (firestore && salonId) {
      const inventoryRef = collection(firestore, `salons/${salonId}/inventory`);
      addDocumentNonBlocking(inventoryRef, {
        name: newProduct.name,
        brand: newProduct.brand,
        category: newProduct.category,
        stock: newProduct.stock,
        minStock: newProduct.minStock,
        costPrice: newProduct.costPrice,
        sellingPrice: newProduct.sellingPrice,
        supplier: newProduct.supplier,
        salonId,
        createdAt: new Date().toISOString(),
      });
    }

    setLocalProducts([newProduct, ...localProducts]);
    setAddDialogOpen(false);
    setIsSubmitting(false);
    setFormName('');
    setFormBrand('');
    setFormCategory('');
    setFormSupplier('');
    toast({
      title: 'Product Added',
      description: `${newProduct.name} has been added to inventory.`,
    });
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (!firestore || !salonId) return;
    const docRef = doc(firestore, `salons/${salonId}/inventory`, productId);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Product Removed',
      description: `${productName} has been removed from inventory.`,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight font-serif sm:font-sans">
            Inventory & Stock
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage professional salon retail products, backbar consumables, and stock levels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-white shadow-2xl">
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
                      placeholder="e.g. L'Oréal, Schwarzkopf"
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
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Retail Price (₹)</label>
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
                      placeholder="e.g. Beauty Essentials India Pvt Ltd"
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-9 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Product...' : 'Add to Inventory'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Stock Units</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{stats.totalItems} Units</div>
          <span className="text-[10px] text-emerald-600 font-medium">In warehouse & shelves</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Low Stock Alert</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-0.5">{stats.lowStock} Items</div>
          <span className="text-[10px] text-amber-600 font-medium">Reorder required soon</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Out of Stock</span>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5">{stats.outOfStock} Items</div>
          <span className="text-[10px] text-rose-600 font-medium">Needs vendor restock</span>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500">Total Stock Value</span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-0.5">₹{stats.totalValue.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-slate-400 font-medium">Retail stock worth</span>
        </div>
      </div>

      {/* Main Table / Mobile Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Dynamic Category Filter Bar */}
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

                <div className="flex items-center justify-end pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(p.id, p.name)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Remove Product
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
