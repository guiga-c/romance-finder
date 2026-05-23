# 💕 Romance Finder

Buscador de livros de romance com comparação de preços nas principais livrarias brasileiras.

## ✨ Funcionalidades

- 🔍 Busca em tempo real via **Open Library** e **Google Books**
- 🏪 Links diretos para comparar preços: Amazon BR, Estante Virtual, Saraiva, Martins Fontes, Americanas, Magalu
- 🤖 Curadoria inteligente com **Claude IA** (Anthropic)
- 📱 Totalmente responsivo (mobile-first)
- 🌙 Dark mode automático

## 🚀 Deploy

Projeto configurado para deploy estático no **Vercel**.

1. Importe este repositório no Vercel
2. Framework: **Other** (site estático)
3. Clique em Deploy

## 🛠️ Tecnologias

- HTML5 + CSS3 + JavaScript vanilla
- [Open Library API](https://openlibrary.org/developers/api) — busca gratuita
- [Google Books API](https://developers.google.com/books) — busca gratuita
- [Claude API](https://claude.ai) — curadoria inteligente
- Fonts: Playfair Display + DM Sans (Google Fonts)

## 📦 Estrutura

```
romance-finder/
├── index.html   # Estrutura principal
├── style.css    # Estilos (light/dark mode)
├── app.js       # Lógica de busca e IA
├── vercel.json  # Config Vercel
└── README.md
```

## ⚠️ Limitações

As livrarias brasileiras não oferecem APIs públicas de preços em tempo real.
O app redireciona para a busca em cada loja para comparação manual.

---
Feito com 💕 e Claude AI
