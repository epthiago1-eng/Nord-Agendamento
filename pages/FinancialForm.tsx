
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, CheckCircle2, ArrowDown, ArrowUp, Package, Plus, Loader2, DollarSign, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addTransaction } from '../data/transactions';
import { db } from '../supabase';
import { getSettings, saveSettings } from '../data/agendaData';

const FinancialForm: React.FC = () => {
  const navigate = useNavigate();
  
  // Estado Principal
  const [operation, setOperation] = useState<'COMPRA' | 'VENDA'>('COMPRA');
  const [expenseCategory, setExpenseCategory] = useState('PRODUTO'); // PRODUTO, EQUIPAMENTO, LIMPEZA, OUTROS
  const [loading, setLoading] = useState(false);
  const [sourceAccount, setSourceAccount] = useState<'cash' | 'bank'>('cash');
  
  // Lista de Produtos para o Dropdown
  const [productsList, setProductsList] = useState<any[]>([]);
  
  // Formulário Geral
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    supplier: '', // Fornecedor / Cliente
    paymentMethod: 'Dinheiro',
    observation: '',
    otherFees: '', // Taxas extras
  });

  // Formulário Específico de Produto
  const [productForm, setProductForm] = useState({
    productId: '', // ID do produto selecionado ou 'NEW'
    newProductName: '', // Nome se for novo
    quantity: '1',
    unitCost: '', // Preço de Custo
  });

  // Formulário Genérico (Valor livre)
  const [genericValue, setGenericValue] = useState('');

  // Carregar produtos ao montar
  useEffect(() => {
    const loadProducts = async () => {
        const { data } = await db.products().select('id, name, current_stock, cost_price').order('name');
        if (data) setProductsList(data);
    };
    loadProducts();
  }, []);

  // Selecionar produto preenche o custo automaticamente se existir
  useEffect(() => {
    if (productForm.productId && productForm.productId !== 'NEW') {
        const prod = productsList.find(p => p.id === productForm.productId);
        if (prod && prod.cost_price) {
            setProductForm(prev => ({ ...prev, unitCost: prod.cost_price.toString().replace('.', ',') }));
        }
    } else if (productForm.productId === 'NEW') {
        setProductForm(prev => ({ ...prev, unitCost: '' }));
    }
  }, [productForm.productId, productsList]);

  // Cálculo de Totais
  const totalOperation = useMemo(() => {
    const fees = parseFloat(formData.otherFees.replace(',', '.')) || 0;
    
    if (operation === 'COMPRA' && expenseCategory === 'PRODUTO') {
        const qty = parseInt(productForm.quantity) || 1;
        const cost = parseFloat(productForm.unitCost.replace(',', '.')) || 0;
        return (qty * cost) + fees;
    } else {
        const val = parseFloat(genericValue.replace(',', '.')) || 0;
        return val + fees;
    }
  }, [formData.otherFees, productForm, genericValue, operation, expenseCategory]);

  const handleSave = async () => {
    setLoading(true);
    try {
        let finalItemId = null;
        let finalItemName = formData.description;
        let finalCode = '';

        // LÓGICA DE PRODUTOS (COMPRA/REPOSIÇÃO)
        if (operation === 'COMPRA' && expenseCategory === 'PRODUTO') {
            if (!productForm.productId) throw new Error("Selecione um produto.");
            
            const qty = parseInt(productForm.quantity) || 1;
            const cost = parseFloat(productForm.unitCost.replace(',', '.')) || 0;

            if (productForm.productId === 'NEW') {
                if (!productForm.newProductName) throw new Error("Informe o nome do novo produto.");
                
                // Criar Novo Produto (Código é gerado pelo Trigger do Banco)
                const { data: newProd, error } = await db.products().insert({
                    name: productForm.newProductName,
                    current_stock: qty,
                    cost_price: cost,
                    min_stock: 5 // Padrão
                }).select().single();
                
                if (error) throw error;
                finalItemId = newProd.id;
                finalItemName = newProd.name;
                finalCode = newProd.code;

            } else {
                // Atualizar Produto Existente
                const existing = productsList.find(p => p.id === productForm.productId);
                if (existing) {
                    await db.products().update({
                        current_stock: existing.current_stock + qty,
                        cost_price: cost // Atualiza custo para o mais recente
                    }).eq('id', existing.id);
                    
                    finalItemId = existing.id;
                    finalItemName = existing.name;
                    finalCode = existing.code; // Se não tiver no frontend, o backend não atualiza, ok.
                }
            }
        } else {
            // Lógica Genérica
            if (!formData.description) throw new Error("Informe uma descrição.");
        }

        // SALVAR TRANSAÇÃO
        await addTransaction({
            date: formData.date,
            operation: operation,
            type: operation === 'COMPRA' ? (expenseCategory as any) : 'OUTROS',
            item: finalItemName, // Nome do produto ou descrição livre
            code: finalCode, // Código do produto se houver
            
            quantity: operation === 'COMPRA' && expenseCategory === 'PRODUTO' ? parseInt(productForm.quantity) : 1,
            unit_price: operation === 'COMPRA' && expenseCategory === 'PRODUTO' ? parseFloat(productForm.unitCost.replace(',', '.')) : totalOperation,
            
            // Valor Final (Negativo para Compra/Despesa, Positivo para Venda/Entrada)
            val: operation === 'COMPRA' ? -Math.abs(totalOperation) : Math.abs(totalOperation),
            
            client_supplier: formData.supplier,
            payment_method: formData.paymentMethod,
            status: 'Pago',
            pro: 'Caixa', // Usuário sistema
        });

        // ATUALIZAR SALDO
        const settings = await getSettings();
        if (settings) {
            const amount = Math.abs(totalOperation);
            const newSettings = { ...settings };
            
            if (operation === 'COMPRA') {
                if (sourceAccount === 'cash') {
                    newSettings.cash_balance = (newSettings.cash_balance || 0) - amount;
                } else {
                    newSettings.bank_balance = (newSettings.bank_balance || 0) - amount;
                }
            } else {
                // VENDA (Entrada Avulsa)
                if (sourceAccount === 'cash') {
                    newSettings.cash_balance = (newSettings.cash_balance || 0) + amount;
                } else {
                    newSettings.bank_balance = (newSettings.bank_balance || 0) + amount;
                }
            }
            await saveSettings(newSettings);
        }

        alert('Lançamento realizado com sucesso!');
        navigate(-1);

    } catch (err: any) {
        alert(err.message || 'Erro ao salvar.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Novo Lançamento</h1>
      </header>

      <div className="p-4 space-y-5 overflow-y-auto flex-1 bg-white pb-24">
        
        {/* Toggle Operação */}
        <div className="bg-gray-100 p-1 rounded-2xl flex">
            <button 
                onClick={() => { setOperation('COMPRA'); setExpenseCategory('PRODUTO'); }}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${operation === 'COMPRA' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400'}`}
            >
                <ArrowDown size={16} /> Despesa / Compra
            </button>
            <button 
                onClick={() => { setOperation('VENDA'); setExpenseCategory('OUTROS'); }}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${operation === 'VENDA' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400'}`}
            >
                <ArrowUp size={16} /> Entrada Avulsa
            </button>
        </div>

        {/* Seleção de Tipo de Despesa (Apenas se for Compra) */}
        {operation === 'COMPRA' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tipo de Despesa</label>
                <div className="grid grid-cols-2 gap-2">
                    {['PRODUTO', 'EQUIPAMENTO', 'LIMPEZA', 'OUTROS'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setExpenseCategory(cat)}
                            className={`py-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                                expenseCategory === cat 
                                ? 'border-red-500 bg-red-50 text-red-600' 
                                : 'border-gray-100 bg-white text-gray-500'
                            }`}
                        >
                            {cat === 'PRODUTO' ? 'Reposição Estoque' : cat}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="space-y-4">
            {/* DATA */}
            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Data do Lançamento</label>
                <input 
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 font-bold text-gray-700 text-sm outline-none focus:ring-1 focus:ring-blue-900"
                />
            </div>

            {/* FORMULÁRIO ESPECÍFICO: REPOSIÇÃO DE ESTOQUE */}
            {operation === 'COMPRA' && expenseCategory === 'PRODUTO' ? (
                <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                    <div className="flex items-center gap-2 text-blue-900 mb-2">
                        <Package size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Detalhes do Produto</span>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Produto</label>
                        <select 
                            value={productForm.productId}
                            onChange={e => setProductForm({...productForm, productId: e.target.value})}
                            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 font-bold text-gray-700 text-sm outline-none"
                        >
                            <option value="">Selecione...</option>
                            <option value="NEW">+ Cadastrar Novo Produto</option>
                            {productsList.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (Estoque: {p.current_stock})</option>
                            ))}
                        </select>
                    </div>

                    {productForm.productId === 'NEW' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1.5 px-1">Nome do Novo Produto</label>
                            <input 
                                type="text"
                                value={productForm.newProductName}
                                onChange={e => setProductForm({...productForm, newProductName: e.target.value})}
                                placeholder="Ex: Shampoo Premium 5L"
                                className="w-full bg-white border-2 border-blue-100 rounded-xl py-3 px-4 font-bold text-gray-800 text-sm outline-none"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Qtd Comprada</label>
                            <input 
                                type="number" 
                                value={productForm.quantity}
                                onChange={e => setProductForm({...productForm, quantity: e.target.value})}
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 font-bold text-gray-700 text-sm text-center outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Custo Unit. (R$)</label>
                            <input 
                                type="text" 
                                value={productForm.unitCost}
                                onChange={e => setProductForm({...productForm, unitCost: e.target.value})}
                                placeholder="0,00"
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 font-black text-gray-800 text-sm text-center outline-none"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                /* FORMULÁRIO GENÉRICO */
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Descrição / Motivo</label>
                        <input 
                            type="text" 
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            placeholder="Ex: Conta de Luz, Reparo Ar-condicionado..."
                            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 font-medium text-gray-700 text-sm outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Valor Total (R$)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={genericValue}
                                onChange={e => setGenericValue(e.target.value)}
                                placeholder="0,00"
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-10 font-black text-lg text-gray-800 outline-none"
                            />
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>
                </div>
            )}

            {/* CAMPOS COMUNS */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Fornecedor / Origem</label>
                    <input 
                        type="text" 
                        value={formData.supplier}
                        onChange={e => setFormData({...formData, supplier: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 font-medium text-gray-700 text-sm outline-none"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Pagamento via</label>
                    <select 
                        value={formData.paymentMethod}
                        onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 font-bold text-gray-700 text-sm outline-none"
                    >
                        <option>Dinheiro</option>
                        <option>Pix</option>
                        <option>Cartão Crédito</option>
                        <option>Cartão Débito</option>
                        <option>Boleto</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Conta de {operation === 'COMPRA' ? 'Saída' : 'Entrada'}</label>
                <select 
                    value={sourceAccount}
                    onChange={e => setSourceAccount(e.target.value as 'cash' | 'bank')}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 font-bold text-gray-700 text-sm outline-none"
                >
                    <option value="cash">Caixa da Barbearia</option>
                    <option value="bank">Conta Corrente</option>
                </select>
            </div>

            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Taxas Extras / Frete (R$)</label>
                <input 
                    type="text" 
                    value={formData.otherFees}
                    onChange={e => setFormData({...formData, otherFees: e.target.value})}
                    placeholder="0,00"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 font-medium text-gray-700 text-sm outline-none"
                />
            </div>
        </div>

        {/* CARD DE TOTAL FLUTUANTE */}
        <div className={`p-5 rounded-[2rem] mt-6 shadow-xl transition-colors ${operation === 'COMPRA' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}>
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total da Operação</span>
                    <span className="text-[10px] font-medium opacity-80">
                        {operation === 'COMPRA' && expenseCategory === 'PRODUTO' 
                            ? `${productForm.quantity} x R$ ${productForm.unitCost || '0'} + Taxas` 
                            : 'Valor + Taxas'}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-black block">R$ {totalOperation.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-[#1e3a8a] text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 mt-4"
        >
          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={22} />}
          Confirmar Lançamento
        </button>
      </div>
    </div>
  );
};

export default FinancialForm;
