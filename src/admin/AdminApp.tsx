import { useMemo, useState } from 'react'
import { adminGet, adminPost, type AdminResource } from './adminApi'

type AnyRecord = Record<string, any>
type Lang = 'en' | 'zh'

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

const TEXT = {
  en: {
    title: 'Clearout YYC AdminApp',
    sub: 'React maintenance console. Legacy admin remains available at /admin/.',
    legacy: 'Legacy Admin',
    load: 'Load',
    loading: 'Loading...',
    logout: 'Logout',
    refresh: 'Refresh',
    controls: 'Platform Controls',
    providers: 'Providers',
    leads: 'Leads',
    claims: 'Claims',
    summary: 'Summary',
    dispatchOverview: 'Dispatch Queue Overview',
    customerRequests: 'Customer submissions',
    customerRequestsDesc: 'When paused, customers cannot submit new clearout requests.',
    leadDispatch: 'Lead dispatch',
    leadDispatchDesc: 'When paused, leads can enter admin but will not be sent to providers.',
    providerClaiming: 'Provider claiming',
    providerClaimingDesc: 'When paused, providers cannot unlock customer contact details.',
    exclusiveClaims: 'Exclusive buyout',
    exclusiveClaimsDesc: 'When off, provider claim pages hide Exclusive and backend rejects exclusive claims.',
    dispatchChannel: 'Dispatch channel',
    dispatchChannelDesc: 'Controls whether new dispatches use Email or SMS.',
    pauseRequests: 'Pause submissions',
    enableRequests: 'Enable submissions',
    pauseDispatch: 'Pause dispatch',
    enableDispatch: 'Enable dispatch',
    pauseClaiming: 'Pause claiming',
    enableClaiming: 'Enable claiming',
    disableExclusive: 'Disable exclusive',
    enableExclusive: 'Enable exclusive',
    dispatchPendingLeads: 'Dispatch pending leads',
    dispatchingPendingLeads: 'Dispatching pending leads...',
    settingsUpdated: 'Settings updated.',
    pendingDispatchComplete: 'Pending dispatch complete.',
    recommendedDefault: 'Recommended default: requests ON, dispatch ON, claiming ON, exclusive buyout OFF, channel Email.',
    pendingDispatchLeads: 'Pending dispatch leads',
    pendingEmail: 'Pending Email',
    pendingSms: 'Pending SMS',
    failedSends: 'Failed sends',
    sentTotal: 'Sent total',
    dispatchOverviewNote: 'After clicking Dispatch pending leads, check whether pending dispatch / pending sends remain here.',
    providersTotal: 'Providers total',
    providersPending: 'Pending providers',
    leadsTotal: 'Leads total',
    claimsTotal: 'Claims total',
    todayNew: 'Today new',
    monthNew: 'Month new',
    today: 'Today',
    thisMonth: 'This month',
    provider: 'Provider',
    business: 'Business',
    contact: 'Contact',
    email: 'Email',
    phone: 'Phone',
    emailNotifications: 'Email notifications',
    smsNotifications: 'SMS notifications',
    status: 'Status',
    created: 'Created',
    actions: 'Actions',
    approve: 'Approve',
    activate: 'Activate',
    suspend: 'Suspend',
    subscribed: 'Subscribed',
    unsubscribed: 'Unsubscribed',
    resubscribed: 'Resubscribed',
    optedIn: 'Opted in',
    optedOut: 'Opted out',
    approved: 'approved',
    pending: 'pending',
    active: 'active',
    inactive: 'inactive',
    lead: 'Lead',
    customer: 'Customer',
    task: 'Task',
    sharedSlots: 'Shared slots',
    publish: 'Publish',
    queue: 'Queue',
    expire: 'Expire',
    photos: 'Photos',
    dispatch: 'Dispatch',
    notCreated: 'not created',
    total: 'total',
    sent: 'sent',
    failed: 'failed',
    raw: 'Raw Data',
    access: 'Access',
    exclusiveAccess: 'Exclusive',
    sharedAccess: 'Shared',
    leadStatusMap: {
      draft: 'draft',
      queued: 'queued',
      published: 'published',
      shared_active: 'shared active',
      exclusive_claimed: 'exclusive claimed',
      closed: 'closed',
      expired: 'expired',
    } as Record<string, string>,
  },
  zh: {
    title: 'Clearout YYC 后台',
    sub: 'React 维护后台。旧后台仍保留在 /admin/。',
    legacy: '旧后台',
    load: '加载',
    loading: '加载中...',
    logout: '退出',
    refresh: '刷新',
    controls: '平台总控',
    providers: '服务商',
    leads: '客户需求',
    claims: '认领记录',
    summary: '统计总览',
    dispatchOverview: '派单队列总览',
    customerRequests: '客户提交',
    customerRequestsDesc: '关闭后，客户不能提交新的清运需求。',
    leadDispatch: '系统派单',
    leadDispatchDesc: '关闭后，客户需求仍可进入后台，但不会发送给服务商。',
    providerClaiming: '服务商接单',
    providerClaimingDesc: '关闭后，服务商不能领取客户联系方式。',
    exclusiveClaims: '独家买断',
    exclusiveClaimsDesc: '关闭后，服务商认领页不显示独家按钮，后端也会拒绝独家认领。',
    dispatchChannel: '派单通道',
    dispatchChannelDesc: '控制新派单使用 Email 还是 SMS。',
    pauseRequests: '暂停提交',
    enableRequests: '开启提交',
    pauseDispatch: '暂停派单',
    enableDispatch: '开启派单',
    pauseClaiming: '暂停接单',
    enableClaiming: '开启接单',
    disableExclusive: '关闭独家买断',
    enableExclusive: '开启独家买断',
    dispatchPendingLeads: '派出积压需求',
    dispatchingPendingLeads: '正在派出积压需求...',
    settingsUpdated: '设置已更新。',
    pendingDispatchComplete: '积压派单已处理。',
    recommendedDefault: '当前默认建议：客户提交 ON，系统派单 ON，服务商接单 ON，独家买断 OFF，派单通道 Email。',
    pendingDispatchLeads: '待派单需求',
    pendingEmail: '待发送 Email',
    pendingSms: '待发送 SMS',
    failedSends: '发送失败',
    sentTotal: '已发送总数',
    dispatchOverviewNote: '点击“派出积压需求”后，看这里是否还有待派单 / 待发送。',
    providersTotal: '服务商总数',
    providersPending: '待审核服务商',
    leadsTotal: '客户需求总数',
    claimsTotal: '认领总数',
    todayNew: '今日新增',
    monthNew: '本月新增',
    today: '今日',
    thisMonth: '本月',
    provider: '服务商',
    business: '商家',
    contact: '联系人',
    email: '邮箱',
    phone: '电话',
    emailNotifications: '邮件通知',
    smsNotifications: '短信通知',
    status: '状态',
    created: '创建时间',
    actions: '操作',
    approve: '审核通过',
    activate: '启用',
    suspend: '暂停',
    subscribed: '已订阅',
    unsubscribed: '已退订',
    resubscribed: '已重新订阅',
    optedIn: '已开启',
    optedOut: '已关闭',
    approved: '已审核',
    pending: '待审核',
    active: '启用',
    inactive: '停用',
    lead: '需求',
    customer: '客户',
    task: '任务',
    sharedSlots: '共享名额',
    publish: '发布',
    queue: '排队',
    expire: '过期',
    photos: '照片',
    dispatch: '派单',
    notCreated: '未创建',
    total: '总数',
    sent: '已发送',
    failed: '失败',
    raw: '原始数据',
    access: '类型',
    exclusiveAccess: '独家',
    sharedAccess: '共享',
    leadStatusMap: {
      draft: '草稿',
      queued: '排队中',
      published: '已发布',
      shared_active: '共享认领中',
      exclusive_claimed: '独家已认领',
      closed: '已关闭',
      expired: '已过期',
    } as Record<string, string>,
  },
}

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

