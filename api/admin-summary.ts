export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  return res.status(200).json({
    ok: true,
    mode: 'v19_launch_ready',
    storage: 'Google Sheet / Email webhook',
    note: 'Admin dashboard is local-demo-only in v19. Use the connected Google Sheet and email inbox for launch operations.',
  })
}
