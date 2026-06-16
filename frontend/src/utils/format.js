const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export const currency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

export const monthName = (mes) => MONTHS[parseInt(mes) - 1] ?? ''
export const monthShort = (mes) => MONTHS_SHORT[parseInt(mes) - 1] ?? ''

export const monthLabel = (mes, ano) => `${monthName(mes)} ${ano}`
