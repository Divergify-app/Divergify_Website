# Shop Setup — Dopamine Depot on divergify.app/shop

Read this when you're ready to flip the switch. Each section is one small thing. Do them in order. Stop whenever your brain says stop — the work persists.

---

## What you're working with

The shop is a static page that reads `shop/products.json`. On every Netlify deploy, a build script (`scripts/fetch-printful-products.mjs`) hits the Printful API with your token and rewrites `products.json` with your real products + real mockups.

No Shopify. No monthly fee. Lives on your domain.

What ships with this setup:
- `shop/index.html` — the catalog page (the grid)
- `shop/product.html` — the product detail page (variants + Buy button)
- `shop/products.json` — currently an empty placeholder; gets overwritten on build
- `shop/checkout-links.json` — where you paste real checkout URLs (Stripe, Ko-fi, etc.)
- `assets/shop.css` — styles, matches the Divergify dark navy + gold system
- `scripts/fetch-printful-products.mjs` — the build-time fetch
- `package.json` — minimal, just so Netlify knows what to run

If the build fails or the token is missing, the script writes an empty catalog and the site still deploys. The shop just shows the empty state. Nothing breaks the main site.

---

## Step 1 — Get your Printful API token (~3 min)

Tier: **just clicks, no code.**

1. Go to printful.com and log in.
2. Top-right avatar → **Settings**.
3. Left sidebar → **Stores**.
4. Pick the store you want to sell from (probably the one you've already been uploading designs to). Click it.
5. In the store, find the **API** tab (sometimes labeled "API access" or under "Developers" depending on Printful's current UI).
6. Click **Add API token** (or **Create new key**). Give it a name like `divergify-website`. Scope: **Read** is enough. (Read/Write only if you later want the site to place orders directly.)
7. **Copy the token.** It's long. Treat it like a password — anyone with it can see your store data.

If you see "this store is connected to a platform" — fine. The API token is separate from any platform integration. You can use it even if you have no Shopify/Etsy hooked up.

---

## Step 2 — Make sure at least one product exists in Printful (~10 min per design)

The script can't show products that don't exist yet. If your Printful store is empty, the shop will be empty.

For each design:
1. In Printful → **Store** (or **Products**) → **Add new product**.
2. Pick a blank (T-shirt, hoodie, mug). Bella+Canvas 3001 is the standard unisex tee — solid quality for the price.
3. Upload your design file. Position it on the blank.
4. Pick which color/size combos you want to offer. (More = more clutter. Start with one color and 4 sizes for the first one if you're tired.)
5. Click **Save**. Printful generates the real product mockups automatically.
6. **Important:** the product needs to actually be in your store (not just a draft). If you see a "Sync" or "Publish" button, click it.

Once one product exists, the script will find it. You don't have to set up all your designs before flipping the switch — start with one.

---

## Step 3 — Paste the token into Netlify (~2 min)

1. netlify.com → log in → pick the Divergify site.
2. **Site settings** → **Environment variables** → **Add a variable**.
3. Key: `PRINTFUL_API_TOKEN` (exact spelling, all caps, underscores).
4. Value: paste the token from Step 1.
5. Save.

This is where the token lives in production. It's not in the repo. Don't commit it.

---

## Step 4 — Trigger a deploy (~3 min)

The next push to `main` (or whatever your production branch is) triggers a Netlify build. The build runs `npm run build:shop`, which runs the Printful fetch.

If you don't want to push code right now, in Netlify dashboard:
- **Deploys** tab → **Trigger deploy** → **Deploy site**.

Watch the deploy log. You'll see lines like:
```
[printful] fetching store products...
[printful] found 3 products. fetching details...
[printful] done. 3 products written.
```

If you see `writing empty catalog (PRINTFUL_API_TOKEN not set)` — the env var didn't stick. Go back to Step 3.

If you see `api_error: Printful 401 ...` — the token is invalid or expired. Re-generate in Printful.

---

## Step 5 — Check the live shop

Visit `https://divergify.app/shop/`. You should see your products with real mockups.

Click one. You'll see variants (size/color) and a Buy button.

The Buy button will be **disabled** until you set up a real checkout link. Currently the page shows an "Email to order" fallback. That's not the final state — see Step 6.

---

## Step 6 — Wire up real checkout (when you're ready)

For V1 with no monthly cost, the simplest path is **Stripe Payment Links**.

1. stripe.com → log in (or sign up — free, no monthly fee, ~2.9% + 30¢ per transaction).
2. **Products** → **Add product**. Name it the same as your Printful product. Set price.
3. After saving, click **Create payment link** for that product. Copy the URL.
4. Open `shop/products.json` in your repo (look at it after the first deploy so you can see the real product IDs).
5. Open `shop/checkout-links.json`. Add:
   ```json
   {
     "PRINTFUL_PRODUCT_ID": "https://buy.stripe.com/your-link"
   }
   ```
6. Commit + push. Next deploy, the Buy button works.

For per-variant pricing (M = $25, XL = $28), use the `productId:variantId` key format shown in the example block at the top of `checkout-links.json`.

**Fulfillment workflow with Stripe Payment Links:**
- Customer pays via Stripe.
- You get a Stripe email with their address.
- You go to Printful, manually place the order with their address.
- Printful ships. You keep the difference between Stripe payment and Printful cost.

Yes, it's a manual step. That's the tradeoff for $0/month. When orders get annoying (~5+/week), upgrade to a Netlify Function that auto-places Printful orders from Stripe webhooks — that's V2.

---

## When things break

**Shop is blank but says "Drop is loading":**
- Build script probably wrote an empty catalog. Check Netlify deploy log.
- Most common: token not set in env vars. Or no products published in Printful yet.

**Build fails entirely:**
- The script is designed not to fail Netlify builds. If the WHOLE build is failing, it's something else — usually unrelated. Check the log.

**Mockups look bad:**
- Those are coming from Printful, generated when you uploaded the design. Re-do the placement in Printful and re-sync.

**You forgot what state you were in:**
- This file is the source of truth. Read from the top. No shame.

---

## What's intentionally NOT here yet

- Real cart (can buy one thing at a time via Payment Links).
- On-domain checkout (Stripe Checkout via a Netlify Function — V2).
- Inventory caching (every page load re-fetches `products.json` — fine for low traffic).
- Reviews, search, related products, sale banners — all add later if needed.

V1 goal: real products visible, real mockups, real Buy button. That's it. Anything else is scope creep.
