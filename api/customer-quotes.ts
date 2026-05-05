export default async function handler(_req: any, res: any) {
  return res.status(410).json({
    error: 'Quotes endpoint removed. Clearout YYC is a junk removal lead platform, not a quote-comparison or moving platform.',
  })
}
