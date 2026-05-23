/* ============================================================
   Romance Finder — app.js
   Busca Open Library + Google Books · Comparador de preços BR
   ============================================================ */

'use strict';

// ── Estado global ─────────────────────────────────────────────
let currentFilter = 'romance';
let selectedStores = new Set(['amazon', 'estante', 'saraiva', 'martins']);
let isSearching = false;

// ── Links das lojas ───────────────────────────────────────────
const STORES = {
  amazon: {
    name: 'Amazon BR',
    emoji: '📦',
    url: (q) => `https://www.amazon.com.br/s?k=${enc(q)}&i=stripbooks&rh=n%3A6740748011`,
  },
  estante: {
    name: 'Estante Virtual',
    emoji: '📖',
    url: (q) => `https://www.estantevirtual.com.br/busca/${enc(q)}`,
  },
  saraiva: {
    name: 'Saraiva',
    emoji: '🏛️',
    url: (q) => `https://www.livrariacultura.com.br/saraiva?Ntt=${enc(q)}`,
  },
  martins: {
    name: 'Martins Fontes',
    emoji: '🎭',
    url: (q) => `https://www.martinsfontespaulista.com.br/search?q=${enc(q)}`,
  },
  americanas: {
    name: 'Americanas',
    emoji: '🛒',
    url: (q) => `https://www.americanas.com.br/busca/${enc(q)}?typeOfSearch=typeAll&facets=category:books`,
  },
  magalu: {
    name: 'Magalu',
    emoji: '💙',
    url: (q) => `https://www.magazineluiza.com.br/busca/${enc(q)}/?from=submit&subcategoria=LI`,
  },
};

function enc(s) {
  return encodeURIComponent(s);
}

// ── Filtros ───────────────────────────────────────────────────
function setFilter(val, el) {
  currentFilter = val;
  document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
  el.classList.add('active');
}

// ── Lojas ─────────────────────────────────────────────────────
function toggleStore(el) {
  const s = el.dataset.store;
  if (selectedStores.has(s)) {
    if (selectedStores.size > 1) {
      selectedStores.delete(s);
      el.classList.remove('selected');
      el.setAttribute('aria-pressed', 'false');
    }
  } else {
    selectedStores.add(s);
    el.classList.add('selected');
    el.setAttribute('aria-pressed', 'true');
  }
}

// ── Atalhos de busca ──────────────────────────────────────────
function quickSearch(q) {
  document.getElementById('searchInput').value = q;
  doSearch();
}

