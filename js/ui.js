/* ========== UI 交互模块 ========== */

function showScanModal() {
    const content = `
        <div class="scanner-container" id="scanner-container">
            <video id="scanner-video" autoplay playsinline></video>
            <div class="overlay"></div>
        </div>
        <div class="scanner-hint">将ISBN条形码对准扫描区域</div>
        <div class="text-center mt-4">
            <button class="btn btn-secondary" id="manual-isbn-btn">
                <i class="fas fa-keyboard"></i> 手动输入ISBN
            </button>
        </div>
    `;

    const modal = createModal('扫码录入', content);
    const modalEl = modal.querySelector('.modal');
    modalEl.classList.add('modal-lg');

    let codeReader = null;

    // 启动扫码
    async function startScanner() {
        try {
            const videoEl = document.getElementById('scanner-video');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            videoEl.srcObject = stream;
            await videoEl.play();

            codeReader = new ZXing.BrowserMultiFormatReader();
            codeReader.decodeFromVideoDevice(null, videoEl, (result, err) => {
                if (result) {
                    const isbn = normalizeISBN(result.text);
                    if (isbn) {
                        stopScanner();
                        modal.remove();
                        handleISBNLookup(isbn);
                    }
                }
            });
        } catch (err) {
            showToast('无法访问摄像头，请使用手动输入', 'error');
        }
    }

    function stopScanner() {
        if (codeReader) {
            codeReader.reset();
            codeReader = null;
        }
        const videoEl = document.getElementById('scanner-video');
        if (videoEl && videoEl.srcObject) {
            videoEl.srcObject.getTracks().forEach(t => t.stop());
        }
    }

    modal.querySelector('.modal-close').onclick = () => {
        stopScanner();
        modal.remove();
    };
    modal.onclick = (e) => {
        if (e.target === modal) {
            stopScanner();
            modal.remove();
        }
    };

    document.getElementById('manual-isbn-btn').onclick = () => {
        stopScanner();
        modal.remove();
        showManualISBNInput();
    };

    startScanner();
}

function showManualISBNInput() {
    const content = `
        <div class="form-group">
            <label>输入ISBN</label>
            <input type="text" id="manual-isbn-input" placeholder="例如: 9787301361801" autofocus>
        </div>
    `;
    const footer = `
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" id="confirm-isbn-btn">查询</button>
    `;

    const modal = createModal('手动输入ISBN', content, footer);

    document.getElementById('confirm-isbn-btn').onclick = () => {
        const isbn = document.getElementById('manual-isbn-input').value.trim();
        if (!isbn) {
            showToast('请输入ISBN', 'error');
            return;
        }
        modal.remove();
        handleISBNLookup(normalizeISBN(isbn));
    };

    document.getElementById('manual-isbn-input').onkeydown = (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirm-isbn-btn').click();
        }
    };
}

async function handleISBNLookup(isbn) {
    const content = `
        <div class="text-center" style="padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
            <p style="margin-top: 12px; color: var(--text-secondary);">正在查询 ISBN: ${isbn}...</p>
        </div>
    `;
    const modal = createModal('查询中', content);

    try {
        const { candidates, errors } = await lookupISBN(isbn);
        modal.remove();
        showCandidateList(isbn, candidates, errors);
    } catch (err) {
        modal.remove();
        showToast(`查询失败: ${err.message}`, 'error');
    }
}

