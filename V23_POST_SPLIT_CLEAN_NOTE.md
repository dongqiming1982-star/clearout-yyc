# V23 post-split clean package

This package is based on V23 Supabase claim system, with Aurora main-site leftovers removed from the Clearout project after the domains were split.

Removed from Clearout package:
- `/aurora` operator route
- `AuroraOperatorSite` component
- `isAuroraOperatorHost` host switching logic
- `public/aurora-sitemap.xml`
- Aurora sitemap line from `public/robots.txt`

Clearout still correctly says it is operated by Aurora Site Solutions where legally/brand-wise appropriate.
