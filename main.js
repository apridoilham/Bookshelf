let isEditing = false;
let editingBookId = null;

// Mengatur opsi global untuk Notie.js agar sesuai tema
notie.setOptions({
    alertTime: 3, // Waktu notifikasi muncul dalam detik
    confirmText: 'Yes',
    cancelText: 'No',
    colorSuccess: '#a7f3d0',
    colorWarning: '#c4b5fd',
    colorError: '#fca5a5',
    colorInfo: '#93c5fd',
    colorNeutral: '#a0aec0',
    colorText: '#1a202c',
    backgroundSuccess: 'var(--glass-bg)',
});

// Fungsi untuk mengecek ketersediaan localStorage
function isLocalStorageAvailable() {
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
    } catch (e) {
        notie.alert({ type: 'error', text: 'localStorage is not available. Your data will not be saved.' });
        return false;
    }
}

// Memuat buku dari localStorage atau menginisialisasi array kosong
let books = [];
if (isLocalStorageAvailable()) {
    try {
        const storedBooks = localStorage.getItem('books');
        books = storedBooks ? JSON.parse(storedBooks) : [];
    } catch (error) {
        console.error("Failed to parse data from localStorage:", error);
        books = [];
    }
} else {
    books = [];
}

// Menyimpan data buku ke localStorage
function saveBooks() {
    if (isLocalStorageAvailable()) {
        localStorage.setItem('books', JSON.stringify(books));
    }
}

// Validasi input form
function validateBookInput(title, author, year) {
    if (!title || !author || !year) {
        notie.alert({ type: 'warning', text: 'All fields must be filled!' });
        return false;
    }
    if (title.length > 100 || author.length > 100) {
        notie.alert({ type: 'warning', text: 'Title and author must not exceed 100 characters.' });
        return false;
    }
    const yearNum = Number(year);
    const currentYear = new Date().getFullYear();
    if (isNaN(yearNum) || yearNum < 1 || yearNum > currentYear) {
        notie.alert({ type: 'warning', text: `Year must be a number between 1 and ${currentYear}.` });
        return false;
    }
    return true;
}

// Pindah status buku (selesai/belum selesai)
function toggleIsComplete(id) {
    const bookIndex = books.findIndex((b) => b.id === id);
    if (bookIndex !== -1) {
        const book = books[bookIndex];
        const wasComplete = book.isComplete;
        book.isComplete = !book.isComplete;
        book.finishedAt = book.isComplete ? new Date().toISOString() : null;
        
        saveBooks();
        renderBooks();

        notie.alert({
            type: 'success',
            text: `The book has been moved to the ${wasComplete ? 'Unfinished' : 'Finished'} shelf.`
        });
    }
}

// Hapus buku dengan konfirmasi
function deleteBook(id) {
    notie.confirm({
        text: 'Are you sure you want to delete this book?',
        submitText: 'Yes, delete it!',
        cancelText: 'Cancel',
        submitCallback: () => {
            const bookIndex = books.findIndex((b) => b.id === id);
            if (bookIndex > -1) {
                books.splice(bookIndex, 1);
                saveBooks();
                renderBooks();
                notie.alert({ type: 'success', text: 'The book has been successfully deleted.' });
            }
        }
    });
}

// Render semua buku ke DOM
function renderBooks(booksToRender = books) {
    const incompleteBookList = document.getElementById('incompleteBookList');
    const completeBookList = document.getElementById('completeBookList');
    const incompleteCountEl = document.getElementById('incompleteCount');
    const completeCountEl = document.getElementById('completeCount');

    incompleteBookList.innerHTML = '';
    completeBookList.innerHTML = '';
    let incompleteCount = 0;
    let completeCount = 0;

    const createEmptyMessage = (message) => `<p class="empty-message">${message}</p>`;
    const searchInput = document.getElementById('searchBookTitle').value.trim();
    if (booksToRender.length === 0) {
        const message = searchInput ? "No books found matching your search." : "There are no books on this shelf.";
        incompleteBookList.innerHTML = createEmptyMessage(message);
        completeBookList.innerHTML = createEmptyMessage(message);
    } else {
        booksToRender.forEach((book) => {
            const bookElement = createBookElement(book);
            if (book.isComplete) {
                completeBookList.appendChild(bookElement);
                completeCount++;
            } else {
                incompleteBookList.appendChild(bookElement);
                incompleteCount++;
            }
        });
        if (incompleteCount === 0) incompleteBookList.innerHTML = createEmptyMessage("There are no books on this shelf.");
        if (completeCount === 0) completeBookList.innerHTML = createEmptyMessage("There are no books on this shelf.");
    }

    incompleteCountEl.innerText = `${incompleteCount} books`;
    completeCountEl.innerText = `${completeCount} books`;
}