function showCandidateList(isbn, candidates, errors) {
    let content = '';
    
    if (errors.length > 0) {
        content += `<div class="text-muted mb-4" style="font-size:12px;">部分来源查询失败: ${errors.map(e => e.sourceName).join(', ')}</div>`;
    }

    content += '<div class="candidate-list">';
    candidates.forEach((c, i) => {
        content += `
            <div class="candidate-card" data-candidate="${i}">
                <div class="candidate-cover">
                    ${c.coverUrl ? `<img src="${c.coverUrl}" alt="${c.title}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas fa-book\\'></i>';">` : '<i class="fas fa-book"></i>'}
                </div>
                <div class="candidate-info">
                    <div class="candidate-title">${c.title}</div>
                    <div class="candidate-detail">${c.authors} ${c.publicationDate} ${c.publisher}</div>
                    <span class="candidate-source">${c.sourceName}</span>
                </div>
            </div>
        `;
    });
    content += '</div>';

    const modal = createModal(`ISBN: ${isbn} - 选择结果`, content);
    const modalEl = modal.querySelector('.modal');
    modalEl.classList.add('modal-lg');

    modal.querySelectorAll('.candidate-card').forEach(card => {
        card.onclick = async () => {
            const idx = parseInt(card.dataset.candidate);
            const candidate = candidates[idx];
            modal.remove();
            await saveBookFromCandidate(candidate);
        };
    });
}

async function saveBookFromCandidate(candidate) {
    const currentCategory = AppState.currentCategory;
    const currentSubcategory = AppState.currentSubcategory;

    let ownershipStatus, ownedReadingStatus, wishlistReadingStatus;

    switch (currentCategory) {
        case 'owned':
            ownershipStatus = '已买';
            ownedReadingStatus = currentSubcategory === 'owned-read' ? '已读' : '未读';
            wishlistReadingStatus = '';
            break;
        case 'wishlist':
            if (currentSubcategory === 'wishlist-owned') {
                ownershipStatus = '已买';
                ownedReadingStatus = '未读';
                wishlistReadingStatus = '';
            } else {
                ownershipStatus = '未买';
                ownedReadingStatus = '';
                wishlistReadingStatus = '想读';
            }
            break;
        case 'read-borrowed':
            ownershipStatus = '未买';
            ownedReadingStatus = '';
            wishlistReadingStatus = '已读';
            break;
        default:
            ownershipStatus = '已买';
            ownedReadingStatus = '未读';
            wishlistReadingStatus = '';
    }

    const book = {
        identifierKind: candidate.identifierKind || 'ISBN',
        isbn: candidate.isbn || '',
        unifiedNumber: '',
        customNumber: '',
        title: candidate.title || `ISBN: ${candidate.isbn}`,
        originalTitle: '',
        seriesTitle: '',
        authors: candidate.authors || '',
        authorNationality: '',
        publicationDate: candidate.publicationDate || '',
        publisher: candidate.publisher || '',
        ownershipStatus,
        ownedReadingStatus,
        wishlistReadingStatus,
        entrySource: '扫码导入',
        coverUrl: candidate.coverUrl || '',
        doubanSubjectID: '',
        doubanSubjectURL: ''
    };

    try {
        await addBook(book);
        showToast(`已添加: ${book.title}`, 'success');
        await refreshBookList();
    } catch (err) {
        showToast(`添加失败: ${err.message}`, 'error');
    }
}

function showImportModal() {
    const content = `
        <div class="text-center" style="padding: 20px;">
            <p class="mb-4">选择导入文件格式</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="btn btn-primary" id="import-csv-btn">
                    <i class="fas fa-file-csv"></i> 导入 CSV
                </button>
                <button class="btn btn-primary" id="import-xlsx-btn">
                    <i class="fas fa-file-excel"></i> 导入 XLSX (豆瓣)
                </button>
            </div>
        </div>
    `;
    const modal = createModal('导入图书', content);

    document.getElementById('import-csv-btn').onclick = () => {
        modal.remove();
        const input = document.getElementById('file-upload');
        input.accept = '.csv';
        input.dataset.type = 'csv';
        input.click();
    };

    document.getElementById('import-xlsx-btn').onclick = () => {
        modal.remove();
        const input = document.getElementById('file-upload');
        input.accept = '.xlsx,.xls';
        input.dataset.type = 'xlsx';
        input.click();
    };
}

