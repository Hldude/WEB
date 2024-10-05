<template>
  <div class="app-container">
    <div class="sidebar">
      <h1>Список книг</h1>
      <ul>
        <li v-for="book in books" :key="book.file" @click="selectBook(book)">
          {{ book.title }}
        </li>
      </ul>
    </div>

    <div class="book-container" v-if="selectedBook">
      <h2>{{ selectedBook.title }}</h2>
      <input v-model="searchTerm" placeholder="Введите слово" />
      <button @click="searchBook">Поиск</button>

      <div v-if="pages.length">
        <div class="page-controls">
          <button @click="prevPage" :disabled="currentPage === 0">
            Предыдущая
          </button>
          <span>Страница {{ currentPage + 1 }} из {{ pages.length }}</span>
          <button
            @click="nextPage"
            :disabled="currentPage === pages.length - 1"
          >
            Следующая
          </button>
        </div>

        <div class="book-content">
          <p v-html="highlightedPage"></p>
        </div>
      </div>

      <div v-if="searchResults.length">
        <h3>Результаты поиска</h3>
        <ul>
          <li
            v-for="result in searchResults"
            :key="result.page"
            @click="goToPage(result.page - 1)"
            class="search-result"
          >
            Страница {{ result.page }}:
            <span v-html="highlightSearchResult(result.context)"></span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      books: [],
      selectedBook: null,
      pages: [],
      currentPage: 0,
      searchTerm: "",
      searchResults: [],
    };
  },
  computed: {
    highlightedPage() {
      if (this.searchTerm && this.pages[this.currentPage]) {
        const regex = new RegExp(
          `(${this.escapeRegExp(this.searchTerm)})`,
          "gi"
        );
        return this.pages[this.currentPage].replace(regex, "<mark>$1</mark>");
      }
      return this.pages[this.currentPage] || "";
    },
  },
  methods: {
    async fetchBooks() {
      try {
        const response = await axios.get(
          `http://localhost:3000/books`,
          {
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          }
        );
        console.log(response.data);
        this.books = response.data;
      } catch (error) {
        console.error("Ошибка при получении списка книг:", error);
        alert("Не удалось загрузить список книг. Попробуйте позже.");
      }
    },
    async selectBook(book) {
      try {
        const response = await axios.get(
          `http://localhost:3000/books/${encodeURIComponent(
            book.file
          )}`,
          {
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          }
        );

        this.selectedBook = {
          ...response.data,
          file: book.file,
        };
        this.pages = this.selectedBook.pages;
        this.currentPage = 0;
        this.searchResults = [];
      } catch (error) {
        console.error("Ошибка при загрузке книги:", error);
        alert("Не удалось загрузить книгу. Попробуйте позже.");
      }
    },
    async searchBook() {
      if (!this.selectedBook) return;
      try {
        const response = await axios.post(
          `http://localhost:3000/books/${encodeURIComponent(
            this.selectedBook.file
          )}/search`,
          {
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
            word: this.searchTerm,
          }
        );
        this.searchResults = response.data.results.map((result) => ({
          ...result,
          context: result.context
            ? this.getExtendedContext(result.context, result.page - 1)
            : "Контекст недоступен",
        }));
      } catch (error) {
        console.error("Ошибка при поиске в книге:", error);
        alert("Не удалось выполнить поиск. Попробуйте позже.");
      }
    },
    getExtendedContext(context, pageIndex) {
      // Проверяем, что контекст и содержимое страницы существуют и являются строками
      if (!context || typeof context !== "string") {
        return "Контекст недоступен"; // Возвращаем значение по умолчанию, если контекст недоступен
      }

      const fullPageContent = this.pages[pageIndex];

      // Проверяем, что контент страницы существует и является строкой
      if (!fullPageContent || typeof fullPageContent !== "string") {
        return "Содержимое страницы недоступно"; // Возвращаем значение по умолчанию, если содержимое страницы недоступно
      }

      // Ищем контекст на странице
      const contextIndex = fullPageContent.indexOf(context);
      if (contextIndex === -1) return context;

      const startIndex = Math.max(0, contextIndex - 100);
      const endIndex = Math.min(
        fullPageContent.length,
        contextIndex + context.length + 100
      );

      let extendedContext = fullPageContent.slice(startIndex, endIndex);

      // Обрезаем контекст по целым словам
      if (startIndex > 0) {
        extendedContext = extendedContext.slice(
          extendedContext.indexOf(" ") + 1
        );
      }
      if (endIndex < fullPageContent.length) {
        extendedContext = extendedContext.slice(
          0,
          extendedContext.lastIndexOf(" ")
        );
      }

      return extendedContext;
    },
    nextPage() {
      if (this.currentPage < this.pages.length - 1) {
        this.currentPage++;
      }
    },
    prevPage() {
      if (this.currentPage > 0) {
        this.currentPage--;
      }
    },
    goToPage(pageIndex) {
      if (pageIndex >= 0 && pageIndex < this.pages.length) {
        this.currentPage = pageIndex;
      }
    },
    highlightSearchResult(text) {
      const regex = new RegExp(`(${this.escapeRegExp(this.searchTerm)})`, "gi");
      return text.replace(regex, "<mark>$1</mark>");
    },
    escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },
  },
  mounted() {
    this.fetchBooks();
  },
};
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  font-family: "Arial", sans-serif;
}

.sidebar {
  width: 20%;
  background-color: #f5f5f5;
  padding: 20px;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.sidebar h1 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar ul li {
  padding: 10px;
  margin-bottom: 10px;
  background-color: #fff;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.sidebar ul li:hover {
  background-color: #e0e0e0;
}

.book-container {
  width: 80%;
  padding: 40px;
  overflow-y: auto;
}

.book-container h2 {
  font-size: 28px;
  margin-bottom: 20px;
}

.book-container input {
  padding: 10px;
  margin-right: 10px;
  font-size: 16px;
}

.book-container button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.book-container button:hover {
  background-color: #0056b3;
}

.page-controls {
  margin: 20px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-controls button {
  padding: 10px 15px;
  font-size: 14px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.page-controls button[disabled] {
  background-color: #cccccc;
  cursor: not-allowed;
}

.page-controls span {
  font-size: 16px;
  color: #333;
}

/* Контент книги */
.book-content {
  background-color: #fff;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-size: 18px;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* Выделение найденных слов */
mark {
  background-color: yellow;
  font-weight: bold;
}

/* Стили для результатов поиска */
.book-container h3 {
  margin-top: 20px;
  font-size: 20px;
}

.book-container ul {
  list-style: none;
  padding: 0;
}

.book-container ul li {
  margin-bottom: 10px;
  font-size: 16px;
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
}
</style>
