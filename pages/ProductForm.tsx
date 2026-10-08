
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Package, AlertTriangle, Info, Camera, X, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { db } from '../supabase';

const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const editData = location.state?.product;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    reference: '',
    cost_price: '',
    sale_price: '',
    current_stock: 0,
    min_stock: 0
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || '',
        brand: editData.brand || '',
        reference: editData.reference || '',
        cost_price: editData.cost_price?.toString() || '0',
        sale_price: editData.sale_price?.toString() || '0',
        current_stock: editData.current_stock || 0,
        min_stock: editData.min_stock || 0
      });
      if (editData.image_url) setImagePreview(editData.image_url);
    }
  }, [editData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('O nome do produto é obrigatório.');
      return;
    }

    setLoading(true);
    try {
        const payload = {
            name: formData.name,
            brand: formData.brand,
            reference: formData.reference,
            cost_price: parseFloat(formData.cost_price.replace(',', '.')) || 0,
            sale_price: parseFloat(formData.sale_price.replace(',', '.')) || 0,
            current_stock: formData.current_stock,
            min_stock: formData.min_stock,
            image_url: imagePreview
        };

        if (id) {
            const { error } = await db.products().update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await db.products().insert(payload);
            if (error) throw error;
        }

        alert('Produto salvo com sucesso!');
        navigate('/products');
    } catch (error: any) {
        alert('Erro ao salvar: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  const isLowStock = formData.current_stock <= formData.min_stock && formData.min_stock > 0;

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">
          {id ? 'Editar Produto' : 'Cadastro Produto'}
        </h1>
      </header>

      <div className="p-4 space-y-4 overflow-y-auto flex-1 bg-white">
        
        {/* Product Image Section */}
        <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block px-1">Foto do Produto</label>
            {imagePreview ? (
                <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-gray-100 shadow-sm group">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                        onClick={() => setImagePreview(null)}
                        className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full shadow-lg active:scale-90 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 active:bg-gray-50 transition-all"
                >
                    <div className="bg-gray-100 p-4 rounded-full">
                        <Camera size={32} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Adicionar Foto</span>
                </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
        </div>

        <div>
          <label className="text-[13px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nome do Produto</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Ex: Pomada Matte 100g" 
            className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm text-gray-700 font-bold"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Marca</label>
              <input 
                type="text" 
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                placeholder="Digitar..." 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Referência</label>
              <input 
                type="text" 
                value={formData.reference}
                onChange={(e) => setFormData({...formData, reference: e.target.value})}
                placeholder="Cód/SKU" 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-medium"
              />
            </div>
        </div>

        <div className={`p-5 rounded-[2rem] border transition-all duration-300 ${isLowStock ? 'bg-red-50 border-red-100' : 'bg-blue-50/50 border-blue-100'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Package size={18} className={isLowStock ? 'text-red-500' : 'text-blue-900'} />
                    <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isLowStock ? 'text-red-700' : 'text-blue-900'}`}>Gestão de Estoque</h3>
                </div>
                {isLowStock && (
                    <div className="flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={14} className="text-red-500" />
                        <span className="text-[9px] font-black text-red-600 uppercase">Estoque Baixo!</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block pl-1">Qtd Atual</label>
                    <input 
                        type="number" 
                        value={formData.current_stock}
                        onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})}
                        className={`w-full bg-white border rounded-xl py-3 px-4 outline-none font-black text-lg transition-all ${isLowStock ? 'border-red-200 focus:ring-red-100 text-red-600' : 'border-blue-100 focus:ring-blue-100 text-gray-800'}`}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block pl-1">Mínimo (Alerta)</label>
                    <input 
                        type="number" 
                        value={formData.min_stock}
                        onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value) || 0})}
                        className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 font-black text-lg"
                    />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Custo Médio (R$)</label>
              <input 
                type="text" 
                value={formData.cost_price}
                onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                placeholder="0,00" 
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm text-gray-700 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Venda (R$)</label>
              <input 
                type="text" 
                value={formData.sale_price}
                onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
                placeholder="0,00" 
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm text-blue-900 font-black"
              />
            </div>
        </div>

        <button 
          type="button"
          disabled={loading}
          onClick={handleSave}
          className="w-full bg-[#1e3a8a] text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm mt-8 mb-4 flex items-center justify-center gap-2"
        >
            {loading ? <Loader2 className="animate-spin" /> : 'Salvar Produto'}
        </button>
      </div>
    </div>
  );
};

export default ProductForm;
