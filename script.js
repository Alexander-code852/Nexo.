const GT_Store = {
    dbKey: 'nexo_database',
    products: [],

    state: {
        cart: {
            tech: JSON.parse(localStorage.getItem('nexo_cart_tech')) || [],
            glow: JSON.parse(localStorage.getItem('nexo_cart_glow')) || []
        },
        user: JSON.parse(localStorage.getItem('gt_user')) || null, 
        wishlist: JSON.parse(localStorage.getItem('nexo_wishlist')) || [], 
        currentSector: 'tech', 
        isCartOpen: false,
        authMode: 'login',
        searchQuery: '',
        currentCategory: 'all'
    },
    
    debouncedSearchFn: null,

    init() {
        // Inicializa la BD Local simulada
        const localDB = localStorage.getItem(this.dbKey);
        if (!localDB && typeof productosDB !== 'undefined') {
            localStorage.setItem(this.dbKey, JSON.stringify(productosDB));
            this.products = productosDB;
        } else {
            this.products = JSON.parse(localDB) || [];
        }

        this.executeSectorChange('tech'); 
        this.updateCartUI();
        this.updateUserUI();
        this.bindGlobalEvents();

        this.debouncedSearchFn = this.debounce((query) => {
            this.state.searchQuery = query.toLowerCase().trim();
            this.renderCatálogo();
        }, 300);

        window.addEventListener('load', () => {
            setTimeout(() => {
                const preloader = document.getElementById('preloader');
                if (preloader) preloader.classList.add('hidden');
            }, 600); 
        });
    },

    // --- SISTEMA SPA Y NAVEGACIÓN ---
    navigate(view, productId = null) {
        const doTransition = () => {
            document.querySelectorAll('.spa-view').forEach(el => {
                el.classList.remove('active-view');
                el.style.display = 'none';
            });

            if (view === 'home') {
                document.getElementById('view-home').style.display = 'block';
                document.getElementById('mainSectorSwitcher').style.display = 'flex';
                setTimeout(() => document.getElementById('view-home').classList.add('active-view'), 50);
                window.scrollTo(0, 0);
            } else if (view === 'product') {
                this.renderProductPage(productId);
                document.getElementById('view-product').style.display = 'block';
                document.getElementById('mainSectorSwitcher').style.display = 'none';
                setTimeout(() => document.getElementById('view-product').classList.add('active-view'), 50);
                window.scrollTo(0, 0);
            }
        };

        // Soporte para API de View Transitions (Animación fluida)
        if (document.startViewTransition) {
            document.startViewTransition(() => doTransition());
        } else {
            doTransition();
        }
    },

    renderProductPage(id) {
        const container = document.getElementById('detalleProductoContainer');
        const product = this.products.find(p => p.id === id);

        if (!product) return;
        this.executeSectorChange(product.sector);

        document.title = `${product.name} | NEXO`;

        container.innerHTML = `
            <div class="pd-grid">
                <div class="pd-img-container" style="view-transition-name: product-img-${product.id}">
                    <img src="${product.img}" alt="${product.name}" class="pd-img" loading="lazy">
                </div>
                <div class="pd-info">
                    <span class="product-cat-label" style="display:inline-block; font-size:0.8rem; margin-bottom:15px;">${product.sector}</span>
                    <h1 style="font-size: 3rem; margin-bottom: 15px;">${product.name}</h1>
                    <p class="pd-price">${this.formatPrice(product.price)}</p>
                    <p class="pd-desc">${product.desc || 'Diseño premium de alta calidad.'}</p>
                    ${product.stock ? `<p style="color: #00ff7a; font-weight:800; margin-bottom: 25px;"><i class="fa-solid fa-check"></i> Stock: ${product.stock} un.</p>` : ''}
                    
                    <div style="display:flex; gap:15px; margin-top: 30px;">
                        <button class="btn-solid-white" style="flex:1; padding: 18px; font-size: 1.1rem;" onclick="GT_Store.addToCart(${product.id})">
                            <i class="fa-solid fa-bag-shopping" style="margin-right:8px;"></i> AÑADIR AL CARRITO
                        </button>
                        <button class="wishlist-btn-large ${this.state.wishlist.includes(product.id) ? 'active' : ''}" onclick="GT_Store.toggleWishlist(${product.id}, event); this.classList.toggle('active')">
                            <i class="fa-solid fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // --- FORMATOS Y DEBOUNCE ---
    formatPrice(val) {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(val);
    },

    debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    },

    bindGlobalEvents() {
        const cartTrigger = document.getElementById('cartTrigger');
        const closeCart = document.getElementById('closeCart');
        const cartOverlay = document.getElementById('cartOverlay');
        const userBtn = document.getElementById('userBtn');

        if (cartTrigger) cartTrigger.onclick = () => this.toggleCart();
        if (closeCart) closeCart.onclick = () => this.toggleCart();
        if (cartOverlay) cartOverlay.onclick = () => this.toggleCart();
        
        if (userBtn) {
            userBtn.onclick = () => { if (this.state.user) this.openProfile(); else this.openAuth(); };
        }
    },

    toggleMobileMenu() {
        const menu = document.getElementById('mobileMenuOverlay');
        if(menu) menu.classList.toggle('active');
    },

    handleFilter(category) {
        this.state.currentCategory = category;
        this.renderCatálogo();
    },

    handleSearch(query) {
        if (this.debouncedSearchFn) this.debouncedSearchFn(query);
    },

    switchSector(sector, event) {
        if (this.state.currentSector === sector) return;

        const searchInput = document.getElementById('searchInput');
        if(searchInput) searchInput.value = '';
        this.state.searchQuery = '';
        this.state.currentCategory = 'all'; 

        const transitionLayer = document.getElementById('themeTransition');
        const mainUI = document.getElementById('mainUI');
        const navLogo = document.getElementById('navLogo');
        
        if(transitionLayer && mainUI) {
            const targetBg = sector === 'tech' ? '#16181c' : '#faf7f2';
            let x = window.innerWidth / 2; let y = 50;
            if (event) { x = event.clientX; y = event.clientY; }

            transitionLayer.style.backgroundColor = targetBg;
            transitionLayer.style.transition = 'none';
            transitionLayer.style.clipPath = `circle(0px at ${x}px ${y}px)`;
            void transitionLayer.offsetWidth; 

            transitionLayer.style.transition = 'clip-path 0.8s cubic-bezier(0.64, 0.04, 0.26, 1.01)';
            transitionLayer.style.clipPath = `circle(150vw at ${x}px ${y}px)`;
            
            mainUI.classList.add('fade-out');
            if (navLogo) { navLogo.style.opacity = '0'; navLogo.style.transform = 'translateY(-10px)'; }

            setTimeout(() => {
                this.executeSectorChange(sector);
                transitionLayer.style.transition = 'none';
                transitionLayer.style.clipPath = `circle(0px at ${x}px ${y}px)`;
                mainUI.classList.remove('fade-out');
                if (navLogo) { navLogo.style.opacity = '1'; navLogo.style.transform = 'translateY(0)'; }
            }, 600); 
        } else {
            this.executeSectorChange(sector);
        }
    },

    executeSectorChange(sector) {
        this.state.currentSector = sector;
        document.body.className = `${sector}-theme`;
        
        const btnTech = document.getElementById('btnTech');
        const btnGlow = document.getElementById('btnGlow');
        if(btnTech) btnTech.classList.toggle('active', sector === 'tech');
        if(btnGlow) btnGlow.classList.toggle('active', sector === 'glow');

        const navLogo = document.getElementById('navLogo');
        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');
        const heroImg = document.getElementById('heroImg');
        const estrellaTitle = document.getElementById('estrellaTitle');
        const catalogoTitle = document.getElementById('catalogoTitle');
        const contactEmail = document.getElementById('contactEmail');
        const categoryFilter = document.getElementById('categoryFilter');

        if (categoryFilter) {
            if (sector === 'tech') {
                categoryFilter.innerHTML = `
                    <option value="all" style="color: black;">Todas</option>
                    <option value="smartwatch" style="color: black;">Smartwatches</option>
                    <option value="audio" style="color: black;">Audio</option>
                    <option value="accesorios" style="color: black;">Accesorios</option>
                `;
            } else {
                categoryFilter.innerHTML = `
                    <option value="all" style="color: black;">Todas</option>
                    <option value="skincare" style="color: black;">Skincare</option>
                    <option value="makeup" style="color: black;">Makeup</option>
                `;
            }
        }

        if (sector === 'tech') {
            if(navLogo) navLogo.innerHTML = `NEXO.TECH`;
            if(heroTitle) {
                heroTitle.innerHTML = `EL FUTURO EN<br><span class="text-gradient">TU MUÑECA</span>`;
                heroSubtitle.innerText = `NEXO.TECH presenta la nueva era de la tecnología vestible. Diseño premium, funcionalidad sin límites.`;
                heroImg.src = `https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=800`;
                estrellaTitle.innerText = `PRODUCTOS ESTRELLA TECH`;
                catalogoTitle.innerText = `Catálogo Tech`;
            }
            if(contactEmail) contactEmail.innerText = `hola@nexo.tech`;
        } else {
            if(navLogo) navLogo.innerHTML = `NEXO.GLOW`;
            if(heroTitle) {
                heroTitle.innerHTML = `BELLEZA QUE<br><span class="text-gradient">ILUMINA</span>`;
                heroSubtitle.innerText = `NEXO.GLOW redefine el cuidado personal. Fórmulas exclusivas y acabados perfectos para resaltar tu esencia.`;
                heroImg.src = `https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800`;
                estrellaTitle.innerText = `PRODUCTOS ESTRELLA GLOW`;
                catalogoTitle.innerText = `Catálogo Glow`;
            }
            if(contactEmail) contactEmail.innerText = `hola@nexo.glow`;
        }

        this.renderEstrellas();
        this.renderCatálogo();
        this.updateCartUI();
    },

    toggleWishlist(id, event) {
        if(event) event.stopPropagation(); 
        const index = this.state.wishlist.indexOf(id);
        if (index > -1) {
            this.state.wishlist.splice(index, 1);
            this.showToast("Eliminado de favoritos");
        } else {
            this.state.wishlist.push(id);
            this.showToast("Guardado en favoritos");
        }
        localStorage.setItem('nexo_wishlist', JSON.stringify(this.state.wishlist));
        this.renderCatálogo(); 
    },

    renderEstrellas() {
        const container = document.getElementById('estrellaCardsContainer');
        if(!container) return;
        const filtered = this.products.filter(p => p.sector === this.state.currentSector).slice(0, 3);
        
        container.innerHTML = filtered.map(product => `
            <div class="e-card" onclick="GT_Store.navigate('product', ${product.id})">
                <div class="e-img-container"><img src="${product.img}" alt="${product.name}" class="e-img" loading="lazy"></div>
                <div class="e-info">
                    <h4>${product.name}</h4>
                    <p>${this.formatPrice(product.price)}</p>
                </div>
            </div>
        `).join('');
    },

    renderCatálogo() {
        const grid = document.getElementById('productGrid');
        if(!grid) return;
        
        const filtered = this.products.filter(p => {
            const isSector = p.sector === this.state.currentSector;
            const matchesSearch = p.name.toLowerCase().includes(this.state.searchQuery);
            const matchesCategory = this.state.currentCategory === 'all' || p.category === this.state.currentCategory;
            return isSector && matchesSearch && matchesCategory;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: var(--text-muted); padding: 40px;">No se encontraron productos en esta categoría.</p>`;
            return;
        }

        grid.innerHTML = filtered.map(product => {
            const isWished = this.state.wishlist.includes(product.id) ? 'active' : '';
            return `
            <article class="product-card" style="view-transition-name: product-${product.id}">
                <div class="wishlist-btn ${isWished}" onclick="GT_Store.toggleWishlist(${product.id}, event)">
                    <i class="fa-solid fa-heart"></i>
                </div>
                <img src="${product.img}" class="product-img" alt="${product.name}" loading="lazy" onclick="GT_Store.navigate('product', ${product.id})">
                <div class="product-info">
                    <span class="product-cat-label">${product.sector} &bull; ${product.category || 'general'}</span>
                    <div class="product-link-title" onclick="GT_Store.navigate('product', ${product.id})">
                        <h3>${product.name}</h3>
                    </div>
                    <div class="price-container">
                        <p class="price-tag">${this.formatPrice(product.price)}</p>
                        <button class="add-btn-round" aria-label="Añadir al carrito" onclick="GT_Store.addToCart(${product.id})">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>
            </article>
        `}).join('');
    },

    addToCart(id) {
        if (!this.state.user) {
            this.showToast("Debes iniciar sesión para comprar");
            this.openAuth();
            return;
        }
        const product = this.products.find(p => p.id === id);
        if(!product) return;

        const targetCart = this.state.cart[product.sector];
        const inCart = targetCart.find(item => item.id === id);
        
        if (inCart) { inCart.qty++; } else { targetCart.push({ ...product, qty: 1 }); }
        
        this.saveAndUpdate();
        this.showToast(`¡Añadido a NEXO.${product.sector.toUpperCase()}!`);
        this.animateCartIcon();
    },

    changeQty(idx, delta) {
        const currentCart = this.state.cart[this.state.currentSector];
        currentCart[idx].qty += delta;
        if (currentCart[idx].qty <= 0) currentCart.splice(idx, 1);
        this.saveAndUpdate();
    },

    saveAndUpdate() {
        localStorage.setItem('nexo_cart_tech', JSON.stringify(this.state.cart.tech));
        localStorage.setItem('nexo_cart_glow', JSON.stringify(this.state.cart.glow));
        this.updateCartUI();
    },

    updateCartUI() {
        const cartList = document.getElementById('cartItems');
        const cartQty = document.getElementById('cart-qty');
        const totalVal = document.getElementById('totalVal');
        const cartTitle = document.getElementById('cartTitle');
        const currentCart = this.state.cart[this.state.currentSector];

        if(cartTitle) cartTitle.innerText = `Carrito ${this.state.currentSector.toUpperCase()}`;
        if(cartQty) {
            const qty = currentCart.reduce((acc, i) => acc + i.qty, 0);
            cartQty.innerText = qty;
            cartQty.style.display = qty > 0 ? 'flex' : 'none'; 
        }

        if(cartList) {
            if (currentCart.length === 0) {
                cartList.innerHTML = `
                    <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
                        <i class="fa-solid fa-bag-shopping empty-cart-icon"></i>
                        <p>Tu carrito de ${this.state.currentSector.toUpperCase()} está vacío</p>
                    </div>`;
            } else {
                cartList.innerHTML = currentCart.map((item, idx) => `
                    <div class="cart-item">
                        <img src="${item.img}" alt="${item.name}" loading="lazy">
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <p class="cart-item-price">${this.formatPrice(item.price * item.qty)}</p>
                        </div>
                        <div class="qty-actions">
                            <button onclick="GT_Store.changeQty(${idx}, -1)">-</button>
                            <span>${item.qty}</span>
                            <button onclick="GT_Store.changeQty(${idx}, 1)">+</button>
                        </div>
                    </div>
                `).join('');
            }
        }

        if(totalVal) {
            const total = currentCart.reduce((acc, i) => acc + (i.price * i.qty), 0);
            totalVal.innerText = this.formatPrice(total);
        }
    },

    animateCartIcon() {
        const icon = document.querySelector('.cart-icon');
        if(icon) { icon.classList.remove('cart-bounce'); void icon.offsetWidth; icon.classList.add('cart-bounce'); }
    },

    toggleCart() {
        this.state.isCartOpen = !this.state.isCartOpen;
        const panel = document.getElementById('cartPanel');
        const overlay = document.getElementById('cartOverlay');
        if (panel) panel.classList.toggle('active', this.state.isCartOpen);
        if (overlay) overlay.classList.toggle('active', this.state.isCartOpen);
    },

    updateUserUI() {
        const userBtn = document.getElementById('userBtn');
        if (!userBtn) return;
        if (this.state.user) {
            userBtn.innerHTML = `<i class="fa-solid fa-user" style="color: var(--accent);"></i>`;
        } else {
            userBtn.innerHTML = `<i class="fa-regular fa-user"></i>`;
        }
    },

    showToast(msg) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent); margin-right: 8px;"></i> ${msg}`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('hiding'); setTimeout(() => toast.remove(), 300); }, 2500);
    },

    openProfile() {
        const modal = document.getElementById('profileModal');
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        const historyContainer = document.getElementById('orderHistoryContainer');

        if(!this.state.user) return;

        nameEl.innerText = `Hola, ${this.state.user.name}`;
        emailEl.innerText = this.state.user.email;

        let usersDB = JSON.parse(localStorage.getItem('nexo_users_db')) || [];
        const fullUser = usersDB.find(u => u.email === this.state.user.email);

        if(fullUser && fullUser.orders && fullUser.orders.length > 0) {
            const reversedOrders = [...fullUser.orders].reverse();
            historyContainer.innerHTML = reversedOrders.map(order => `
                <div class="order-card">
                    <div>
                        <p class="order-id">Orden #${order.id}</p>
                        <p class="order-date">${order.date} • ${order.sector.toUpperCase()}</p>
                    </div>
                    <div style="text-align: right;">
                        <p class="order-total">${this.formatPrice(order.total)}</p>
                        <span class="order-status">Pagado</span>
                    </div>
                </div>
            `).join('');
        } else {
            historyContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 20px;">Aún no tienes pedidos registrados.</p>`;
        }
        modal.classList.add('active'); document.body.style.overflow = 'hidden';
    },

    closeProfile() { document.getElementById('profileModal').classList.remove('active'); document.body.style.overflow = ''; },

    togglePassword() {
        const passInput = document.getElementById('authPass');
        const eyeIcon = document.getElementById('eyeIcon');
        if (passInput.type === 'password') {
            passInput.type = 'text'; eyeIcon.classList.replace('fa-eye', 'fa-eye-slash'); eyeIcon.style.color = 'var(--accent)';
        } else {
            passInput.type = 'password'; eyeIcon.classList.replace('fa-eye-slash', 'fa-eye'); eyeIcon.style.color = '';
        }
    },

    toggleAuthMode() {
        this.state.authMode = this.state.authMode === 'login' ? 'register' : 'login';
        const isRegister = this.state.authMode === 'register';
        document.getElementById('authTitle').innerText = isRegister ? 'Crear Cuenta' : 'Iniciar Sesión';
        document.getElementById('authBtnText').innerText = isRegister ? 'Registrarme' : 'Ingresar';
        document.getElementById('authSwitchText').innerText = isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
        document.getElementById('registerFields').style.display = isRegister ? 'block' : 'none';
        document.getElementById('authName').required = isRegister;
        document.getElementById('authForm').reset();
        document.getElementById('authPass').type = 'password';
        document.getElementById('eyeIcon').className = 'fa-regular fa-eye';
        document.getElementById('eyeIcon').style.color = '';
    },

    submitAuth(e) {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const passRaw = document.getElementById('authPass').value;
        const encodedPass = btoa(passRaw);
        const isRegister = this.state.authMode === 'register';
        let usersDB = JSON.parse(localStorage.getItem('nexo_users_db')) || [];

        if (isRegister) {
            const name = document.getElementById('authName').value;
            if (usersDB.find(u => u.email === email)) { this.showToast("Ese correo ya está registrado."); return; }
            usersDB.push({ email: email, name: name, pass: encodedPass, orders: [] });
            localStorage.setItem('nexo_users_db', JSON.stringify(usersDB));
            this.state.user = { email: email, name: name };
            localStorage.setItem('gt_user', JSON.stringify(this.state.user));
            this.showToast(`¡Cuenta creada, ${name}!`);
        } else {
            const user = usersDB.find(u => u.email === email && u.pass === encodedPass);
            if (user) {
                this.state.user = { email: user.email, name: user.name };
                localStorage.setItem('gt_user', JSON.stringify(this.state.user));
                this.showToast(`¡Hola, ${user.name}!`);
            } else { this.showToast("Correo o contraseña incorrectos."); return; }
        }
        this.updateUserUI(); this.closeAuth();
    },

    openAuth() { document.getElementById('authModal').classList.add('active'); },
    closeAuth() { document.getElementById('authModal').classList.remove('active'); document.getElementById('authForm').reset(); },

    confirmLogout() {
        this.closeProfile(); localStorage.removeItem('gt_user'); this.state.user = null; this.updateUserUI(); this.showToast("Sesión cerrada");
    },
    
    openCheckout() {
        const currentCart = this.state.cart[this.state.currentSector];
        if (currentCart.length === 0) { this.showToast(`Tu carrito ${this.state.currentSector.toUpperCase()} está vacío`); return; }
        if (this.state.isCartOpen) this.toggleCart();
        
        document.getElementById('checkoutModal').classList.add('active'); document.body.style.overflow = 'hidden';
        const itemsContainer = document.getElementById('checkoutItemsContainer');
        const totalVal = document.getElementById('checkoutTotalVal');
        
        document.getElementById('checkoutSummaryTitle').innerText = `Pedido ${this.state.currentSector.toUpperCase()}`;
        itemsContainer.innerHTML = currentCart.map(item => `
            <div class="chk-item">
                <img src="${item.img}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover; margin-right: 10px; mix-blend-mode: var(--blend-mode);" loading="lazy">
                <div style="flex: 1;">
                    <p style="font-weight: 600; color: var(--text-main); margin-bottom: 3px; font-size: 0.9rem;">${item.name}</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">Cant: ${item.qty}</p>
                </div>
                <span style="font-weight: bold; color: var(--accent);">${this.formatPrice(item.price * item.qty)}</span>
            </div>
        `).join('');

        totalVal.innerText = this.formatPrice(currentCart.reduce((acc, i) => acc + (i.price * i.qty), 0));
    },

    closeCheckout() {
        document.getElementById('checkoutModal').classList.remove('active'); document.body.style.overflow = '';
        setTimeout(() => { if(document.getElementById('checkoutContent').innerHTML.includes('success-ticket')) location.reload(); }, 300);
    },

    togglePaymentFields() {
        document.querySelectorAll('.pay-method').forEach(lbl => lbl.classList.remove('active'));
        const checked = document.querySelector('input[name="payment"]:checked');
        if(checked) {
            checked.parentElement.classList.add('active');
            document.getElementById('cardFields').style.display = checked.value === 'card' ? 'block' : 'none';
        }
    },

    processPayment(btn) {
        const inputs = document.querySelectorAll('.checkout-form input[required]');
        let isValid = true;
        inputs.forEach(input => { if(!input.value) isValid = false; });
        if(!isValid) { this.showToast("Completa tus datos de envío"); return; }

        const checkoutContent = document.getElementById('checkoutContent');
        checkoutContent.innerHTML = `<div class="gateway-loader"><div class="spinner"></div><h3 style="font-size:1.5rem; margin-bottom:10px; font-family: var(--font-title);">Procesando Pago...</h3><p style="color:var(--text-muted);">Conectando con servidor seguro</p></div>`;

        setTimeout(() => {
            const currentCart = this.state.cart[this.state.currentSector];
            const total = currentCart.reduce((acc, i) => acc + (i.price * i.qty), 0);
            const orderNumber = Math.floor(Math.random() * 900000) + 100000;
            
            if (this.state.user) {
                let usersDB = JSON.parse(localStorage.getItem('nexo_users_db')) || [];
                const userIndex = usersDB.findIndex(u => u.email === this.state.user.email);
                if (userIndex > -1) {
                    if (!usersDB[userIndex].orders) usersDB[userIndex].orders = [];
                    usersDB[userIndex].orders.push({ id: orderNumber, date: new Date().toLocaleDateString('es-ES'), sector: this.state.currentSector, total: total, items: currentCart });
                    localStorage.setItem('nexo_users_db', JSON.stringify(usersDB));
                }
            }

            checkoutContent.innerHTML = `
                <div class="success-ticket" style="text-align:center; padding:40px 20px;">
                    <button class="close-checkout" onclick="GT_Store.closeCheckout()"><i class="fa-solid fa-xmark"></i></button>
                    <i class="fa-solid fa-circle-check" style="font-size: 5rem; color: #00ff7a; margin-bottom: 20px; filter: drop-shadow(0 0 20px rgba(0,255,122,0.4));"></i>
                    <h2 style="font-size:2rem; margin-bottom:10px; font-family: var(--font-title);">¡Pago Aprobado!</h2>
                    <p style="color: var(--text-muted); margin-bottom: 30px;">Tu pedido de la línea ${this.state.currentSector.toUpperCase()} ha sido confirmado.</p>
                    <button class="btn-solid-white" style="width:100%;" onclick="GT_Store.closeCheckout()">Volver al Inicio</button>
                </div>
            `;
            this.state.cart[this.state.currentSector] = []; this.saveAndUpdate();
        }, 2500); 
    }
};

document.addEventListener('DOMContentLoaded', () => GT_Store.init());