/* ========== ISBN 查询模块 ========== */

const ISBN_SOURCES = [
    {
        name: 'Open Library',
        fetch: async (isbn) => {
            const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
            const resp = await fetch(url);
            const data = await resp.json();
            const bookData = data[`ISBN:${isbn}`];
            if (!bookData) throw new Error('未找到');
            return {
                sourceName: 'Open Library',
                identifierKind: 'ISBN',
                isbn: isbn,
                title: bookData.title || '',
                authors: bookData.authors ? bookData.authors.map(a => a.name).join(', ') : '',
                publicationDate: bookData.publish_date || '',
                publisher: bookData.publishers ? bookData.publishers.map(p => p.name).join(', ') : '',
                coverUrl: bookData.cover ? bookData.cover.large || bookData.cover.medium : '',
                sourceUrl: bookData.url || `https://openlibrary.org/isbn/${isbn}`
            };
        }
    },
    {
        name: 'Google Books',
        fetch: async (isbn) => {
            const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (!data.items || data.items.length === 0) throw new Error('未找到');
            const info = data.items[0].volumeInfo;
            return {
                sourceName: 'Google Books',
                identifierKind: 'ISBN',
                isbn: isbn,
                title: info.title || '',
                authors: info.authors ? info.authors.join(', ') : '',
                publicationDate: info.publishedDate || '',
                publisher: info.publisher || '',
                coverUrl: info.imageLinks ? info.imageLinks.thumbnail || '' : '',
                sourceUrl: info.infoLink || ''
            };
        }
    }
];

async function lookupISBN(isbn) {
    const cleanISBN = normalizeISBN(isbn);
    if (!cleanISBN) throw new Error('无效的ISBN');

    const candidates = [];
    const errors = [];

    for (const source of ISBN_SOURCES) {
        try {
            const result = await source.fetch(cleanISBN);
            candidates.push(result);
        } catch (err) {
            errors.push({ sourceName: source.name, error: err.message });
        }
    }

    // 始终添加兜底候选
    if (candidates.length === 0 && errors.length === ISBN_SOURCES.length) {
        candidates.push({
            sourceName: '仅保存ISBN',
            identifierKind: 'ISBN',
            isbn: cleanISBN,
            title: `ISBN: ${cleanISBN}`,
            authors: '',
            publicationDate: '',
            publisher: '',
            coverUrl: '',
            sourceUrl: ''
        });
    }

    return { candidates, errors };
}
