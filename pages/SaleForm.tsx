
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Search, List, Plus, Trash2, Loader2, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../supabase';
import { addTransaction } from '../data/transactions';

interface CartItem {
  product_id: string;
  name: string;
  code?: string;
  price: number;
  quantity: number;
  stock: number;
}

const SaleForm: React.FC = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();

  const getTitle = () => {
    switch(type) {
        case 'products': return 'Venda de Produtos';
        case 'packages': return 'Venda de Pacotes';
        case 'subscriptions': return 'Venda de Planos de Assinatura';
        default: return 'Venda';
    }
  };

  // --- Dados de apoio ---
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // --- Formulário ---
  const [proId, setProId] = useState('');
  const [clientName, setClientName] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (type !== 'products') { setLoadingData(false); return; }
    const load = async () => {
      try {
        const [prosRes, productsRes, methodsRes] = await Promise.all([
          db.professionals().select('id, name').eq('status', 'Ativo'),
          db.products().select('*').gt('current_stock', 0).order('name'),
          db.paymentMethods().select('*').order('name')
        ]);
        if (prosRes.data) setProfessionals(prosRes.data);
        if (productsRes.data) setProducts(productsRes.data);
        if (methodsRes.data) {
          setPaymentMethods(methodsRes.data);
          if (methodsRes.data.length > 0) setPaymentMethod(methodsRes.data[0].name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [type]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const term = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term)).slice(0, 8);
  }, [productSearch, products]);

  const handlePickProduct = (product: any) => {
    setSelectedProductId(product.id);
    setProductSearch(product.name);
  };

  const handleAddToCart = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      alert('Busque e selecione um produto na lista antes de adicionar.');
      return;
    }
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    const alreadyInCart = cart.find(c => c.product_id === product.id)?.quantity || 0;
    if (alreadyInCart + qty > product.current_stock) {
      alert(`Estoque insuficiente. Disponível: ${product.current_stock}, já no carrinho: ${alreadyInCart}.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(c => c.product_id === product.id);
      if (existing) {
        return prev.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + qty } : c);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        code: product.code,
        price: Number(product.sale_price) || 0,
        quantity: qty,
        stock: product.current_stock
      }];
    });

    setSelectedProductId('');
    setProductSearch('');
    setQuantity('1');
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product_id !== productId));
  };

  const total = useMemo(() => cart.reduce((sum, c) => sum + c.price * c.quantity, 0), [cart]);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      alert('Adicione ao menos um produto à venda.');
      return;
    }
    if (!paymentMethod) {
      alert('Selecione a forma de pagamento.');
      return;
    }

    setSubmitting(true);
    try {
      // Revalida o estoque no momento da venda (o carrinho pode ter sido
      // montado há alguns minutos) antes de gravar qualquer coisa.
      for (const item of cart) {
        const { data: fresh } = await db.products().select('current_stock').eq('id', item.product_id).single();
        if (!fresh || fresh.current_stock < item.quantity) {
          throw new Error(`Estoque de "${item.name}" mudou e não é mais suficiente (disponível: ${fresh?.current_stock ?? 0}).`);
        }
      }

      const selectedPro = professionals.find(p => p.id === proId);
      const today = new Date().toISOString().split('T')[0];

      for (const item of cart) {
        const val = item.price * item.quantity;
        // Mesma regra do checkout de agendamento: comissão padrão de 10% em
        // produtos, só quando há um profissional atribuído à venda.
        const commissionRate = selectedPro ? 10 : 0;
        const commissionAmount = selectedPro ? val * 0.1 : 0;

        await addTransaction({
          date: today,
          operation: 'VENDA',
          type: 'PRODUTO' as any,
          category: 'Produto',
          code: item.code || '',
          item: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          val,
          commission_amount: commissionAmount,
          commission_rate: commissionRate,
          professional_id: selectedPro?.id,
          pro: selectedPro?.name || 'Loja',
          client_supplier: clientName || 'Cliente Avulso',
          payment_method: paymentMethod,
          status: 'Pago'
        });

        const { data: fresh } = await db.products().select('current_stock').eq('id', item.product_id).single();
        const newStock = Math.max(0, (fresh?.current_stock ?? item.stock) - item.quantity);
        await db.products().update({ current_stock: newStock }).eq('id', item.product_id);
      }

      alert('Venda registrada com sucesso!');
      navigate('/sales');
    } catch (err: any) {
      alert('Erro ao finalizar venda: ' + (err.message || 'tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Tipos ainda não implementados (pacotes / assinaturas) ---
  if (type !== 'products') {
    return (
      <div className="flex flex-col h-full bg-white">
        <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center">
              <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
              <h1 className="text-lg font-medium">{getTitle()}</h1>
          </div>
          <List size={22} />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3 text-gray-400">
          <ShoppingBag size={40} className="opacity-30" />
          <p className="font-medium">{getTitle()} ainda não está disponível.</p>
          <p className="text-sm">Use "Vender Produtos" — os demais tipos ainda não têm um catálogo cadastrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center">
            <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
            <h1 className="text-lg font-medium">{getTitle()}</h1>
        </div>
      </header>

      {loadingData ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-900" size={32} /></div>
      ) : (
        <div className="p-4 space-y-5 overflow-y-auto flex-1 pb-32">

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Profissional (opcional — define a comissão)</label>
              <select
                value={proId}
                onChange={e => setProId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-sm"
              >
                <option value="">Venda de loja (sem comissão)</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Cliente (opcional)</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-sm"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest block px-1">Adicionar Produto</label>
            <div className="relative">
              <input
                type="text"
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setSelectedProductId(''); }}
                placeholder="Buscar produto..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 pr-10 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-sm"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              {filteredProducts.length > 0 && !selectedProductId && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handlePickProduct(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between text-sm"
                    >
                      <span className="font-bold text-gray-700">{p.name}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">R$ {Number(p.sale_price).toFixed(2).replace('.', ',')} · estoque {p.current_stock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-24 bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-center text-sm"
              />
              <button
                onClick={handleAddToCart}
                disabled={!selectedProductId}
                className="flex-1 bg-blue-900 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition-colors"
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Itens da Venda</h3>
            </div>
            {cart.length === 0 ? (
              <p className="text-center text-gray-400 italic text-xs py-8">Nenhum produto adicionado.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {cart.map(item => (
                  <div key={item.product_id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{item.quantity} × R$ {item.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-gray-900 text-sm">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                      <button onClick={() => handleRemoveFromCart(item.product_id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-3 bg-blue-50/50 border-t border-blue-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Total</span>
              <span className="text-lg font-black text-blue-900">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Forma de Pagamento</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-sm"
            >
              <option value="">Selecione...</option>
              {paymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}
            </select>
          </div>

          <button
            onClick={handleFinalizeSale}
            disabled={submitting || cart.length === 0}
            className="w-full bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            Finalizar Venda
          </button>
        </div>
      )}
    </div>
  );
};

export default SaleForm;
