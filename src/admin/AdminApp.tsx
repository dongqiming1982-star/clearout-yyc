import { useEffect, useMemo, useState } from 'react'
import { adminGet, type AdminResource } from './adminApi'

type AnyRecord = Record<string, any>

const TOKEN_KEY = 'clearout_admin_token_v30'

const RESOURCES: AdminResource[] = [
  'summary',
  'providers',
  'leads',
  'claims',
  'settings',
  'dispatch-status',
  'dispatch-overview',
]

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function pickArray(payload: any, preferredKey: string): AnyRecord[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  if (Array.isArray(payload[preferredKey])) return payload[preferredKey]

  for (const key of Object.keys(payload)) {
    if (Array.isArray(payload[key])) return payload[key]
  }

  return []
}

function renderValue(value: any): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

function SummaryCards({ summary }: { summary: AnyRecord | null }) {
  if (!summary) return null

  const clean = isRecord(summary.summary) ? summary.summary : summary
  const entries = Object.entries(clean).filter(([, value]) => {
    return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean'
  })

  return (
    <section className="grid gap-3 md:grid-cols-4">
      {entries.slice(0, 16).map(([key, value]) => (
        <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {key.replace(/_/g, ' ')}
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">
            {renderValue(value)}
          </div>
        </div>
      ))}
    </section>
  )
}

function SmartTable({
  title,
  rows,
  preferredColumns,
}: {
  title: string
  rows: AnyRecord[]
  preferredColumns: string[]
}) {
  const columns = useMemo(() => {
    const all = new Set<string>()

    for (const row of rows) {
      Object.keys(row || {}).forEach((key) => all.add(key))
    }

    const preferred = preferredColumns.filter((key) => all.has(key))
    const rest = Array.from(all)
      .filter((key) => !preferred.includes(key))
      .slice(0, Math.max(0, 10 - preferred.length))

    return [...preferred, ...rest]
  }, [rows, preferredColumns])

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{rows.length} records</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500">No records found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="whitespace-nowrap px-4 py-3 font-semibold">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.id || `${title}-${index}`} className="align-top">
                  {columns.map((col) => (
                    <td key={col} className="max-w-[260px] whitespace-nowrap px-4 py-3 text-slate-700">
                      <span className="block truncate" title={renderValue(row[col])}>
                        {renderValue(row[col])}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function JsonPanel({ title, data }: { title: string; data: any }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap px-5 py-4 text-xs text-slate-700">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  )
}

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'leads' | 'claims' | 'settings' | 'dispatch'>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<Partial<Record<AdminResource, any>>>({})

  const providers = pickArray(data.providers, 'providers')
  const leads = pickArray(data.leads, 'leads')
  const claims = pickArray(data.claims, 'claims')

  async function loadAll(currentToken = token) {
    const cleanToken = currentToken.trim()

    if (!cleanToken) {
      setError('ADMIN_TOKEN is required.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const results = await Promise.all(
        RESOURCES.map(async (resource) => {
          const payload = await adminGet(resource, cleanToken)
          return [resource, payload] as const
        }),
      )

      setData(Object.fromEntries(results))
      localStorage.setItem(TOKEN_KEY, cleanToken)

      if (new URLSearchParams(window.location.search).has('admin2')) {
        window.history.replaceState(null, '', '/admin2')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadAll(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setData({})
    setError('')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Clearout YYC
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              AdminApp / Maintenance Console
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              New React admin dashboard. Read-only V30.1 build.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              placeholder="ADMIN_TOKEN"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 sm:w-80"
            />
            <button
              onClick={() => loadAll()}
              disabled={loading}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
            <button
              onClick={logout}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <nav className="mb-6 flex flex-wrap gap-2">
          {[
            ['overview', 'Overview'],
            ['providers', `Providers (${providers.length})`],
            ['leads', `Leads (${leads.length})`],
            ['claims', `Claims (${claims.length})`],
            ['settings', 'Settings'],
            ['dispatch', 'Dispatch'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeTab === key
                  ? 'bg-red-700 text-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="space-y-5">
          {activeTab === 'overview' ? (
            <>
              <SummaryCards summary={data.summary || null} />
              <div className="grid gap-5 lg:grid-cols-2">
                <JsonPanel title="Dispatch Overview" data={data['dispatch-overview'] || {}} />
                <JsonPanel title="Dispatch Status" data={data['dispatch-status'] || {}} />
              </div>
            </>
          ) : null}

          {activeTab === 'providers' ? (
            <SmartTable
              title="Providers"
              rows={providers}
              preferredColumns={[
                'id',
                'business_name',
                'contact_name',
                'email',
                'phone',
                'approved',
                'active',
                'email_notifications_enabled',
                'sms_notifications_enabled',
                'created_at',
              ]}
            />
          ) : null}

          {activeTab === 'leads' ? (
            <SmartTable
              title="Leads"
              rows={leads}
              preferredColumns={[
                'id',
                'customer_name',
                'name',
                'phone',
                'email',
                'service_type',
                'community',
                'status',
                'dispatch_status',
                'created_at',
              ]}
            />
          ) : null}

          {activeTab === 'claims' ? (
            <SmartTable
              title="Claims"
              rows={claims}
              preferredColumns={[
                'id',
                'lead_id',
                'provider_id',
                'claim_type',
                'status',
                'created_at',
              ]}
            />
          ) : null}

          {activeTab === 'settings' ? (
            <JsonPanel title="Settings / Platform Controls" data={data.settings || {}} />
          ) : null}

          {activeTab === 'dispatch' ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <JsonPanel title="Dispatch Status" data={data['dispatch-status'] || {}} />
              <JsonPanel title="Dispatch Overview" data={data['dispatch-overview'] || {}} />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
