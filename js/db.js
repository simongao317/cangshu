/* ========== IndexedDB 数据库封装 ========== */

const DB_NAME = 'CangShuDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) { resolve(db); return; }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const dbRef = e.target.result;
            if (!dbRef.objectStoreNames.contains(STORE_NAME)) {
                const store = dbRef.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('isbn', 'isbn', { unique: false });
                store.createIndex('unifiedNumber', 'unifiedNumber', { unique: false });
                store.createIndex('customNumber', 'customNumber', { unique: false });
                store.createIndex('doubanSubjectID', 'doubanSubjectID', { unique: false });
                store.createIndex('ownershipStatus', 'ownershipStatus', { unique: false });
                store.createIndex('identifierKind', 'identifierKind', { unique: false });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });
}

function getStore(mode = 'readonly') {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
}

function getAllBooks() {
    return new Promise((resolve, reject) => {
        const store = getStore();
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function getBookById(id) {
    return new Promise((resolve, reject) => {
        const store = getStore();
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function addBook(book) {
    return new Promise((resolve, reject) => {
        const store = getStore('readwrite');
        const now = new Date().toISOString();
        const record = {
            ...book,
            createdAt: book.createdAt || now,
            categoryDate: book.categoryDate || now,
            pendingSince: book.pendingSince || null
        };
        const request = store.add(record);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function updateBook(id, updates) {
    return new Promise((resolve, reject) => {
        const store = getStore('readwrite');
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const book = getReq.result;
            if (!book) { reject(new Error('Book not found')); return; }
            Object.assign(book, updates);
            const putReq = store.put(book);
            putReq.onsuccess = () => resolve(book);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

function deleteBook(id) {
    return new Promise((resolve, reject) => {
        const store = getStore('readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function searchBooks(query) {
    return new Promise(async (resolve) => {
        const all = await getAllBooks();
        if (!query) { resolve(all); return; }
        const q = query.toLowerCase();
        const results = all.filter(b =>
            (b.title && b.title.toLowerCase().includes(q)) ||
            (b.authors && b.authors.toLowerCase().includes(q)) ||
            (b.isbn && b.isbn.includes(query)) ||
            (b.publisher && b.publisher.toLowerCase().includes(q)) ||
            (b.seriesTitle && b.seriesTitle.toLowerCase().includes(q))
        );
        resolve(results);
    });
}

function batchAddBooks(books) {
    return new Promise((resolve, reject) => {
        const store = getStore('readwrite');
        const now = new Date().toISOString();
        let completed = 0;
        let errors = [];

        books.forEach(book => {
            const record = {
                ...book,
                createdAt: book.createdAt || now,
                categoryDate: book.categoryDate || now,
                pendingSince: book.pendingSince || null
            };
            const request = store.add(record);
            request.onsuccess = () => {
                completed++;
                if (completed === books.length) resolve({ added: completed, errors });
            };
            request.onerror = () => {
                errors.push({ book: book.title, error: request.error?.message });
                completed++;
                if (completed === books.length) resolve({ added: completed - errors.length, errors });
            };
        });
    });
}

function getBookByIdentifier(identifierKind, value) {
    return new Promise(async (resolve) => {
        const all = await getAllBooks();
        let found = null;
        switch (identifierKind) {
            case 'ISBN':
                found = all.find(b => b.isbn === value);
                break;
            case '统一书号':
                found = all.find(b => b.unifiedNumber === value);
                break;
            case '自定义书号':
                found = all.find(b => b.customNumber === value);
                break;
        }
        resolve(found);
    });
}