async function handleFileImport(file, type) {
    const content = `
        <div class="text-center" style="padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
            <p style="margin-top: 12px; color: var(--text-secondary);">正在解析文件...</p>
        </div>
    `;
    const modal = createModal('导入中', content);

    try {
        let books = [];
        if (type === 'csv') {
            const text = await file.text();
            const rows = await parseCSV(text);
            books = rows.map(row => ({
                identifierKind: row['书号类型'] || 'ISBN',
                isbn: normalizeISBN(row['ISBN'] || ''),
                unifiedNumber: row['统一书号'] || '',
                customNumber: row['自定义书号'] || '',
                title: row['书名'] || '',
                originalTitle: row['原名'] || '',
                seriesTitle: row['丛书名'] || '',
                authors: row['作者'] || '',
                authorNationality: row['作者国籍'] || '',
                publicationDate: row['出版时间'] || '',
                publisher: row['出版社'] || '',
                ownershipStatus: row['收藏状态'] || '已买',
                ownedReadingStatus: row['已买阅读标签'] || '未读',
                wishlistReadingStatus: row['未买阅读标签'] || '',
                entrySource: row['录入方式'] || 'CSV或Excel导入',
                coverUrl: row['封面链接'] || '',
                createdAt: row['添加时间'] || new Date().toISOString(),
                categoryDate: row['分类时间'] || new Date().toISOString(),
                pendingSince: row['待定开始时间'] || null
            }));
        } else if (type === 'xlsx') {
            const rows = await parseXLSX(file);
            const fileName = file.name.toLowerCase();
            const isOwned = fileName.includes('已购') || fileName.includes('已买');
            const isReadBorrowed = fileName.includes('未购已读') || fileName.includes('未买已读');

            books = rows.map(row => {
                let ownershipStatus = '未买';
                let ownedReadingStatus = '';
                let wishlistReadingStatus = '想读';

                if (isOwned) {
                    ownershipStatus = '已买';
                    const status = (row['status'] || '').toLowerCase();
                    ownedReadingStatus = status.includes('读') ? '已读' : '未读';
                } else if (isReadBorrowed) {
                    ownershipStatus = '未买';
                    wishlistReadingStatus = '已读';
                } else {
                    const status = (row['status'] || '').toLowerCase();
                    if (status.includes('读')) {
                        ownershipStatus = '未买';
                        wishlistReadingStatus = '已读';
                    }
                }

                let authors = '', publisher = '', publicationDate = '';
                if (row['pub']) {
                    const parts = row['pub'].split('/').map(s => s.trim());
                    if (parts.length >= 3) {
                        authors = parts[0];
                        publisher = parts[1];
                        publicationDate = parts[2];
                    } else if (parts.length === 2) {
                        publisher = parts[0];
                        publicationDate = parts[1];
                    } else {
                        publisher = parts[0];
                    }
                }

                return {
                    identifierKind: '自定义书号',
                    isbn: '',
                    unifiedNumber: '',
                    customNumber: row['subject_id'] ? String(row['subject_id']) : '',
                    title: row['title'] || '',
                    originalTitle: row['subtitle'] || '',
                    seriesTitle: '',
                    authors: authors,
                    authorNationality: '',
                    publicationDate: publicationDate,
                    publisher: publisher,
                    ownershipStatus,
                    ownedReadingStatus,
                    wishlistReadingStatus,
                    entrySource: 'CSV或Excel导入',
                    coverUrl: row['cover_url'] || '',
                    doubanSubjectID: row['subject_id'] ? String(row['subject_id']) : '',
                    doubanSubjectURL: row['subject_url'] || '',
                    categoryDate: row['date'] || new Date().toISOString(),
                    pendingSince: null
                };
            });
        }

        modal.remove();

        // 去重检查
        const existingBooks = await getAllBooks();
        const existingKeys = new Set();
        existingBooks.forEach(b => {
            if (b.isbn) existingKeys.add(`ISBN:${b.isbn}`);
            if (b.unifiedNumber) existingKeys.add(`统一书号:${b.unifiedNumber}`);
            if (b.customNumber) existingKeys.add(`自定义书号:${b.customNumber}`);
            if (b.doubanSubjectID) existingKeys.add(`douban:${b.doubanSubjectID}`);
            if (b.title) existingKeys.add(`title:${b.title}`);
        });

        const newBooks = books.filter(b => {
            const keys = [];
            if (b.isbn) keys.push(`ISBN:${b.isbn}`);
            if (b.unifiedNumber) keys.push(`统一书号:${b.unifiedNumber}`);
            if (b.customNumber) keys.push(`自定义书号:${b.customNumber}`);
            if (b.doubanSubjectID) keys.push(`douban:${b.doubanSubjectID}`);
            if (b.title) keys.push(`title:${b.title}`);
            return !keys.some(k => existingKeys.has(k));
        });

        if (newBooks.length === 0) {
            showToast('没有新书可导入（全部重复）', 'info');
            return;
        }

        const result = await batchAddBooks(newBooks);
        showToast(`成功导入 ${result.added} 本书${result.errors.length > 0 ? `，${result.errors.length} 本失败` : ''}`, 'success');
        await refreshBookList();
    } catch (err) {
        modal.remove();
        showToast(`导入失败: ${err.message}`, 'error');
    }
}

