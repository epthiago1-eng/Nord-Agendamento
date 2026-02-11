
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Package, AlertTriangle, Info, Camera, X, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const editData = location.state?.product;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    reference: '',
    averageCost: '0,00',
    saleValue: '0,00',
    saleId: '',
    currentStock: 0,
    minStock: 0
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || '',
        brand: editData.brand || '',
        reference: editData.reference || '',
        averageCost: editData.cost?.toFixed(2).replace('.', ',') || '0,00',
        saleValue: editData.price?.toFixed(2).replace('.', ',') || '0,00',
        saleId: editData.saleId || '',
        currentStock: editData.currentStock || 0,
        minStock: editData.minStock || 0
      });
      if (editData.imageUrl) setImagePreview(editData.imageUrl);
    }
  }, [editData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      alert('O nome do produto é obrigatório.');
      return;
    }
    alert('Produto salvo com sucesso (incluindo imagem)!');
    navigate('/products');
  };

  const isLowStock = formData.currentStock <= formData.minStock && formData.minStock > 0;

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
                        onClick={() => { setImagePreview(null); setImageFile(null); }}
                        className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full shadow-lg active:scale-90 transition-all"
                    >
                        <X size={18} />
                    </button>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                    >
                        <Camera size={32} className="text-white" />
                    </div>
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
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageChange} 
            />
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
                        value={formData.currentStock}
                        onChange={(e) => setFormData({...formData, currentStock: parseInt(e.target.value) || 0})}
                        className={`w-full bg-white border rounded-xl py-3 px-4 outline-none font-black text-lg transition-all ${isLowStock ? 'border-red-200 focus:ring-red-100 text-red-600' : 'border-blue-100 focus:ring-blue-100 text-gray-800'}`}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block pl-1">Mínimo (Alerta)</label>
                    <input 
                        type="number" 
                        value={formData.minStock}
                        onChange={(e) => setFormData({...formData, minStock: parseInt(e.target.value) || 0})}
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
                value={formData.averageCost}
                onChange={(e) => setFormData({...formData, averageCost: e.target.value})}
                placeholder="0,00" 
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm text-gray-700 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Venda (R$)</label>
              <input 
                type="text" 
                value={formData.saleValue}
                onChange={(e) => setFormData({...formData, saleValue: e.target.value})}
                placeholder="0,00" 
                className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm text-blue-900 font-black"
              />
            </div>
        </div>

        <button 
          type="button"
          onClick={handleSave}
          className="w-full bg-[#1e3a8a] text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm mt-8 mb-4"
        >
            Salvar Produto
        </button>
      </div>
    </div>
  );
};

export default ProductForm;