// ── Busca principal ───────────────────────────────────────────
async function doSearch() {
  if (isSearching) return;

  const raw = document.getElementById('searchInput').value.trim();
  const q = raw || currentFilter;
  if (!q) return;

  isSearching = true;
  const btn = document.getElementById('searchBtn');
  btn.disabled = true;
  btn.innerHTML = `
    <span class="btn-spinner" aria-hidden="true"></span>
    Buscando…
  `;

  // Injeta CSS do spinner no botão (uma vez só)
  if (!document.getElementById('spinnerStyle')) {
    const s = document.createElement('style');
    s.id = 'spinnerStyle';
    s.textContent = `.btn-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}`;
    document.head.appendChild(s);
  }

  // Esconde seções anteriores
  document.getElementById('resultsTitle').style.display = 'none';
  document.getElementById('aiSection').style.display = 'none';
  document.getElementById('resultsArea').innerHTML = `
    <div class="loading-state" role="status" aria-live="polite">
      <span class="loading-spin" aria-hidden="true"></span>
      <p>Buscando em múltiplas fontes…</p>
      <p class="loading-sub">Open Library · Google Books · Acervos internacionais</p>
    </div>`;

  try {
    const searchQuery = q + ' ' + (currentFilter !== 'romance' ? currentFilter : 'romance');

    const [olResult, gbResult] = await Promise.allSettled([
      fetchOpenLibrary(searchQuery),
      fetchGoogleBooks(searchQuery),
    ]);

    let books = [];

    if (olResult.status === 'fulfilled') {
      books = books.concat(olResult.value);
    }

    if (gbResult.status === 'fulfilled') {
      books = books.concat(gbResult.value);
    }

    // Deduplica por título
    const seen = new Set();
    books = books.filter((b) => {
      const key = b.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Limita a 20 resultados
    books = books.slice(0, 20);

    if (books.length === 0) {
      document.getElementById('resultsArea').innerHTML = `
        <div class="no-results-msg">
          Nenhum livro encontrado para "<strong>${escHtml(q)}</strong>". Tente outro termo.
        </div>`;
    } else {
      renderBooks(books, q);
      const title = document.getElementById('resultsTitle');
      title.style.display = 'block';
      title.textContent = `${books.length} livros encontrados`;
      fetchAiCuradoria(books, q);
    }
  } catch (err) {
    document.getElementById('resultsArea').innerHTML = `
      <div class="error-msg">
        ⚠️ Erro ao buscar livros. Verifique sua conexão e tente novamente.
      </div>`;
  }

  isSearching = false;
  btn.disabled = false;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    Buscar`;
}

// ── Open Library ──────────────────────────────────────────────
async function fetchOpenLibrary(q) {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${enc(q)}&subject=romance&limit=20`
  );
  if (!res.ok) throw new Error('OL error');
  const data = await res.json();

  return (data.docs || []).slice(0, 20).map((d) => ({
    id: d.key || Math.random().toString(),
    title: d.title || 'Título desconhecido',
    author: d.author_name ? d.author_name[0] : 'Autor desconhecido',
    year: d.first_publish_year || null,
    cover_id: d.cover_i || null,
    cover_url: null,
    isbn: d.isbn ? d.isbn[0] : null,
    subjects: (d.subject || []).slice(0, 3),
    source: 'openlibrary',
    retailPrice: null,
  }));
}

// ── Google Books ──────────────────────────────────────────────
async function fetchGoogleBooks(q) {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${enc(q)}+subject:romance&maxResults=15&orderBy=relevance`
  );
  if (!res.ok) throw new Error('GB error');
  const data = await res.json();

  return (data.items || []).slice(0, 15).map((item) => {
    const v = item.volumeInfo || {};
    const saleInfo = item.saleInfo || {};
    return {
      id: item.id,
      title: v.title || 'Título desconhecido',
      author: v.authors ? v.authors[0] : 'Autor desconhecido',
      year: v.publishedDate ? parseInt(v.publishedDate) : null,
      cover_id: null,
      cover_url: v.imageLinks
        ? (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail || null)
        : null,
      isbn: v.industryIdentifiers
        ? (v.industryIdentifiers.find((x) => x.type === 'ISBN_13') || v.industryIdentifiers[0])?.identifier
        : null,
      subjects: (v.categories || []).slice(0, 2),
      source: 'googlebooks',
      retailPrice: saleInfo.retailPrice || null,
    };
  });
}

// ── Render de livros ──────────────────────────────────────────
function renderBooks(books, query) {
  const cards = books.map((b) => bookCardHtml(b, query)).join('');
  document.getElementById('resultsArea').innerHTML = `<div class="book-grid">${cards}</div>`;
}

function bookCardHtml(b, query) {
  // Capa
  let coverInner;
  if (b.cover_url) {
    coverInner = `<img src="${escAttr(b.cover_url)}" alt="Capa de ${escAttr(b.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'book-cover-placeholder\\'>📚</span>'" />`;
  } else if (b.cover_id) {
    coverInner = `<img src="https://covers.openlibrary.org/b/id/${b.cover_id}-M.jpg" alt="Capa de ${escAttr(b.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'book-cover-placeholder\\'>📚</span>'" />`;
  } else {
    coverInner = `<span class="book-cover-placeholder">📚</span>`;
  }

  // Tags
  const tags = b.subjects
    .slice(0, 2)
    .map((s) => `<span class="book-tag">${escHtml(s.length > 22 ? s.slice(0, 20) + '…' : s)}</span>`)
    .join('');

  // Preço Google Play
  const priceHtml = b.retailPrice && b.retailPrice.amount
    ? `<p class="book-price">R$ ${b.retailPrice.amount.toFixed(2)} (Google Play)</p>`
    : '';

  // Links das lojas selecionadas
  const storeQ = b.isbn ? b.isbn : `${b.title} ${b.author}`;
  const links = [...selectedStores]
    .map((sid) => {
      const store = STORES[sid];
      return `<a class="store-link" href="${escAttr(store.url(storeQ))}" target="_blank" rel="noopener noreferrer">
        ${store.emoji} ${escHtml(store.name)}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>`;
    })
    .join('');

  return `
    <article class="book-card">
      <div class="book-inner">
        <div class="book-cover">${coverInner}</div>
        <div class="book-info">
          <h3 class="book-title">${escHtml(b.title)}</h3>
          <p class="book-author">${escHtml(b.author)}</p>
          ${b.year ? `<p class="book-year">${b.year}</p>` : ''}
          ${priceHtml}
          <div class="book-tags">${tags}</div>
        </div>
      </div>
      <div class="book-footer">
        <p class="store-links-label">Comparar preços nas lojas</p>
        <div class="store-links">${links}</div>
      </div>
    </article>`;
}

// ── Curadoria IA (Claude) ─────────────────────────────────────
async function fetchAiCuradoria(books, query) {
  document.getElementById('aiSection').style.display = 'block';
  document.getElementById('aiContent').innerHTML = `
    <div class="ai-loading" role="status" aria-label="Carregando curadoria inteligente">
      <span class="ai-dot"></span>
      <span class="ai-dot"></span>
      <span class="ai-dot"></span>
      <span>Analisando os resultados com IA…</span>
    </div>`;

  const bookList = books
    .slice(0, 8)
    .map((b) => `"${b.title}" de ${b.author}`)
    .join(', ');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Você é especialista em literatura romântica. O usuário buscou: "${query}".
Livros encontrados: ${bookList}.

Em 3-4 frases curtas e calorosas em português brasileiro, diga:
1. Destaque 1-2 dos melhores títulos desta lista
2. Uma dica para achar o melhor preço (Amazon BR e Estante Virtual costumam ter boas promoções)
3. Uma recomendação extra que complemente a busca

Responda direto, como uma amiga leitora. Sem bullets. Máximo 90 palavras.`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const text =
      data.content && data.content[0] && data.content[0].text
        ? data.content[0].text
        : 'Curadoria indisponível. Os resultados acima foram buscados em tempo real.';

    document.getElementById('aiContent').textContent = text;
  } catch {
    document.getElementById('aiContent').textContent =
      'Curadoria indisponível no momento. Os resultados foram buscados em tempo real no Open Library e Google Books.';
  }
}

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Event listeners ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  }
});
