import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { YouTubeEmbed } from '../../components/YouTubeEmbed'
import { backend } from '../../lib/backend'
import { CATEGORIES, categoryPhoto } from '../../lib/catalog'
import { compressImage } from '../../lib/image'
import { useStore } from '../../lib/store'
import type { StoreSettings } from '../../lib/types'
import { useToast } from './AdminApp'

const input = 'mt-1 w-full rounded-xl border border-piedra-200 bg-white px-3 py-2.5 text-[16px] outline-none focus:border-madera-500 sm:text-sm'

const FIELDS: { key: keyof StoreSettings; label: string; hint?: string; long?: boolean }[] = [
  { key: 'whatsapp', label: 'WhatsApp para recibir pedidos', hint: 'Con código de país y área, sin 0 ni 15. Ej.: 5493442123456' },
  { key: 'address', label: 'Dirección del local' },
  { key: 'city', label: 'Ciudad' },
  { key: 'hours', label: 'Horarios', hint: 'Ej.: Lunes a viernes de 8 a 12 y de 16 a 20 hs · Sábados de 8 a 13 hs' },
  { key: 'instagram', label: 'Instagram (link)', hint: 'Ej.: https://www.instagram.com/...' },
  { key: 'facebook', label: 'Facebook (link)' },
  { key: 'youtubeUrl', label: 'Video de YouTube o canal', hint: 'Pegá el link de cualquier video o de tu canal (ej.: https://youtu.be/... o https://www.youtube.com/watch?v=...). Aparecerá en los productos de la tienda.' },
  { key: 'email', label: 'E-mail' },
  { key: 'heroTitle', label: 'Título de la portada' },
  { key: 'heroText', label: 'Texto de la portada', long: true },
]

export function StoreSettingsForm() {
  const { settings, setSettings } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState<StoreSettings>(settings)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  const setCategoryImage = (slug: string, url: string | null) => {
    const next = { ...(draft.categoryImages || {}) }
    if (url) next[slug] = url
    else delete next[slug]
    setDraft({ ...draft, categoryImages: next })
  }

  const uploadCategory = async (slug: string, file: File | undefined) => {
    if (!file) return
    setUploading(slug)
    try {
      const blob = await compressImage(file, 1200)
      setCategoryImage(slug, await backend.uploadImage(blob, `ambiente-${slug}.webp`))
      toast('Foto cargada. Tocá “Guardar” para publicarla.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo subir la foto', 'error')
    } finally {
      setUploading(null)
    }
  }

  useEffect(() => setDraft(settings), [settings])

  const save = async () => {
    setBusy(true)
    try {
      const clean = { ...draft, whatsapp: draft.whatsapp.replace(/[^\d]/g, '') }
      await backend.saveSettings(clean)
      setSettings(clean)
      toast('Datos guardados')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Datos de la tienda</h1>
          <p className="text-sm text-piedra-500">Se muestran en el inicio, el pie de página y en los pedidos por WhatsApp.</p>
        </div>
        <button type="button" onClick={save} disabled={busy || !!uploading} className="rounded-xl bg-piedra-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <section className="grid gap-4 rounded-2xl border border-piedra-200 bg-white p-5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={`block text-sm ${f.long || f.key === 'whatsapp' || f.key === 'hours' ? 'sm:col-span-2' : ''}`}>
            <span className="font-medium">{f.label}</span>
            {f.long ? (
              <textarea rows={3} value={String(draft[f.key] ?? '')} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className={input} />
            ) : (
              <input value={String(draft[f.key] ?? '')} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className={input} />
            )}
            {f.hint && <span className="mt-1 block text-xs text-piedra-500">{f.hint}</span>}
          </label>
        ))}
      </section>

      {draft.youtubeUrl && (
        <section className="rounded-2xl border border-piedra-200 bg-white p-5">
          <h2 className="font-display font-bold">Vista previa del video configurado</h2>
          <p className="mt-1 text-sm text-piedra-500">Así lo verán los clientes en los detalles de productos:</p>
          <div className="mt-3 max-w-xl">
            <YouTubeEmbed url={draft.youtubeUrl} />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-piedra-200 bg-white p-5">
        <h2 className="font-display font-bold">Fotos de “Comprá por ambiente”</h2>
        <p className="mt-1 text-sm text-piedra-500">Se muestran en el inicio. Si no cargás una, se usa una foto de ejemplo.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c) => {
            const custom = draft.categoryImages?.[c.slug]
            return (
              <div key={c.slug} className="text-sm">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-piedra-100">
                  <img src={categoryPhoto(c, draft.categoryImages)} alt="" className="h-full w-full object-cover" />
                  {!custom && <span className="absolute left-1.5 top-1.5 rounded-md bg-piedra-900/70 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">Ejemplo</span>}
                </div>
                <p className="mt-1.5 font-medium">{c.name}</p>
                <div className="mt-1 flex gap-1.5">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-piedra-200 px-2 py-1.5 text-xs font-semibold hover:border-madera-500">
                    <Icon name="upload" size={14} /> {uploading === c.slug ? 'Subiendo…' : 'Cambiar'}
                    <input type="file" accept="image/*" className="sr-only" disabled={!!uploading}
                      onChange={(e) => { uploadCategory(c.slug, e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                  {custom && (
                    <button type="button" onClick={() => setCategoryImage(c.slug, null)} aria-label={`Volver a la foto de ejemplo de ${c.name}`}
                      className="rounded-lg border border-piedra-200 px-2 py-1.5 text-red-700 hover:border-red-300">
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
