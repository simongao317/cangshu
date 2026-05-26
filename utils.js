/* ========== 工具函数 ========== */

function showToast(message, type = 'info', duration = 3000) {
    const container = document.querySelector('.toast-container') || (() => {
        const div = document.createElement('div');
        div.className = 'toast-container';
        document.body.appendChild(div);
        return div;
    })();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
}

function formatDateFull(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function calculatePendingDays(pendingSince) {
    if (!pendingSince) return null;
    const pendingDate = new Date(pendingSince);
    const now = new Date();
    const diff = now - pendingDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - days);
}

function normalizeISBN(isbn) {
    return isbn ? isbn.replace(/[-\s]/g, '') : '';
}

function validateBook(book) {
    const errors = [];
    if (!book.title) errors.push('书名不能为空');
    if (!book.identifierKind) errors.push('请选择书号类型');
    if (book.identifierKind === 'ISBN' && !book.isbn) errors.push('ISBN不能为空');
    if (book.identifierKind === '统一书号' && !book.unifiedNumber) errors.push('统一书号不能为空');
    if (book.identifierKind === '自定义书号' && !book.customNumber) errors.push('自定义书号不能为空');
    if (book.ownershipStatus === '已买' && !book.ownedReadingStatus) errors.push('请选择阅读状态');
    if (book.ownershipStatus === '未买' && !book.wishlistReadingStatus) errors.push('请选择想读状态');
    return errors;
}

function generateBookCardHTML(book) {
    const pendingDays = calculatePendingDays(book.pendingSince);
    const isPending = book.wishlistReadingStatus === '待定';
    const pendingWarning = isPending && pendingDays !== null ? 
        `<div class="pending-warning">${pendingDays}天后删除</div>` : '';

    const cover = book.coverUrl ? 
        `<img src="${book.coverUrl}" alt="${book.title}" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\'fas fa-book\'></i>';" />` :
        `<i class="fas fa-book"></i>`;

    const ownershipText = book.ownershipStatus === '已买' ? '已买' : '未买';
    const readingText = book.ownershipStatus === '已买' ? 
        (book.ownedReadingStatus === '已读' ? '已读' : '未读') :
        (book.wishlistReadingStatus === '已读' ? '已读' : 
         book.wishlistReadingStatus === '想读' ? '想读' : '待定');

    const identifier = book.identifierKind === 'ISBN' ? book.isbn :
        book.identifierKind === '统一书号' ? book.unifiedNumber : book.customNumber;

    return `
        <div class="book-card" data-id="${book.id}">
            <div class="book-cover">${cover}</div>
            <div class="book-info">
                <div class="book-title" title="${book.title}">${book.title}</div>
                <div class="book-author" title="${book.authors || ''}">${book.authors || ''}</div>
                <div class="book-publisher">${book.publisher || ''} ${book.publicationDate || ''}</div>
                <div class="book-isbn">${book.identifierKind}: ${identifier}</div>
                <div class="book-meta">
                    <span class="tag tag-ownership" data-action="toggle-ownership">${ownershipText}</span>
                    <span class="tag tag-reading" data-action="toggle-reading">${readingText}</span>
                    ${book.entrySource ? `<span class="tag tag-source">${book.entrySource}</span>` : ''}
                    <span class="book-time">${formatDate(book.categoryDate || book.createdAt)}</span>
                </div>
                ${pendingWarning}
            </div>
        </div>
    `;
}

function parseCSV(content) {
    return new Promise((resolve) => {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // 检查是否是豆瓣格式
                const isDoubanFormat = results.data.length > 0 && 
                    results.data[0].hasOwnProperty('shelf') && 
                    results.data[0].hasOwnProperty('subject_id');
                resolve({ data: results.data, isDoubanFormat });
            },
            error: (error) => {
                showToast(`CSV解析失败: ${error.message}`, 'error');
                resolve({ data: [], isDoubanFormat: false });
            }
        });
    });
}

function parseXLSX(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                resolve(json);
            } catch (error) {
                showToast(`Excel解析失败: ${error.message}`, 'error');
                resolve([]);
            }
        };
        reader.onerror = () => {
            showToast('文件读取失败', 'error');
            resolve([]);
        };
        reader.readAsArrayBuffer(file);
    });
}

function exportToCSV(books) {
    const headers = [
        '书号类型', 'ISBN', '统一书号', '自定义书号', '书名', '原名', '丛书名',
        '作者', '作者国籍', '出版时间', '出版社', '收藏状态', '已买阅读标签',
        '未买阅读标签', '录入方式', '封面链接', '添加时间', '分类时间', '待定开始时间'
    ];

    const rows = books.map(book => [
        book.identifierKind || '',
        book.isbn || '',
        book.unifiedNumber || '',
        book.customNumber || '',
        book.title || '',
        book.originalTitle || '',
        book.seriesTitle || '',
        book.authors || '',
        book.authorNationality || '',
        book.publicationDate || '',
        book.publisher || '',
        book.ownershipStatus || '',
        book.ownedReadingStatus || '',
        book.wishlistReadingStatus || '',
        book.entrySource || '',
        book.coverUrl || '',
        book.createdAt || '',
        book.categoryDate || '',
        book.pendingSince || ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `藏书_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function createModal(title, content, footer = '') {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">${content}</div>
            ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
    `;
    document.getElementById('modal-container').appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    return modal;
}

function getCategoryBooks(books, category, subcategory) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 自动删除待定超过30天的书
    const toDelete = books.filter(b => 
        b.ownershipStatus === '未买' && 
        b.wishlistReadingStatus === '待定' && 
        b.pendingSince && 
        new Date(b.pendingSince) < thirtyDaysAgo
    );
    
    if (toDelete.length > 0) {
        toDelete.forEach(b => deleteBook(b.id));
        books = books.filter(b => !toDelete.find(d => d.id === b.id));
    }

    switch (category) {
        case 'owned':
            if (subcategory === 'owned-read') {
                return books.filter(b => 
                    b.ownershipStatus === '已买' && 
                    b.ownedReadingStatus === '已读'
                );
            } else { // owned-unread
                return books.filter(b => 
                    b.ownershipStatus === '已买' && 
                    b.ownedReadingStatus === '未读'
                );
            }
        case 'wishlist':
            if (subcategory === 'wishlist-owned') {
                return books.filter(b => 
                    b.ownershipStatus === '已买' && 
                    b.ownedReadingStatus === '未读'
                );
            } else { // wishlist-not-owned
                return books.filter(b => 
                    b.ownershipStatus === '未买' && 
                    b.wishlistReadingStatus === '想读'
                );
            }
        case 'read-borrowed':
            return books.filter(b => 
                b.ownershipStatus === '未买' && 
                b.wishlistReadingStatus === '已读'
            );
        default:
            return [];
    }
}

function updateCategoryCounts(books) {
    const owned = books.filter(b => b.ownershipStatus === '已买').length;
    const wishlist = books.filter(b => 
        (b.ownershipStatus === '已买' && b.ownedReadingStatus === '未读') ||
        (b.ownershipStatus === '未买' && b.wishlistReadingStatus === '想读')
    ).length;
    const readBorrowed = books.filter(b => 
        b.ownershipStatus === '未买' && b.wishlistReadingStatus === '已读'
    ).length;

    document.getElementById('owned-count').textContent = owned;
    document.getElementById('wishlist-count').textContent = wishlist;
    document.getElementById('read-borrowed-count').textContent = readBorrowed;
}
