import claimLead from './claim-lead'

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    req.body = {
      ...req.body,
      lead_public_id: req.body?.lead_public_id || req.body?.lead,
      access: 'shared',
    }
  }
  return claimLead(req, res)
}
