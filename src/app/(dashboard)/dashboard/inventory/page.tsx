'use client';

import { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  IndianRupee, 
  Sparkles, 
  Pencil, 
  Trash2,
  TrendingDown,
  Layers,
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

const INITIAL_PRODUCTS: ProductItem[] = [
  { id: 'PRD-101', name: 'Mythic Oil Argan Serum 100ml', brand: "L'Oréal Professionnel", category: 'Hair Care', stock: 18, reorderLevel: 5, costPrice: 850, sellingPrice: 1250, supplier: 'Loreal India Ltd', status: 'In Stock' },
  { id: 'PRD-102', name: 'Keratin Infusion Shampoo 250ml', brand: 'Schwarzkopf', category: 'Hair Care', stock: 4, reorderLevel: 6, costPrice: 620, sellingPrice: 950, supplier: 'Schwarzkopf Pro', status: 'Low Stock' },
  { id: 'PRD-103', name: 'Hydra Glow Vitamin C Serum 50ml', brand: 'O3+ Professional', category: 'Skin Care', stock: 12, reorderLevel: 4, costPrice: 1100, sellingPrice: 1650, supplier: 'O3+ Skincare', status: 'In Stock' },
  { id: 'PRD-104', name: 'Majirel Hair Color Tube 50g (Dark Blonde)', brand: "L'Oréal Professionnel", category: 'Colorants', stock: 0, reorderLevel: 8, costPrice: 320, sellingPrice: 490, supplier: 'Loreal India Ltd', status: 'Out of Stock' },
  { id: 'PRD-105', name: 'Tea Tree Purifying Scalp Mask 200ml', brand: 'Moroccanoil', category: 'Spa & Treatment', stock: 7, reorderLevel: 5, costPrice: 1450, sellingPrice: 2100, supplier: 'Beauty Source Hub', status: 'In Stock' },
  { id: 'PRD-106', name: 'Matte Hold Clay Wax 85g', brand: 'Beardo Pro', category: 'Men Grooming', stock: 22, reorderLevel: 8, costPrice: 280, sellingPrice: 450, supplier: 'Zeb Express Dist', status: 'In Stock' },
  { id: 'PRD-107', name: 'Intense Peptide Hair Repair Mist 150ml', brand: 'Kérastase', category: 'Hair Care', stock: 3, reorderLevel: 5, costPrice: 1900, sellingPrice: 2800, supplier: 'Luxury Hair Supply', status: 'Low Stock' },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form State
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('Hair Care');
  const [formStock, setFormStock] = useState(10);
  const [formReorder, setFormReorder] = useState(5);
  const [formCost, setFormCost] = useState(500);
  const [formPrice, setFormPrice] = useState(850);
  const [formSupplier, setFormSupplier] = useState('Loreal India Ltd');

  const stats = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.reorderLevel).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const totalValue = products.reduce((acc, p) => acc + (p.stock * p.sellingPrice), 0);
    return { total, lowStock, outOfStock, totalValue };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Product name is required.', variant: 'destructive' });
      return;
    }

    const status: ProductItem['status'] = formStock === 0 ? 'Out of Stock' : (formStock <= formReorder ? 'Low Stock' : 'In Stock');

    const newProd: ProductItem = {
      id: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: formName,
      brand: formBrand || 'Generic Salon Pro',
      category: formCategory,
      stock: formStock,
      reorderLevel: formReorder,
      costPrice: formCost,
      sellingPrice: formPrice,
      supplier: formSupplier,
      status,
    };

    setProducts([newProd, ...products]);
    setAddDialogOpen(false);
    setFormName('');
    setFormBrand('');
    toast({
      title: 'Product Added',
      description: `${newProd.name} added with ${newProd.stock} units.`,
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
            Track retail products, salon consumable supplies, stock level alerts, and vendors.
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
            <DialogContent className="max-w-[480px] max-h-[88vh] overflow-y-auto rounded-3xl p-6 bg-white shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-bold text-slate-900">Add New Inventory Product</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddProduct} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mythic Oil Argan Serum 100ml"
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
                      placeholder="e.g. L'Oréal"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-purple-600"
                    >
                      <option value="Hair Care">Hair Care</option>
                      <option value="Skin Care">Skin Care</option>
                      <option value="Colorants">Colorants</option>
                      <option value="Spa & Treatment">Spa & Treatment</option>
                      <option value="Men Grooming">Men Grooming</option>
                    </select>
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

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4">
        
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product, brand, or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Hair Care', 'Skin Care', 'Colorants', 'Spa & Treatment', 'Men Grooming'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-1">Product</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Stock Units</th>
                <th className="pb-3">Purchase Cost</th>
                <th className="pb-3">Selling Price</th>
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
                      <div className="text-[10px] text-slate-400">{p.brand} • {p.id}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${p.stock === 0 ? 'text-rose-600' : p.stock <= p.reorderLevel ? 'text-amber-600' : 'text-slate-900'}`}>
                          {p.stock} units
                        </span>
                        <span className="text-[10px] text-slate-400">Min: {p.reorderLevel}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-medium text-slate-500">₹{p.costPrice}</td>
                    <td className="py-3.5 font-bold text-slate-900">₹{p.sellingPrice}</td>
                    <td className="py-3.5 text-slate-600 font-medium">{p.supplier}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : p.status === 'Low Stock'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {p.status === 'Low Stock' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-1">
                      <button
                        type="button"
                        onClick={() => toast({ title: 'Stock Updated', description: `Added 10 units of ${p.name}` })}
                        className="px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold shadow-2xs transition-all"
                      >
                        + Restock
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No products found matching your search.
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
