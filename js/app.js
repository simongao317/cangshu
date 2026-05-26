/* ========== 主应用模块 ========== */

const AppState = {
    currentCategory: 'owned',
    currentSubcategory: 'owned-unread',
    currentSort: 'time-desc',
    currentSearch: '',
    allBooks: []
};

async function initApp() {
    try {
        await openDB();
        await loadAllBooks();
        setupEventListeners();
        await refreshBookList();
        showToast('藏书应用已就绪', 'success');
    } catch (err) {
        showToast(`初始化失败: ${err.message}`, 'error');
        console.error(err);
    }
}

async function loadAllBooks() {
    AppState.allBooks = await getAllBooks();
    updateCategoryCounts(AppState.allBooks);
}

async function refreshBookList() {
    const listContainer = document.getElementById('book-list');
    const emptyState = document.getElementById('empty-state');
    
    // 获取当前分类的图书
    let books = getCategoryBooks(AppState.allBooks, AppState.currentCategory, AppState.currentSubcategory);
    
    // 搜索过滤
    if (AppState.currentSearch) {
        const q = AppState.currentSearch.toLowerCase();
        books = books.filter(b => 
            (b.title && b.title.toLowerCase().includes(q)) ||
            (b.authors && b.authors.toLowerCase().includes(q)) ||
            (b.isbn && b.isbn.includes(AppState.currentSearch)) ||
            (b.publisher && b.publisher.toLowerCase().includes(q))
        );
    }
    
    // 排序
    books.sort((a, b) => {
        const dateA = a.categoryDate || a.createdAt;
        const dateB = b.categoryDate || b.createdAt;
        if (AppState.currentSort === 'time-desc') {
            return new Date(dateB) - new Date(dateA);
        } else {
            return new Date(dateA) - new Date(dateB);
        }
    });
    
    // 渲染图书列表
    if (books.length === 0) {
        listContainer.innerHTML = emptyState.outerHTML;
        return;
    }
    
    listContainer.innerHTML = books.map(generateBookCardHTML).join('');
    
    // 为卡片添加点击事件
    listContainer.querySelectorAll('.book-card').forEach(card => {
        const bookId = parseInt(card.dataset.id);
        const book = books.find(b => b.id === bookId);
        
        // 点击卡片主体进入编辑
        card.onclick = (e) => {
            if (!e.target.closest('.tag')) {
                showEditModal(book);
            }
        };
        
        // 点击状态标签
        card.querySelectorAll('.tag[data-action="toggle-ownership"]').forEach(tag => {
            tag.onclick = (e) => {
                e.stopPropagation();
                showStatusPopup(book, 'ownership');
            };
        });
        
        card.querySelectorAll('.tag[data-action="toggle-reading"]').forEach(tag => {
            tag.onclick = (e) => {
                e.stopPropagation();
                showStatusPopup(book, 'reading');
            };
        });
    });
}

function setupEventListeners() {
    // 分类切换
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.onclick = async () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const category = tab.dataset.category;
            AppState.currentCategory = category;
            
            // 更新子分类
            const subNav = document.getElementById('subcategory-nav');
            subNav.innerHTML = '';
            
            let subcategories = [];
            switch (category) {
                case 'owned':
                    subcategories = [
                        { id: 'owned-unread', name: '已购 · 未读' },
                        { id: 'owned-read', name: '已购 · 已读' }
                    ];
                    break;
                case 'wishlist':
                    subcategories = [
                        { id: 'wishlist-owned', name: '想读 · 已购' },
                        { id: 'wishlist-not-owned', name: '想读 · 未购买' }
                    ];
                    break;
                case 'read-borrowed':
                    subcategories = [
                        { id: 'read-borrowed-all', name: '未购已读' }
                    ];
                    break;
            }
            
            subcategories.forEach((sub, i) => {
                const btn = document.createElement('button');
                btn.className = `subcategory-btn ${i === 0 ? 'active' : ''}`;
                btn.dataset.subcategory = sub.id;
                btn.textContent = sub.name;
                btn.onclick = async () => {
                    document.querySelectorAll('.subcategory-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    AppState.currentSubcategory = sub.id;
                    await refreshBookList();
                };
                subNav.appendChild(btn);
            });
            
            AppState.currentSubcategory = subcategories[0].id;
            await refreshBookList();
        };
    });
    
    // 排序切换
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.onclick = async () => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentSort = btn.dataset.sort;
            await refreshBookList();
        };
    });
    
    // 搜索框
    const searchInput = document.getElementById('search-input');
    const debouncedSearch = debounce(async (value) => {
        AppState.currentSearch = value;
        await refreshBookList();
    }, 300);
    searchInput.oninput = (e) => debouncedSearch(e.target.value);
    
    // 扫码按钮
    document.getElementById('scan-btn').onclick = showScanModal;
    
    // 导入按钮
    document.getElementById('import-btn').onclick = showImportModal;
    
    // 导出按钮
    document.getElementById('export-btn').onclick = showExportModal;
    
    // 文件上传
    const fileUpload = document.getElementById('file-upload');
    fileUpload.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const type = fileUpload.dataset.type;
        await handleFileImport(file, type);
        fileUpload.value = '';
    };
    
    // 离线检测
    window.addEventListener('online', () => showToast('网络已恢复', 'success'));
    window.addEventListener('offline', () => showToast('网络已断开，部分功能受限', 'warning'));
    
    // 页面可见性变化时刷新
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadAllBooks();
        }
    });
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initSubcategoryHandlers();
});

function initSubcategoryHandlers() {
    document.querySelectorAll('#subcategory-nav .subcategory-btn').forEach(btn => {
        btn.onclick = async () => {
            document.querySelectorAll('.subcategory-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentSubcategory = btn.dataset.subcategory;
            await refreshBookList();
        };
    });
}

// 注册 Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {
            // 本地文件打开时无法注册 Service Worker，静默忽略
        });
    });
}
