# luxe-store
Official LUXE STORE marketplace
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LUXE STORE | Shop Beyond Ordinary</title>
<style>
:root {
  --gold: #d8ad55;
  --black: #090909;
  --panel: #151515;
  --muted: #999;
  --white: #f7f4ed;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--black);
  color: var(--white);
  font-family: Arial, sans-serif;
}
header {
  position: sticky;
  top: 0;
  z-index: 5;
  background: #090909ee;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #29231a;
  padding: 17px 6%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}
.logo {
  color: var(--gold);
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 4px;
}
nav { display: flex; gap: 20px; align-items: center; }
nav a {
  color: #ddd;
  text-decoration: none;
  font-size: 13px;
}
nav a:hover { color: var(--gold); }
.cart-button, .gold-button {
  background: var(--gold);
  color: #090909;
  border: 0;
  padding: 11px 17px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
}
.hero {
  padding: 85px 7% 75px;
  background:
    radial-gradient(ellipse at 80% 30%, #70501d55, transparent 45%),
    linear-gradient(120deg, #111, #080808 70%);
  border-bottom: 1px solid #29231a;
}
.eyebrow {
  color: var(--gold);
  letter-spacing: 4px;
  font-size: 11px;
  font-weight: bold;
}
.hero h1 {
  font-size: clamp(42px, 8vw, 78px);
  line-height: .98;
  max-width: 720px;
  margin: 20px 0;
}
.hero h1 span { color: var(--gold); }
.hero p { color: #aaa; max-width: 440px; line-height: 1.7; }
.section { padding: 45px 6%; }
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 24px;
}
.section-heading h2 { margin: 0; font-size: 25px; }
.section-heading h2 span { color: var(--gold); }
.search {
  background: #171717;
  color: white;
  border: 1px solid #393939;
  border-radius: 5px;
  padding: 12px 14px;
  width: min(100%, 260px);
  outline: none;
}
.categories {
  display: flex;
  gap: 9px;
  overflow-x: auto;
  padding-bottom: 18px;
}
.category {
  background: #171717;
  border: 1px solid #333;
  color: #ddd;
  border-radius: 30px;
  padding: 9px 16px;
  white-space: nowrap;
  cursor: pointer;
}
.category.active, .category:hover {
  background: var(--gold);
  border-color: var(--gold);
  color: #090909;
}
.products {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 18px;
}
.product {
  background: var(--panel);
  border: 1px solid #292929;
  border-radius: 9px;
  overflow: hidden;
  transition: .2s;
}
.product:hover { transform: translateY(-4px); border-color: #9b793d; }
.product img {
  display: block;
  width: 100%;
  height: 190px;
  object-fit: cover;
  background: #222;
}
.product-info { padding: 15px; }
.product-info small { color: var(--gold); }
.product-info h3 { margin: 9px 0; font-size: 17px; }
.product-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.price { color: var(--gold); font-weight: bold; }
.add-button {
  background: transparent;
  border: 1px solid var(--gold);
  color: var(--gold);
  border-radius: 4px;
  padding: 8px 11px;
  cursor: pointer;
}
.add-button:hover { background: var(--gold); color: #090909; }
.empty { color: var(--muted); padding: 25px 0; }
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}
.feature {
  background: #141414;
  border: 1px solid #292929;
  padding: 22px;
  border-radius: 8px;
}
.feature strong { color: var(--gold); display: block; margin-bottom: 9px; }
.feature p { color: #999; font-size: 13px; line-height: 1.6; margin-bottom: 0; }
footer {
  border-top: 1px solid #29231a;
  padding: 30px 6%;
  color: #888;
  font-size: 12px;
  text-align: center;
}
#cartPanel {
  display: none;
  position: fixed;
  z-index: 10;
  inset: 0;
  background: #000b;
  justify-content: flex-end;
}
.cart-content {
  width: min(420px, 100%);
  background: #121212;
  padding: 25px;
  height: 100%;
  overflow-y: auto;
  border-left: 1px solid #55421f;
}
.cart-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #333;
}
.close {
  float: right;
  background: none;
  color: white;
  border: 0;
  font-size: 25px;
  cursor: pointer;
}
@media(max-width:600px) {
  header { padding: 14px 4%; }
  .logo { font-size: 19px; letter-spacing: 2px; }
  nav { gap: 10px; }
  nav a { font-size: 11px; }
  .cart-button { padding: 9px 11px; }
  .hero { padding: 65px 6%; }
  .section { padding: 35px 5%; }
  .products { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .product img { height: 135px; }
  .product-info { padding: 11px; }
  .product-info h3 { font-size: 14px; }
  .product-bottom { align-items: flex-start; flex-direction: column; }
}
</style>
</head>
<body>

<header>
  <div class="logo">LUXE STORE</div>
  <nav>
    <a href="#home">Home</a>
    <a href="#shop">Shop</a>
    <a href="#about">About</a>
  </nav>
  <button class="cart-button" onclick="openCart()">Cart (<span id="cartCount">0</span>)</button>
</header>

<section class="hero" id="home">
  <div class="eyebrow">THE LUXE EXPERIENCE</div>
  <h1>SHOP BEYOND <span>ORDINARY.</span></h1>
  <p>Discover products, explore creators and experience a new way to shop. Welcome to LUXE STORE.</p>
  <a href="#shop"><button class="gold-button">EXPLORE STORE →</button></a>
</section>

<section class="section" id="shop">
  <div class="section-heading">
    <h2>FEATURED <span>COLLECTION</span></h2>
    <input class="search" id="search" placeholder="Search products..." oninput="renderProducts()">
  </div>

  <div class="categories">
    <button class="category active" onclick="setCategory('All',this)">All</button>
    <button class="category" onclick="setCategory('Fashion',this)">Fashion</button>
    <button class="category" onclick="setCategory('Tech',this)">Tech</button>
    <button class="category" onclick="setCategory('Accessories',this)">Accessories</button>
    <button class="category" onclick="setCategory('Lifestyle',this)">Lifestyle</button>
  </div>

  <div class="products" id="products"></div>
</section>

<section class="section" id="about">
  <div class="section-heading">
    <h2>WHY <span>LUXE STORE?</span></h2>
  </div>
  <div class="features">
    <div class="feature"><strong>✦ PREMIUM EXPERIENCE</strong><p>A clean, modern shopping experience built around quality and style.</p></div>
    <div class="feature"><strong>✦ SELLER COMMUNITY</strong><p>A place for customers, sellers and creators to connect.</p></div>
    <div class="feature"><strong>✦ LUXE REWARDS</strong><p>A rewards experience is part of the LUXE STORE vision.</p></div>
  </div>
</section>

<footer>
  © 2026 LUXE STORE. ALL RIGHTS RESERVED.<br><br>
  Built for the LUXE community.
</footer>

<div id="cartPanel" onclick="if(event.target.id==='cartPanel') closeCart()">
  <div class="cart-content">
    <button class="close" onclick="closeCart()">×</button>
    <h2>Your <span style="color:#d8ad55">Cart</span></h2>
    <div id="cartItems"></div>
    <h3 id="cartTotal">Total: D0</h3>
    <p style="color:#999;font-size:12px">Demo cart only. Checkout and payments will be connected after the secure store backend is built.</p>
    <button class="gold-button" onclick="alert('Checkout will be available in a future LUXE STORE update.')">CONTINUE</button>
  </div>
</div>

<script>
const products = [
  {name:"Classic Streetwear",category:"Fashion",price:850,image:"https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=700"},
  {name:"Urban Sneakers",category:"Fashion",price:1450,image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700"},
  {name:"Wireless Headphones",category:"Tech",price:1200,image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700"},
  {name:"Smart Watch",category:"Tech",price:1800,image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700"},
  {name:"Premium Shades",category:"Accessories",price:650,image:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=700"},
  {name:"Everyday Backpack",category:"Lifestyle",price:950,image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700"}
];

let selectedCategory = "All";
let cart = [];

function renderProducts() {
  const search = document.getElementById("search").value.toLowerCase();
  const filtered = products.filter(p =>
    (selectedCategory === "All" || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(search)
  );

  document.getElementById("products").innerHTML = filtered.length
    ? filtered.map(p => `
      <article class="product">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <div class="product-info">
          <small>${p.category.toUpperCase()}</small>
          <h3>${p.name}</h3>
          <div class="product-bottom">
            <span class="price">D${p.price.toLocaleString()}</span>
            <button class="add-button" onclick="addToCart('${p.name}')">+ Add</button>
          </div>
        </div>
      </article>
    `).join("")
    : '<p class="empty">No products found. Try another search.</p>';
}

function setCategory(category, button) {
  selectedCategory = category;
  document.querySelectorAll(".category").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  renderProducts();
}

function addToCart(name) {
  const product = products.find(p => p.name === name);
  cart.push(product);
  document.getElementById("cartCount").textContent = cart.length;
}

function openCart() {
  document.getElementById("cartPanel").style.display = "flex";
  renderCart();
}
function closeCart() {
  document.getElementById("cartPanel").style.display = "none";
}
function renderCart() {
  document.getElementById("cartItems").innerHTML = cart.length
    ? cart.map((p,i) => `
      <div class="cart-line">
        <span>${p.name}<br><small style="color:#d8ad55">D${p.price.toLocaleString()}</small></span>
        <button class="add-button" onclick="removeFromCart(${i})">Remove</button>
      </div>
    `).join("")
    : '<p class="empty">Your cart is empty.</p>';

  const total = cart.reduce((sum,p) => sum + p.price, 0);
  document.getElementById("cartTotal").textContent = "Total: D" + total.toLocaleString();
}
function removeFromCart(index) {
  cart.splice(index,1);
  document.getElementById("cartCount").textContent = cart.length;
  renderCart();
}

renderProducts();
</script>
</body>
</html>