function pickObject(payload: any, preferredKey: string): AnyRecord {
  if (!isRecord(payload)) return {}
  if (isRecord(payload[preferredKey])) return payload[preferredKey]
  return payload
}

function escText(value: any): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatDate(value: any): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function statusText(status: any, lang: Lang): string {
  const key = String(status || '')
  return TEXT[lang].leadStatusMap[key] || key || '—'
}

function Badge({ children, tone = 'neutral' }: { children: any; tone?: 'ok' | 'bad' | 'mid' | 'neutral' }) {
  const cls =
    tone === 'ok'
      ? 'bg-emerald-100 text-emerald-800'
      : tone === 'bad'
        ? 'bg-red-100 text-red-800'
        : tone === 'mid'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-700'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      {children}
    </span>
  )
}

function ActionButton({
  children,
  tone = 'primary',
  onClick,
  disabled,
}: {
  children: any
  tone?: 'primary' | 'secondary' | 'warning'
  onClick: () => void
  disabled?: boolean
}) {
  const cls =
    tone === 'warning'
      ? 'bg-amber-800 text-white hover:bg-amber-900'
      : tone === 'secondary'
        ? 'bg-slate-100 text-slate-950 hover:bg-slate-200'
        : 'bg-red-700 text-white hover:bg-red-800'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  )
}