async function showExportModal() {
    const books = await getAllBooks();
    if (books.length === 0) {
        showToast('没有图书可导出', 'info');
        return;
    }
    exportToCSV(books);
    showToast(`已导出 ${books.length} 本书`, 'success');
}

function showEditModal(book) {
    const content = `
        <div class="form-group">
            <label>书号类型</label>
            <select id="edit-identifier-kind">
                <option value="ISBN" ${book.identifierKind === 'ISBN' ? 'selected' : ''}>ISBN</option>
                <option value="统一书号" ${book.identifierKind === '统一书号' ? 'selected' : ''}>统一书号</option>
                <option value="自定义书号" ${book.identifierKind === '自定义书号' ? 'selected' : ''}>自定义书号</option>
            </select>
        </div>
        <div class="form-group" id="edit-isbn-group">
            <label>ISBN</label>
            <input type="text" id="edit-isbn" value="${book.isbn || ''}">
        </div>
        <div class="form-group hidden" id="edit-unified-group">
            <label>统一书号</label>
            <input type="text" id="edit-unified" value="${book.unifiedNumber || ''}">
        </div>
        <div class="form-group hidden" id="edit-custom-group">
            <label>自定义书号</label>
            <input type="text" id="edit-custom" value="${book.customNumber || ''}">
        </div>
        <div class="form-group">
            <label>书名 *</label>
            <input type="text" id="edit-title" value="${book.title || ''}">
        </div>
        <div class="form-group">
            <label>原名</label>
            <input type="text" id="edit-original-title" value="${book.originalTitle || ''}">
        </div>
        <div class="form-group">
            <label>丛书名</label>
            <input type="text" id="edit-series" value="${book.seriesTitle || ''}">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>作者</label>
                <input type="text" id="edit-authors" value="${book.authors || ''}">
            </div>
            <div class="form-group">
                <label>作者国籍</label>
                <input type="text" id="edit-nationality" value="${book.authorNationality || ''}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>出版时间</label>
                <input type="text" id="edit-pub-date" value="${book.publicationDate || ''}">
            </div>
            <div class="form-group">
                <label>出版社</label>
                <input type="text" id="edit-publisher" value="${book.publisher || ''}">
            </div>
        </div>
        <div class="form-group">
            <label>封面链接</label>
            <input type="text" id="edit-cover-url" value="${book.coverUrl || ''}">
        </div>
        <div class="form-group">
            <label>录入方式</label>
            <input type="text" id="edit-source" value="${book.entrySource || ''}">
        </div>
    `;

    const footer = `
        <button class="btn btn-danger" id="delete-book-btn">删除</button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" id="save-edit-btn">保存</button>
    `;

    const modal = createModal('编辑图书', content, footer);

    // 书号类型切换
    const kindSelect = document.getElementById('edit-identifier-kind');
    const isbnGroup = document.getElementById('edit-isbn-group');
    const unifiedGroup = document.getElementById('edit-unified-group');
    const customGroup = document.getElementById('edit-custom-group');

    function toggleIdentifierFields() {
        const kind = kindSelect.value;
        isbnGroup.classList.toggle('hidden', kind !== 'ISBN');
        unifiedGroup.classList.toggle('hidden', kind !== '统一书号');
        customGroup.classList.toggle('hidden', kind !== '自定义书号');
    }
    kindSelect.onchange = toggleIdentifierFields;
    toggleIdentifierFields();

    document.getElementById('save-edit-btn').onclick = async () => {
        const updates = {
            identifierKind: kindSelect.value,
            isbn: normalizeISBN(document.getElementById('edit-isbn').value),
            unifiedNumber: document.getElementById('edit-unified').value,
            customNumber: document.getElementById('edit-custom').value,
            title: document.getElementById('edit-title').value,
            originalTitle: document.getElementById('edit-original-title').value,
            seriesTitle: document.getElementById('edit-series').value,
            authors: document.getElementById('edit-authors').value,
            authorNationality: document.getElementById('edit-nationality').value,
            publicationDate: document.getElementById('edit-pub-date').value,
            publisher: document.getElementById('edit-publisher').value,
            coverUrl: document.getElementById('edit-cover-url').value,
            entrySource: document.getElementById('edit-source').value
        };

        const errors = validateBook(updates);
        if (errors.length > 0) {
            showToast(errors[0], 'error');
            return;
        }

        try {
            await updateBook(book.id, updates);
            modal.remove();
            showToast('已保存', 'success');
            await refreshBookList();
        } catch (err) {
            showToast(`保存失败: ${err.message}`, 'error');
        }
    };

    document.getElementById('delete-book-btn').onclick = async () => {
        if (confirm(`确定要删除《${book.title}》吗？`)) {
            await deleteBook(book.id);
            modal.remove();
            showToast('已删除', 'success');
            await refreshBookList();
        }
    };
}

