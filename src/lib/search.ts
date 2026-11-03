import { categoryLabel } from './catalog'
import { normalize } from './format'
import type { Product } from './types'

// Plural -> singular simple, para que "mesa" encuentre "mesas" y "colchones" encuentre "colchón"
function stem(word: string) {
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1)
  return word
}

const STOP = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'con', 'para', 'en', 'c', 'x'])

function words(text: string) {
  return normalize(text).split(' ').filter((w) => w && !STOP.has(w))
}

function haystack(p: Product) {
  return words(
    [p.name, p.code, p.brand, categoryLabel(p.category, p.subcategory), p.size, p.material, p.colors.join(' ')]
      .filter(Boolean)
      .join(' '),
  ).map(stem)
}

/** Devuelve los productos que coinciden con la búsqueda, los más relevantes primero */
export function searchProducts(products: Product[], query: string): Product[] {
  const q = words(query).map(stem)
  if (!q.length) return []
  const scored: { p: Product; score: number }[] = []
  for (const p of products) {
    const hay = haystack(p)
    const nameWords = words(p.name).map(stem)
    let score = 0
    let all = true
    for (const t of q) {
      if (nameWords.some((w) => w === t)) score += 3
      else if (nameWords.some((w) => w.startsWith(t))) score += 2
      else if (hay.some((w) => w.startsWith(t))) score += 1
      else { all = false; break }
    }
    // "mesa" prioriza la subcategoría Mesas por sobre Mesas de luz
    const sub = words(categoryLabel(p.category, p.subcategory).split(' · ').pop() || '').map(stem)
    if (all && sub.length === q.length && sub.every((w, i) => w === q[i])) score += 2
    if (normalize(p.code) === normalize(query)) { score += 10; all = true }
    if (all && score > 0) scored.push({ p, score: score + (p.available ? 0.5 : 0) })
  }
  return scored.sort((a, b) => b.score - a.score || a.p.sort - b.p.sort).map((s) => s.p)
}