function StatCard({
  label,
  value,
  todayLabel,
  todayValue,
  monthLabel,
  monthValue,
}: {
  label: string
  value: any
  todayLabel: string
  todayValue: any
  monthLabel: string
  monthValue: any
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-3xl font-black text-slate-950">{escText(value)}</div>
      <div className="mt-1 text-sm font-semibold text-slate-600">{label}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{todayLabel} {escText(todayValue)}</Badge>
        <Badge>{monthLabel} {escText(monthValue)}</Badge>
      </div>
    </div>
  )
}

function ControlCard({
  title,
  desc,
  status,
  children,
}: {
  title: string
  desc: string
  status: any
  children: any
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
        </div>
        {status}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function DispatchBadge({ info, lang }: { info: any; lang: Lang }) {
  const t = TEXT[lang]
  if (!info) {
    return <Badge tone="bad">{t.dispatch}: {t.notCreated}</Badge>
  }

  const channel = info.channel || info.lead_dispatch_channel || info.dispatch_channel || ''
  const total = Number(info.total || info.count || info.notification_count || 0)
  const sent = Number(info.sent || info.sent_count || 0)
  const failed = Number(info.failed || info.failed_count || 0)
  const pending = Number(info.pending || info.pending_count || 0)

  const parts = [`${t.dispatch}: ${channel || '—'}`, `${t.total} ${total}`]
  if (sent) parts.push(`${t.sent} ${sent}`)
  if (failed) parts.push(`${t.failed} ${failed}`)
  if (pending) parts.push(`${lang === 'zh' ? '待发送' : 'pending'} ${pending}`)

  return <Badge tone={failed ? 'bad' : sent ? 'ok' : 'mid'}>{parts.join(' · ')}</Badge>
}

function PhotosBadge({ lead, lang }: { lead: AnyRecord; lang: Lang }) {
  const count = Number(lead.photo_count || 0)
  const expired = Number(lead.photo_expired_count || 0)
  if (!count) return null

  return (
    <div className="mt-2">
      <Badge tone={expired ? 'bad' : 'ok'}>
        {TEXT[lang].photos}: {count}{expired ? ` · ${lang === 'zh' ? '已过期' : 'expired'} ${expired}` : ''}
      </Badge>
    </div>
  )
}

function JsonPanel({ title, data }: { title: string; data: any }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>
      <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap px-5 py-4 text-xs text-slate-700">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  )
}

export default function AdminApp() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('clearout_admin_lang_v30') as Lang) || 'zh')
  const [token, setToken] = useState('')
  const [activeTab, setActiveTab] = useState<'providers' | 'leads' | 'claims' | 'raw'>('providers')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState<Partial<Record<AdminResource, any>>>({})
  const [hasLoaded, setHasLoaded] = useState(false)

  const t = TEXT[lang]

  const summary = pickObject(data.summary, 'summary')
  const settings = pickObject(data.settings, 'settings')
  const overview = pickObject(data['dispatch-overview'], 'overview')
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
    setMessage('')

    try {
      const results = await Promise.all(
        RESOURCES.map(async (resource) => {
          const payload = await adminGet(resource, cleanToken)
          return [resource, payload] as const
        }),
      )

      setData(Object.fromEntries(results))
      setHasLoaded(true)

      if (new URLSearchParams(window.location.search).has('admin2')) {
        window.history.replaceState(null, '', '/admin2')
      }
    } catch (err: any) {
      setHasLoaded(false)
      setError(err?.message || 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }


  function changeLang(next: Lang) {
    setLang(next)
    localStorage.setItem('clearout_admin_lang_v30', next)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setData({})
    setHasLoaded(false)
    setError('')
    setMessage('')
  }

  async function updateSetting(key: string, value: any) {
    setBusy(`setting:${key}`)
    setError('')
    setMessage('')

    try {
      await adminPost('/api/admin?resource=settings&action=update', token, { key, value })
      setMessage(t.settingsUpdated)
      await loadAll(token)
    } catch (err: any) {
      setError(err?.message || 'Settings update failed.')
    } finally {
      setBusy('')
    }
  }

  async function dispatchPendingLeads() {
    setBusy('dispatch-pending')
    setError('')
    setMessage(t.dispatchingPendingLeads)

    try {
      await adminPost('/api/admin?resource=dispatch&action=pending', token, {})
      setMessage(t.pendingDispatchComplete)
      await loadAll(token)
    } catch (err: any) {
      setError(err?.message || 'Dispatch pending leads failed.')
    } finally {
      setBusy('')
    }
  }

  async function providerAction(providerId: string, action: string) {
    setBusy(`provider:${providerId}:${action}`)
    setError('')
    setMessage('')

    try {
      await adminPost('/api/admin?resource=provider&action=update', token, {
        provider_id: providerId,
        action,
      })
      await loadAll(token)
    } catch (err: any) {
      setError(err?.message || 'Provider action failed.')
    } finally {
      setBusy('')
    }
  }

  async function leadAction(leadId: string, action: string) {
    setBusy(`lead:${leadId}:${action}`)
    setError('')
    setMessage('')

    try {
      await adminPost('/api/admin?resource=lead&action=update', token, {
        lead_id: leadId,
        action,
      })
      await loadAll(token)
    } catch (err: any) {
      setError(err?.message || 'Lead action failed.')
    } finally {
      setBusy('')
    }
  }

  const dispatchCards = useMemo(() => {
    const notifications = isRecord(overview.notifications) ? overview.notifications : {}

    const pendingDispatchLeads = Number(overview.pending_dispatch_leads || 0)
    const emailPending = Number(notifications.email_pending ?? overview.email_pending ?? 0)
    const smsPending = Number(notifications.sms_pending ?? overview.sms_pending ?? 0)
    const failed = Number(notifications.failed ?? overview.failed ?? overview.failed_sends ?? 0)
    const sentTotal = Number(notifications.sent ?? notifications.sent_total ?? overview.sent_total ?? overview.sent ?? 0)

    return [
      [t.pendingDispatchLeads, pendingDispatchLeads, pendingDispatchLeads ? 'mid' : 'ok'],
      [t.pendingEmail, emailPending, emailPending ? 'mid' : 'ok'],
      [t.pendingSms, smsPending, smsPending ? 'mid' : 'ok'],
      [t.failedSends, failed, failed ? 'bad' : 'ok'],
      [t.sentTotal, sentTotal, 'ok'],
    ] as const
  }, [overview, t])

  const tabs = [
    ['providers', t.providers],
    ['leads', t.leads],
    ['claims', t.claims],
    ['raw', t.raw],
  ] as const

  if (!hasLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight">{t.title}</h1>
              <p className="mt-2 text-sm font-medium text-slate-600">
                {lang === 'zh'
                  ? '请输入 ADMIN_TOKEN 登录。未认证前不显示任何后台数据。'
                  : 'Enter ADMIN_TOKEN to log in. No dashboard data is shown before authentication.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => changeLang('en')}
                className={`rounded-full px-4 py-2 text-sm font-black ${lang === 'en' ? 'bg-red-700 text-white' : 'bg-white text-slate-900 ring-1 ring-slate-200'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => changeLang('zh')}
                className={`rounded-full px-4 py-2 text-sm font-black ${lang === 'zh' ? 'bg-red-700 text-white' : 'bg-white text-slate-900 ring-1 ring-slate-200'}`}
              >
                中文
              </button>
              <a
                href="/admin/"
                className="rounded-full bg-slate-100 px-4 py-2 text-center text-sm font-black text-slate-900"
              >
                {t.legacy}
              </a>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                placeholder="ADMIN_TOKEN"
                className="w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-slate-900 sm:w-80"
              />
              <ActionButton onClick={() => loadAll()} disabled={loading}>
                {loading ? t.loading : t.load}
              </ActionButton>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[900px] px-5 py-12">
          {error ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-800">
              {error}
            </div>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              {lang === 'zh' ? '后台登录' : 'Admin Login'}
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {lang === 'zh'
                ? '输入 ADMIN_TOKEN 后点击加载。认证成功之前，不显示统计、总控、服务商、客户需求、认领记录或任何操作按钮。'
                : 'Enter ADMIN_TOKEN and click Load. Before authentication succeeds, stats, controls, providers, leads, claims, and action buttons are hidden.'}
            </p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              {lang === 'zh'
                ? '旧后台仍保留在 /admin/。新后台 /admin2 目前作为并行维护后台。'
                : 'Legacy admin remains at /admin/. Admin2 is currently a parallel maintenance console.'}
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{t.title}</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">{t.sub}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => changeLang('en')}
              className={`rounded-full px-4 py-2 text-sm font-black ${lang === 'en' ? 'bg-red-700 text-white' : 'bg-white text-slate-900 ring-1 ring-slate-200'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => changeLang('zh')}
              className={`rounded-full px-4 py-2 text-sm font-black ${lang === 'zh' ? 'bg-red-700 text-white' : 'bg-white text-slate-900 ring-1 ring-slate-200'}`}
            >
              中文
            </button>
            <a
              href="/admin/"
              className="rounded-full bg-slate-100 px-4 py-2 text-center text-sm font-black text-slate-900"
            >
              {t.legacy}
            </a>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              placeholder="ADMIN_TOKEN"
              className="w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-slate-900 sm:w-80"
            />
            <ActionButton onClick={() => loadAll()} disabled={loading}>
              {loading ? t.loading : t.load}
            </ActionButton>
            <ActionButton tone="secondary" onClick={logout}>
              {t.logout}
            </ActionButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-5 py-7">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-800">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800">
            {message}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            label={t.providersTotal}
            value={summary.providers_total}
            todayLabel={t.todayNew}
            todayValue={summary.providers_today}
            monthLabel={t.monthNew}
            monthValue={summary.providers_month}
          />
          <StatCard
            label={t.providersPending}
            value={summary.providers_pending}
            todayLabel={t.today}
            todayValue={summary.providers_pending_today}
            monthLabel={t.thisMonth}
            monthValue={summary.providers_pending_month}
          />
          <StatCard
            label={t.leadsTotal}
            value={summary.leads_total}
            todayLabel={t.todayNew}
            todayValue={summary.leads_today}
            monthLabel={t.monthNew}
            monthValue={summary.leads_month}
          />
          <StatCard
            label={t.claimsTotal}
            value={summary.claims_total}
            todayLabel={t.today}
            todayValue={summary.claims_today}
            monthLabel={t.thisMonth}
            monthValue={summary.claims_month}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-black">{t.controls}</h2>
              <p className="mt-2 text-sm font-medium text-slate-600">
                {lang === 'zh'
                  ? '控制客户提交、系统派单、服务商接单、独家买断和 Email / SMS 派单通道。'
                  : 'Control customer submissions, dispatch, provider claiming, exclusive buyout, and Email / SMS dispatch channel.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton tone="secondary" onClick={() => loadAll()} disabled={loading}>
                {t.refresh}
              </ActionButton>
              <ActionButton
                onClick={dispatchPendingLeads}
                disabled={busy === 'dispatch-pending'}
              >
                {busy === 'dispatch-pending' ? t.dispatchingPendingLeads : t.dispatchPendingLeads}
              </ActionButton>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <ControlCard
              title={t.customerRequests}
              desc={t.customerRequestsDesc}
              status={<Badge tone={settings.customer_requests_enabled ? 'ok' : 'bad'}>{settings.customer_requests_enabled ? 'ON' : 'OFF'}</Badge>}
            >
              <ActionButton
                onClick={() => updateSetting('customer_requests_enabled', !settings.customer_requests_enabled)}
                disabled={busy === 'setting:customer_requests_enabled'}
              >
                {settings.customer_requests_enabled ? t.pauseRequests : t.enableRequests}
              </ActionButton>
            </ControlCard>

            <ControlCard
              title={t.leadDispatch}
              desc={t.leadDispatchDesc}
              status={<Badge tone={settings.lead_dispatch_enabled ? 'ok' : 'bad'}>{settings.lead_dispatch_enabled ? 'ON' : 'OFF'}</Badge>}
            >
              <ActionButton
                onClick={() => updateSetting('lead_dispatch_enabled', !settings.lead_dispatch_enabled)}
                disabled={busy === 'setting:lead_dispatch_enabled'}
              >
                {settings.lead_dispatch_enabled ? t.pauseDispatch : t.enableDispatch}
              </ActionButton>
            </ControlCard>

            <ControlCard
              title={t.providerClaiming}
              desc={t.providerClaimingDesc}
              status={<Badge tone={settings.provider_claims_enabled ? 'ok' : 'bad'}>{settings.provider_claims_enabled ? 'ON' : 'OFF'}</Badge>}
            >
              <ActionButton
                onClick={() => updateSetting('provider_claims_enabled', !settings.provider_claims_enabled)}
                disabled={busy === 'setting:provider_claims_enabled'}
              >
                {settings.provider_claims_enabled ? t.pauseClaiming : t.enableClaiming}
              </ActionButton>
            </ControlCard>

            <ControlCard
              title={t.exclusiveClaims}
              desc={t.exclusiveClaimsDesc}
              status={<Badge tone={settings.exclusive_claims_enabled ? 'ok' : 'bad'}>{settings.exclusive_claims_enabled ? 'ON' : 'OFF'}</Badge>}
            >
              <ActionButton
                tone={settings.exclusive_claims_enabled ? 'warning' : 'secondary'}
                onClick={() => updateSetting('exclusive_claims_enabled', !settings.exclusive_claims_enabled)}
                disabled={busy === 'setting:exclusive_claims_enabled'}
              >
                {settings.exclusive_claims_enabled ? t.disableExclusive : t.enableExclusive}
              </ActionButton>
            </ControlCard>

            <ControlCard
              title={t.dispatchChannel}
              desc={t.dispatchChannelDesc}
              status={<Badge tone="ok">{settings.lead_dispatch_channel === 'sms' ? 'SMS' : 'EMAIL'}</Badge>}
            >
              <ActionButton
                onClick={() => updateSetting('lead_dispatch_channel', 'email')}
                disabled={busy === 'setting:lead_dispatch_channel' || settings.lead_dispatch_channel === 'email'}
              >
                Email
              </ActionButton>
              <ActionButton
                tone="secondary"
                onClick={() => updateSetting('lead_dispatch_channel', 'sms')}
                disabled={busy === 'setting:lead_dispatch_channel' || settings.lead_dispatch_channel === 'sms'}
              >
                SMS
              </ActionButton>
            </ControlCard>
          </div>

          <p className="mt-5 text-sm font-medium text-slate-600">{t.recommendedDefault}</p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-black">{t.dispatchOverview}</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {dispatchCards.map(([label, value, tone]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className={`text-3xl font-black ${tone === 'bad' ? 'text-red-800' : tone === 'mid' ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {value}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-600">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">{t.dispatchOverviewNote}</p>
          </div>
        </section>

        <nav className="flex flex-wrap gap-2">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-full px-5 py-3 text-sm font-black ${
                activeTab === key
                  ? 'bg-red-700 text-white'
                  : 'bg-white text-slate-950 ring-1 ring-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
          <ActionButton tone="secondary" onClick={() => loadAll()} disabled={loading}>
            {t.refresh}
          </ActionButton>
        </nav>

        {activeTab === 'providers' ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">{t.providers}</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t.business}</th>
                    <th className="px-4 py-3">{t.contact}</th>
                    <th className="px-4 py-3">{t.email}</th>
                    <th className="px-4 py-3">{t.phone}</th>
                    <th className="px-4 py-3">{t.emailNotifications}</th>
                    <th className="px-4 py-3">{t.smsNotifications}</th>
                    <th className="px-4 py-3">{t.status}</th>
                    <th className="px-4 py-3">{t.created}</th>
                    <th className="px-4 py-3">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {providers.map((provider) => (
                    <tr key={provider.id} className="align-top">
                      <td className="max-w-[320px] px-4 py-4">
                        <div className="font-black">{escText(provider.business_name)}</div>
                        <div className="text-sm text-slate-500">{escText(provider.public_id)}</div>
                        {provider.business_description ? <div className="text-sm text-slate-500">{escText(provider.business_description)}</div> : null}
                        <div className="mt-1 text-sm text-slate-500">{lang === 'zh' ? '服务区域' : 'Areas'}: {escText(provider.service_areas)}</div>
                        <div className="text-sm text-slate-500">{lang === 'zh' ? '服务类型' : 'Types'}: {escText(provider.service_types)}</div>
                        {provider.daily_claim_limit ? <div className="text-sm text-slate-500">{lang === 'zh' ? '每日认领上限' : 'Daily limit'}: {escText(provider.daily_claim_limit)}</div> : null}
                      </td>
                      <td className="px-4 py-4">{escText(provider.contact_name)}</td>
                      <td className="px-4 py-4">{escText(provider.email)}</td>
                      <td className="px-4 py-4">{escText(provider.phone)}</td>
                      <td className="px-4 py-4">
                        {provider.notify_by_email === false ? (
                          <Badge tone="bad">{t.unsubscribed}</Badge>
                        ) : provider.email_resubscribed_at ? (
                          <Badge tone="ok">{t.resubscribed}</Badge>
                        ) : (
                          <Badge tone="ok">{t.subscribed}</Badge>
                        )}
                        {provider.email_unsubscribed_at ? <div className="mt-1 text-xs text-slate-500">{lang === 'zh' ? '关闭时间' : 'Off'}: {formatDate(provider.email_unsubscribed_at)}</div> : null}
                        {provider.email_resubscribed_at ? <div className="mt-1 text-xs text-slate-500">{lang === 'zh' ? '开启时间' : 'On'}: {formatDate(provider.email_resubscribed_at)}</div> : null}
                      </td>
                      <td className="px-4 py-4">
                        {provider.notify_by_sms === true && !provider.sms_opt_out_at ? (
                          <Badge tone="ok">{t.optedIn}</Badge>
                        ) : (
                          <Badge tone="bad">{t.optedOut}</Badge>
                        )}
                        {provider.sms_opt_out_at ? <div className="mt-1 text-xs text-slate-500">{lang === 'zh' ? '关闭时间' : 'Off'}: {formatDate(provider.sms_opt_out_at)}</div> : null}
                        {provider.sms_opt_in_at ? <div className="mt-1 text-xs text-slate-500">{lang === 'zh' ? '开启时间' : 'On'}: {formatDate(provider.sms_opt_in_at)}</div> : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={provider.approved ? 'ok' : 'mid'}>
                            {provider.approved ? t.approved : t.pending}
                          </Badge>
                          <Badge tone={provider.active ? 'ok' : 'bad'}>
                            {provider.active ? t.active : t.inactive}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4">{formatDate(provider.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <ActionButton
                            onClick={() => providerAction(provider.id, 'approve')}
                            disabled={busy === `provider:${provider.id}:approve`}
                          >
                            {t.approve}
                          </ActionButton>
                          <ActionButton
                            tone="secondary"
                            onClick={() => providerAction(provider.id, 'activate')}
                            disabled={busy === `provider:${provider.id}:activate`}
                          >
                            {t.activate}
                          </ActionButton>
                          <ActionButton
                            tone="warning"
                            onClick={() => providerAction(provider.id, 'suspend')}
                            disabled={busy === `provider:${provider.id}:suspend`}
                          >
                            {t.suspend}
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'leads' ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">{t.leads}</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t.lead}</th>
                    <th className="px-4 py-3">{t.customer}</th>
                    <th className="px-4 py-3">{t.contact}</th>
                    <th className="px-4 py-3">{t.task}</th>
                    <th className="px-4 py-3">{t.status}</th>
                    <th className="px-4 py-3">{t.sharedSlots}</th>
                    <th className="px-4 py-3">{t.created}</th>
                    <th className="px-4 py-3">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="align-top">
                      <td className="max-w-[320px] px-4 py-4">
                        <div className="font-black">{escText(lead.public_id)}</div>
                        <div className="text-sm text-slate-500">{escText(lead.community_or_postal || lead.area)}</div>
                        <div className="mt-2">
                          <DispatchBadge info={lead.dispatch_status} lang={lang} />
                        </div>
                        <PhotosBadge lead={lead} lang={lang} />
                      </td>
                      <td className="px-4 py-4">{escText(lead.customer_name)}</td>
                      <td className="px-4 py-4">
                        <div>{escText(lead.customer_phone)}</div>
                        <div className="text-slate-500">{escText(lead.customer_email)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div>{escText(lead.service_type)}</div>
                        <div className="text-slate-500">{escText(lead.job_size)} · {escText(lead.timeline)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={lead.status === 'published' || lead.status === 'shared_active' ? 'ok' : lead.status === 'queued' ? 'mid' : 'bad'}>
                          {statusText(lead.status, lang)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        {escText(lead.shared_claim_count)} / {escText(lead.shared_limit)}
                      </td>
                      <td className="px-4 py-4">{formatDate(lead.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <ActionButton
                            onClick={() => leadAction(lead.id, 'publish')}
                            disabled={busy === `lead:${lead.id}:publish`}
                          >
                            {t.publish}
                          </ActionButton>
                          <ActionButton
                            tone="secondary"
                            onClick={() => leadAction(lead.id, 'queue')}
                            disabled={busy === `lead:${lead.id}:queue`}
                          >
                            {t.queue}
                          </ActionButton>
                          <ActionButton
                            tone="warning"
                            onClick={() => leadAction(lead.id, 'expire')}
                            disabled={busy === `lead:${lead.id}:expire`}
                          >
                            {t.expire}
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'claims' ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">{t.claims}</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t.created}</th>
                    <th className="px-4 py-3">{t.access}</th>
                    <th className="px-4 py-3">{t.status}</th>
                    <th className="px-4 py-3">{t.provider}</th>
                    <th className="px-4 py-3">{t.lead}</th>
                    <th className="px-4 py-3">{t.customer}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="align-top">
                      <td className="px-4 py-4">{formatDate(claim.created_at)}</td>
                      <td className="px-4 py-4">
                        <Badge tone={claim.access === 'exclusive' ? 'mid' : 'ok'}>
                          {claim.access === 'exclusive' ? t.exclusiveAccess : t.sharedAccess}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">{escText(statusText(claim.status, lang))}</td>
                      <td className="px-4 py-4">
                        <div className="font-black">{escText(claim.provider?.business_name)}</div>
                        <div className="text-slate-500">{escText(claim.provider?.email)}</div>
                        <div className="text-slate-500">{escText(claim.provider?.phone)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div>{escText(claim.lead?.public_id)}</div>
                        <div className="text-slate-500">{escText(claim.lead?.service_type)}</div>
                        <div className="text-slate-500">{escText(claim.lead?.community_or_postal)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div>{escText(claim.lead?.customer_name)}</div>
                        <div className="text-slate-500">{escText(claim.lead?.customer_phone)}</div>
                        <div className="text-slate-500">{escText(claim.lead?.customer_email)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'raw' ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <JsonPanel title="Summary" data={data.summary || {}} />
            <JsonPanel title="Settings" data={data.settings || {}} />
            <JsonPanel title="Dispatch Overview" data={data['dispatch-overview'] || {}} />
            <JsonPanel title="Providers" data={data.providers || {}} />
            <JsonPanel title="Leads" data={data.leads || {}} />
            <JsonPanel title="Claims" data={data.claims || {}} />
          </div>
        ) : null}
      </main>
    </div>
  )
}
