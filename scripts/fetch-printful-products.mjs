#!/usr/bin/env node
/*
 * fetch-printful-products.mjs
 * ----------------------------------------------------------------------
 * Pulls Jess's real Printful Sync Products at Netlify build time and
 * writes /shop/products.json so the static /shop/ pages can render real
 * products with real mockups, real variants, real prices.
 *
 * Run locally:
 *   PRINTFUL_API_TOKEN=xxxx node scripts/fetch-printful-products.mjs
 *
 * On Netlify:
 *   - Set PRINTFUL_API_TOKEN in Site settings -> Environment variables
 *   - The build command (netlify.toml) calls this script before publish
 *
 * Failure mode (by design):
 *   - Missing token  -> writes empty catalog with a friendly status flag.
 *     Shop page shows an empty state instead of crashing the build.
 *   - API error      -> same. Build never breaks the marketing site.
 *
 * Printful API docs: https://developers.printful.com/docs/
 * ---------------------------------------------------------------------- */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const OUT_PATH = resolve(REPO_ROOT, "shop", "products.json");

const API_BASE = "https://api.printful.com";
const TOKEN = process.env.PRINTFUL_API_TOKEN || "";
// Account-level tokens can see multiple stores; X-PF-Store-Id picks the right one.
// Store-scoped tokens ignore this header, so setting it is always safe.
const STORE_ID = process.env.PRINTFUL_STORE_ID || "";

// Light politeness: don't hammer Printful (120 req/min limit)
const SLEEP_MS = 350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function writeCatalog(payload) {
  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`[printful] wrote ${OUT_PATH}`);
}

async function emptyCatalog(reason) {
  console.log(`[printful] writing empty catalog (${reason})`);
  await writeCatalog({
    status: "empty",
    reason,
    generated_at: new Date().toISOString(),
    products: [],
  });
}

async function pf(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(STORE_ID ? { "X-PF-Store-Id": STORE_ID } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Printful ${res.status} on ${path}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.result;
}

function pickThumb(product) {
  return (
    product?.thumbnail_url ||
    product?.preview_url ||
    null
  );
}

function pickVariantImage(variant) {
  // Prefer a generated mockup preview file, then the catalog stock image.
  const previewFile = (variant?.files || []).find(
    (f) => f?.type === "preview" && f?.preview_url
  );
  return (
    previewFile?.preview_url ||
    variant?.product?.image ||
    null
  );
}

function normalizeVariant(v) {
  const cat = v?.product || {};
  return {
    id: v.id,
    external_id: v.external_id || null,
    name: v.name,
    sku: v.sku || null,
    retail_price: v.retail_price || null,
    currency: v.currency || "USD",
    is_available: v.is_ignored ? false : true,
    color: cat.color || null,
    size: cat.size || null,
    image: pickVariantImage(v),
  };
}

function summarizePricing(variants) {
  const prices = variants
    .map((v) => parseFloat(v.retail_price))
    .filter((n) => Number.isFinite(n));
  if (!prices.length) return { min: null, max: null, currency: "USD" };
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    currency: variants[0]?.currency || "USD",
  };
}

async function run() {
  if (!TOKEN) {
    await emptyCatalog("PRINTFUL_API_TOKEN not set");
    return;
  }

  console.log("[printful] fetching store products...");
  let list;
  try {
    list = await pf("/store/products?limit=100");
  } catch (err) {
    console.error(`[printful] list failed: ${err.message}`);
    await emptyCatalog(`api_error: ${err.message}`);
    return;
  }

  if (!Array.isArray(list) || list.length === 0) {
    await emptyCatalog("no products in Printful store yet");
    return;
  }

  console.log(`[printful] found ${list.length} products. fetching details...`);
  const products = [];
  for (const p of list) {
    try {
      const detail = await pf(`/store/products/${p.id}`);
      const sp = detail?.sync_product || {};
      const variants = (detail?.sync_variants || []).map(normalizeVariant);

      products.push({
        id: sp.id,
        external_id: sp.external_id || null,
        name: sp.name,
        thumbnail: pickThumb(sp),
        variant_count: variants.length,
        pricing: summarizePricing(variants),
        variants,
      });
    } catch (err) {
      console.warn(`[printful] skipping product ${p.id}: ${err.message}`);
    }
    await sleep(SLEEP_MS);
  }

  await writeCatalog({
    status: products.length ? "ok" : "empty",
    reason: products.length ? null : "all product detail fetches failed",
    generated_at: new Date().toISOString(),
    product_count: products.length,
    products,
  });
  console.log(`[printful] done. ${products.length} products written.`);
}

run().catch(async (err) => {
  console.error(`[printful] fatal: ${err.message}`);
  await emptyCatalog(`fatal: ${err.message}`);
  // Exit 0 so Netlify build still succeeds — empty shop is not a deploy blocker.
  process.exit(0);
});
