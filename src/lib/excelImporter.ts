import * as XLSX from 'xlsx'
import { CATEGORIES } from './catalog'
import { slugify } from './format'
import type { Product } from './types'

export interface ImportResult {
  newProducts: Product[]
  updatedProducts: Product[]
  unchangedCount: number
  skippedCount: number
  skippedCodes: string[]
  totalRows: number
  warnings: string[]
}

function cleanString(val: unknown): string {
  if (val == null) return ''
  return String(val).trim()
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function parsePrice(val: unknown): number | null {
  if (val == null) return null
  if (typeof val === 'number') return val > 0 ? Math.round(val) : null
  const s = String(val).replace(/[$]/g, '').trim()
  if (!s || s === '-' || s.toLowerCase() === 'consultar') return null

  // Manejo de formatos tipo 123.456,78 o 123456
  const clean = s.replace(/\./g, '').replace(',', '.')
  const num = Number(clean)
  return !Number.isNaN(num) && num > 0 ? Math.round(num) : null
}

function parseColors(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map((x) => cleanString(x)).filter(Boolean)
  const str = cleanString(val)
  if (!str) return []
  return str
    .split(/[,/|;-]/)
    .map((c) => c.trim())
    .filter(Boolean)
}

function detectCategory(catRaw: string, name: string): string {
  const normCat = normalizeHeader(catRaw)
  for (const c of CATEGORIES) {
    if (normalizeHeader(c.name) === normCat || normalizeHeader(c.slug) === normCat) {
      return c.slug
    }
  }

  // Si no coincide directo, adivinar por nombre
  const text = (name + ' ' + catRaw).toLowerCase()
  if (/sofa|sillon|living|futon|rinconero|esquinero/.test(text)) return 'sofas'
  if (/cama|colchon|sommier|cabecera|respaldo|almohada/.test(text)) return 'colchones'
  if (/comedor|mesa|silla|banqueta/.test(text)) return 'comedor'
  if (/placard|comoda|ropero|dormitorio|habitacion|mesita/.test(text)) return 'habitacion'
  if (/escritorio|silla gamer|oficina|estante|biblioteca/.test(text)) return 'oficina'
  if (/exterior|jardin|reposera/.test(text)) return 'exterior'

  return 'otros'
}

export async function parseProductsFile(file: File, existingProducts: Product[]): Promise<ImportResult> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('El archivo Excel o CSV no contiene ninguna hoja con datos.')

  const sheet = workbook.Sheets[sheetName]
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (rawRows.length === 0) {
    throw new Error('El archivo no contiene filas de datos.')
  }

  // Mapeo inteligente de encabezados
  const firstRow = rawRows[0]
  const keys = Object.keys(firstRow)

  const findKey = (patterns: RegExp[]): string | undefined => {
    return keys.find((k) => {
      const norm = normalizeHeader(k)
      return patterns.some((p) => p.test(norm))
    })
  }

  const codeKey = findKey([/^cod/, /^codigo/, /^code/, /^id/, /^art/])
  const nameKey = findKey([/^nom/, /^prod/, /^descrip/, /^item/, /^articulo/, /^titulo/, /^name/])
  const priceKey = findKey([/^prec/, /^list/, /^pvp/, /^valor/, /^imp/, /^price/])
  const catKey = findKey([/^cat/, /^rub/, /^secc/, /^departamento/])
  const subCatKey = findKey([/^subcat/, /^subrub/, /^linea/, /^tipo/])
  const brandKey = findKey([/^mar/, /^brand/, /^fab/])
  const measureKey = findKey([/^med/, /^dim/, /^measure/])
  const sizeKey = findKey([/^tam/, /^size/])
  const colorsKey = findKey([/^col/, /^termin/, /^acab/])
  const descKey = findKey([/^detall/, /^observ/, /^caract/])

  // Mapeo rápido de productos existentes para búsqueda eficiente
  const codeToExisting = new Map<string, Product>()
  const nameToExisting = new Map<string, Product>()

  for (const p of existingProducts) {
    if (p.code) {
      codeToExisting.set(normalizeHeader(p.code), p)
    }
    if (p.name) {
      const normN = normalizeHeader(p.name)
      if (normN.length > 5) {
        nameToExisting.set(normN, p)
      }
    }
  }

  const seenInBatch = new Set<string>()
  const newProducts: Product[] = []
  const updatedProducts: Product[] = []
  let unchangedCount = 0
  const skippedCodes: string[] = []
  const warnings: string[] = []

  let autoIdCounter = 1

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]

    let name = nameKey ? cleanString(row[nameKey]) : ''
    let code = codeKey ? cleanString(row[codeKey]) : ''

    // Si la fila está totalmente vacía en nombre y código, ignorar
    if (!name && !code) continue

    const normCode = normalizeHeader(code)
    const normName = normalizeHeader(name)

    // Búsqueda de producto existente por código o nombre largo
    const existing = (normCode ? codeToExisting.get(normCode) : undefined) ||
                     (normName.length > 5 ? nameToExisting.get(normName) : undefined)

    if (existing) {
      const dedupeKey = normCode || existing.id
      if (seenInBatch.has(dedupeKey)) {
        skippedCodes.push(`${code || existing.code} (repetido en archivo)`)
        continue
      }
      seenInBatch.add(dedupeKey)

      let changed = false
      const updated: Product = { ...existing }

      // 1. Nombre: solo si viene no vacío en el archivo
      if (nameKey && cleanString(row[nameKey])) {
        const newName = cleanString(row[nameKey])
        if (newName !== existing.name) {
          updated.name = newName
          changed = true
        }
      }

      // 2. Descripción: solo si viene en el archivo y no está vacía
      if (descKey && cleanString(row[descKey])) {
        const newDesc = cleanString(row[descKey])
        if (newDesc !== existing.description) {
          updated.description = newDesc
          changed = true
        }
      }

      // 3. Precio de lista: solo si la celda tiene un valor numérico válido mayor a 0
      // Si la celda está vacía, con '-' o 'consultar', se PRESERVA el precio que ya tenía
      if (priceKey) {
        const newPrice = parsePrice(row[priceKey])
        if (newPrice != null && newPrice !== existing.price_list) {
          updated.price_list = newPrice
          changed = true
        }
      }

      // 4. Categoría: solo si viene especificada y no está vacía
      if (catKey && cleanString(row[catKey])) {
        const rawC = cleanString(row[catKey])
        const newCat = detectCategory(rawC, updated.name)
        if (newCat && newCat !== 'otros' && newCat !== existing.category) {
          updated.category = newCat
          changed = true
        }
      }

      // 5. Subcategoría
      if (subCatKey && cleanString(row[subCatKey])) {
        const newSub = cleanString(row[subCatKey])
        if (newSub !== existing.subcategory) {
          updated.subcategory = newSub
          changed = true
        }
      }

      // 6. Marca
      if (brandKey && cleanString(row[brandKey])) {
        const newBrand = cleanString(row[brandKey])
        if (newBrand !== existing.brand) {
          updated.brand = newBrand
          changed = true
        }
      }

      // 7. Medidas
      if (measureKey && cleanString(row[measureKey])) {
        const newMeasure = cleanString(row[measureKey])
        if (newMeasure !== existing.measure) {
          updated.measure = newMeasure
          changed = true
        }
      }

      // 8. Tamaño
      if (sizeKey && cleanString(row[sizeKey])) {
        const newSize = cleanString(row[sizeKey])
        if (newSize !== existing.size) {
          updated.size = newSize
          changed = true
        }
      }

      // 9. Colores: solo si vienen especificados
      if (colorsKey) {
        const newColors = parseColors(row[colorsKey])
        if (newColors.length > 0 && JSON.stringify(newColors) !== JSON.stringify(existing.colors)) {
          updated.colors = newColors
          changed = true
        }
      }

      // 10. Código: si el existente no tenía código y la planilla lo trae
      if (code && !existing.code) {
        updated.code = code
        changed = true
      }

      // NOTA: Se PRESERVAN siempre y de forma intacta:
      // - images (fotos cargadas en la web)
      // - youtube_url (videos vinculados)
      // - featured (si está en destacados)
      // - available (disponibilidad)
      // - discount_pct (descuento)
      // - sort (ordenamiento en la tienda)
      // - hidden (visibilidad)
      // - offer y offer_label

      if (changed) {
        updatedProducts.push(updated)
      } else {
        unchangedCount++
      }

      continue
    }

    // SI NO EXISTE: se crea como producto nuevo
    if (!name && code) name = `Producto ${code}`
    if (!code) code = `PRD-${Date.now().toString().slice(-4)}-${autoIdCounter++}`

    const finalNormCode = normalizeHeader(code)
    if (seenInBatch.has(finalNormCode)) {
      skippedCodes.push(`${code} (repetido en archivo)`)
      continue
    }
    seenInBatch.add(finalNormCode)

    const rawCat = catKey ? cleanString(row[catKey]) : ''
    const category = detectCategory(rawCat, name)
    const subcategory = subCatKey ? cleanString(row[subCatKey]) || null : null
    const priceList = priceKey ? parsePrice(row[priceKey]) : null
    const brand = brandKey ? cleanString(row[brandKey]) || null : null
    const measure = measureKey ? cleanString(row[measureKey]) || null : null
    const size = sizeKey ? cleanString(row[sizeKey]) || null : null
    const colors = colorsKey ? parseColors(row[colorsKey]) : []
    const description = descKey ? cleanString(row[descKey]) : ''

    const id = slugify(code || name) || `prod-${Date.now()}-${autoIdCounter++}`

    newProducts.push({
      id,
      code,
      name,
      description,
      category,
      subcategory,
      brand,
      size,
      measure,
      material: null,
      kind: null,
      model: null,
      colors,
      price_list: priceList,
      discount_pct: 0,
      available: true,
      featured: false,
      images: [],
      sort: 9999 + newProducts.length,
      hidden: false,
      youtube_url: '',
      offer: '',
      offer_label: '',
    })
  }

  return {
    newProducts,
    updatedProducts,
    unchangedCount,
    skippedCount: skippedCodes.length,
    skippedCodes,
    totalRows: rawRows.length,
    warnings,
  }
}
