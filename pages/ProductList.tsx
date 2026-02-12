
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Filter, ChevronRight, Package, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../supabase';

const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await db.products().select('*').order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/menu')}>
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-medium">Produtos</h1>
        </div>
        <button className="p-1 opacity-80 active:scale-90 transition-transform">
          <Filter size={22} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
           <div className="flex flex-col items-center justify-center p-20 gap-3 text-blue-900/30">
             <Loader2 className="animate-spin" size={32} />
             <span className="text-[10px] font-black uppercase tracking-widest">Carregando Estoque...</span>
           </div>
        ) : products.length === 0 ? (
            <div className="p-10 text-center text-gray-400 font-bold uppercase text-xs">Nenhum produto cadastrado.</div>
        ) : (
          <div className="divide-y divide-gray-50 bg-white">
            {products.map((p) => {
              const isLowStock = p.current_stock <= p.min_stock;
              return (
                <button 
                  key={p.id} 
                  onClick={() => navigate(`/products/edit/${p.id}`, { state: { product: p } })}
                  className="w-full p-5 flex justify-between items-center active:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-gray-900 font-bold text-base truncate tracking-tight">{p.name}</h3>
                      {isLowStock && (
                        <div className="bg-red-100 text-red-600 p-1 rounded-md" title="Estoque Baixo">
                          <AlertCircle size={12} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-blue-900 text-sm font-black">
                        R$ {p.sale_price?.toFixed(2).replace('.', ',')}
                      </p>
                      <span className="text-gray-300">|</span>
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{p.brand}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl border ${
                      isLowStock ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-500'
                    }`}>
                      <span className="text-[8px] font-black uppercase tracking-tighter mb-0.5">Estoque</span>
                      <span className="text-sm font-black">{p.current_stock}</span>
                    </div>
                    <ChevronRight className="text-gray-300" size={20} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button 
        onClick={() => navigate('/products/new')}
        className="fixed bottom-24 right-6 bg-[#1e3a8a] text-white p-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform z-50 ring-4 ring-blue-50"
      >
        <Plus size={32} />
      </button>
    </div>
  );
};

export default ProductList;
