export const parseNum = (str) => {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  const clean = str.replace(/[R$\s%]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

export const formatDateBR = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export const formatCurrency = (val) => {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};