function showStatusPopup(book, type) {
    const content = document.createElement('div');
    content.className = 'status-popup-content';

    if (type === 'ownership') {
        const options = ['已买', '未买'];
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.style.cssText = 'display:block;width:100%;margin-bottom:8px;';
            btn.textContent = opt;
            btn.onclick = async () => {
                const updates = { ownershipStatus: opt };
                if (opt === '已买') {
                    updates.ownedReadingStatus = '未读';
                    updates.wishlistReadingStatus = '';
                } else {
                    updates.ownedReadingStatus = '';
                    updates.wishlistReadingStatus = '想读';
                }
                await updateBook(book.id, updates);
                modal.remove();
                showToast(`已更新为${opt}`, 'success');
                await refreshBookList();
            };
            content.appendChild(btn);
        });
    } else if (type === 'reading') {
        if (book.ownershipStatus === '已买') {
            const options = ['已读', '未读'];
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary';
                btn.style.cssText = 'display:block;width:100%;margin-bottom:8px;';
                btn.textContent = opt;
                btn.onclick = async () => {
                    await updateBook(book.id, { ownedReadingStatus: opt });
                    modal.remove();
                    showToast(`已更新为${opt}`, 'success');
                    await refreshBookList();
                };
                content.appendChild(btn);
            });
        } else {
            const options = ['已读', '想读', '待定'];
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary';
                btn.style.cssText = 'display:block;width:100%;margin-bottom:8px;';
                btn.textContent = opt;
                btn.onclick = async () => {
                    const updates = { wishlistReadingStatus: opt };
                    if (opt === '待定') {
                        updates.pendingSince = new Date().toISOString();
                    } else {
                        updates.pendingSince = null;
                    }
                    await updateBook(book.id, updates);
                    modal.remove();
                    showToast(`已更新为${opt}`, 'success');
                    await refreshBookList();
                };
                content.appendChild(btn);
            });
        }
    }

    const modal = createModal(
        type === 'ownership' ? '修改收藏状态' : '修改阅读状态',
        content.outerHTML
    );
}
