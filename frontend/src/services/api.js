const BASE = 'http://localhost:8000'

const json = (res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const getSummary = (mes, ano) =>
  fetch(`${BASE}/summary?mes=${mes}&ano=${ano}`).then(json)

export const getTransactions = (mes, ano) =>
  fetch(`${BASE}/transactions?mes=${mes}&ano=${ano}`).then(json)

export const getHistory = () =>
  fetch(`${BASE}/history`).then(json)

export const getItemSummary = (mes, ano) =>
  fetch(`${BASE}/summary/items?mes=${mes}&ano=${ano}`).then(json)

export const updateTransaction = (id, data) =>
  fetch(`${BASE}/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(json)

export const deleteTransaction = (id) =>
  fetch(`${BASE}/transactions/${id}`, { method: 'DELETE' }).then(json)
