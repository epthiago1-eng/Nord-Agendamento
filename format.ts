// Converte um valor digitado no formato monetário brasileiro (ponto = milhar,
// vírgula = decimal — ex: "1.234,56") para number. Também aceita valores já
// no formato com ponto decimal simples (ex: vindo de um <input type="number">
// ou já um number), sem quebrar esses casos.
//
// Regra: quando há vírgula, ela é sempre o separador decimal e qualquer ponto
// antes dela é separador de milhar (removido antes de converter). O bug que
// isso corrige: `parseFloat(valor.replace(',', '.'))` sozinho transformava
// "1.200,00" em "1.200.00", e parseFloat parava no segundo ponto — R$1.200,00
// virava R$1,20 silenciosamente, sem nenhum erro.
export const parseCurrencyBR = (raw: string | number | null | undefined): number => {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;

  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;

  const value = parseFloat(normalized);
  return isNaN(value) ? 0 : value;
};