// Membuat elemen HTML untuk satu buku
function createBookElement(book) {
    const bookItem = document.createElement('article');
    bookItem.className = 'book-item';
    bookItem.setAttribute('data-bookid', book.id);

    bookItem.innerHTML = `
        <h3 class="book-item-title">${book.title}</h3>
        <p class="book-item-author">by ${book.author}</p>
        <p class="book-item-year">Year: ${book.year}</p>
        ${book.isComplete && book.finishedAt ? `<p class="finished-at">Finished: ${new Date(book.finishedAt).toLocaleDateString()}</p>` : ''}
        <div class="button-group">
            <button class="button-move">${book.isComplete ? 'Move to Unfinished' : 'Mark as Finished'}</button>
            <button class="button-edit">Edit</button>
            <button class="button-delete">Delete</button>
        </div>
    `;

    bookItem.querySelector('.button-move').addEventListener('click', () => toggleIsComplete(book.id));
    bookItem.querySelector('.button-edit').addEventListener('click', () => startEditBook(book.id));
    bookItem.querySelector('.button-delete').addEventListener('click', () => deleteBook(book.id));

    return bookItem;
}

// Memulai mode edit buku
function startEditBook(id) {
    const book = books.find((b) => b.id === id);
    if (!book) return;

    isEditing = true;
    editingBookId = id;

    document.getElementById('bookFormTitle').value = book.title;
    document.getElementById('bookFormAuthor').value = book.author;
    document.getElementById('bookFormYear').value = book.year;
    document.getElementById('bookFormIsComplete').checked = book.isComplete;
    document.getElementById('form-section-title').textContent = 'Edit Book';

    const submitButton = document.getElementById('bookFormSubmit');
    submitButton.textContent = 'Update Book';
    
    const actionsContainer = document.getElementById('bookFormActions');
    if (!document.getElementById('cancelEditButton')) {
        const cancelButton = document.createElement('button');
        cancelButton.id = 'cancelEditButton';
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'button-secondary';
        cancelButton.addEventListener('click', cancelEdit);
        actionsContainer.appendChild(cancelButton);
    }
    
    document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
}

// Batal mode edit
function cancelEdit() {
    isEditing = false;
    editingBookId = null;

    document.getElementById('bookForm').reset();
    document.getElementById('form-section-title').textContent = 'Add New Book';
    document.getElementById('bookFormSubmit').textContent = 'Add to Shelf';
    
    const cancelButton = document.getElementById('cancelEditButton');
    if (cancelButton) {
        cancelButton.remove();
    }
}

// Event listener untuk form submit (tambah/edit buku)
document.getElementById('bookForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const title = document.getElementById('bookFormTitle').value.trim();
    const author = document.getElementById('bookFormAuthor').value.trim();
    const year = document.getElementById('bookFormYear').value;
    const isComplete = document.getElementById('bookFormIsComplete').checked;

    if (!validateBookInput(title, author, year)) return;

    if (isEditing) {
        const bookIndex = books.findIndex((b) => b.id === editingBookId);
        if (bookIndex !== -1) {
            const oldBook = books[bookIndex];
            const newFinishedAt = isComplete ? (oldBook.isComplete ? oldBook.finishedAt : new Date().toISOString()) : null;
            
            books[bookIndex] = { ...oldBook, title, author, year: Number(year), isComplete, finishedAt: newFinishedAt };
            
            saveBooks();
            document.getElementById('searchBookTitle').value = ''; 
            renderBooks(books);
            cancelEdit();
            
            notie.alert({ type: 'success', text: 'Book data has been successfully updated.' });
        } else {
            cancelEdit();
        }
    } else {
        const newBook = {
            id: crypto.randomUUID(),
            title,
            author,
            year: Number(year),
            isComplete,
            finishedAt: isComplete ? new Date().toISOString() : null,
        };
        books.push(newBook);
        
        saveBooks();
        renderBooks();
        this.reset();

        notie.alert({ type: 'success', text: 'A new book has been added to the shelf.' });
    }
});

// Fungsi pencarian buku
function searchBooks(query) {
    const lowercaseQuery = query.toLowerCase().trim();
    const filteredBooks = books.filter((book) =>
        book.title.toLowerCase().includes(lowercaseQuery) ||
        book.author.toLowerCase().includes(lowercaseQuery)
    );
    renderBooks(filteredBooks);
}

// Event listener untuk form pencarian
document.getElementById('searchBook').addEventListener('submit', (e) => e.preventDefault());
document.getElementById('searchBookTitle').addEventListener('input', (e) => searchBooks(e.target.value));

// Inisialisasi saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    const currentYear = new Date().getFullYear();
    document.getElementById('bookFormYear').max = currentYear;
    document.getElementById('copyright-year').textContent = currentYear;
    
    renderBooks();
    document.getElementById('bookForm').reset();
});