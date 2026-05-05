export default async function handler(_req: any, res: any) {
  return res.status(410).json({
    error: 'Provider quote endpoint removed. Future paid access should use a provider-only lead access/payment page.',
  })
}
