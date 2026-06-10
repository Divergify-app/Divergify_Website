/**
 * Printful Store Integration
 * Fetches products from Printful API and displays them
 * API key stored securely in environment variables
 */

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_BASE = 'https://api.printful.com';

/**
 * Fetch products from Printful
 * Filters for relevant product types (apparel, accessories)
 */
async function fetchPrintfulProducts() {
  try {
    const response = await fetch(`${PRINTFUL_API_BASE}/products`, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Printful API error:', response.status);
      return [];
    }

    const data = await response.json();
    
    // Filter for community-relevant products
    // Exclude bulk items, focus on wearables and personal items
    const relevantProducts = data.result.filter(product => {
      const type = product.type_name?.toLowerCase() || '';
      return type.includes('shirt') || 
             type.includes('hoodie') || 
             type.includes('hat') ||
             type.includes('mug') ||
             type.includes('sticker') ||
             type.includes('bag') ||
             type.includes('jacket');
    });

    return relevantProducts;
  } catch (error) {
    console.error('Error fetching Printful products:', error);
    return [];
  }
}

/**
 * Render product grid
 * Low-stim design: clean cards, no animations, readable layout
 */
function renderProductGrid(products) {
  const container = document.getElementById('dopamine-depot-grid');
  if (!container) return;

  container.innerHTML = products.map(product => `
    <article class="product-card">
      <div class="product-image">
        ${product.image ? `<img src="${product.image}" alt="${product.title}" loading="lazy">` : '<div class="placeholder">Image unavailable</div>'}
      </div>
      <div class="product-info">
        <h3>${product.title}</h3>
        <p class="product-type">${product.type_name}</p>
        <p class="product-desc">${product.description?.substring(0, 100)}...</p>
        <div class="product-action">
          <a href="https://printful.com/products/${product.id}" target="_blank" class="btn-primary">
            View & Order
          </a>
        </div>
      </div>
    </article>
  `).join('');
}

/**
 * Initialize store on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  const products = await fetchPrintfulProducts();
  renderProductGrid(products);
});
