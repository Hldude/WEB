const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const app = express();
app.use(cors({
  origin: '*', 
  methods: 'GET,POST', 
}));

app.use(bodyParser.json());

const booksDirectory = path.join(__dirname, 'books');
const parser = new xml2js.Parser();



const extractTextFromSections = (sections) => {
  let text = '';

  sections.forEach(section => {
    if (section.p) {
      text += section.p.join(' ') + ' ';
    }

    
    if (section.section) {
      text += extractTextFromSections(section.section);
    }
  });

  return text;
};


const paginateBookByWords = (paragraphs, maxPageLength) => {
    let pages = [];
    let currentPage = '';
    let currentLength = 0;

    paragraphs.forEach(paragraph => {
        const sentences = paragraph.split(/(?<=[.!?])\s+/);  // Разделяем абзац на предложения

        sentences.forEach(sentence => {
            
            if (currentLength + sentence.length > maxPageLength) {
                // Добавляем текущую страницу в массив и начинаем новую
                if (currentPage.trim()) {
                    pages.push(currentPage.trim());
                }
                currentPage = sentence;
                currentLength = sentence.length;
            } else {
                // Добавляем предложение на текущую страницу
                currentPage += sentence + ' ';
                currentLength += sentence.length + 1;
            }
        });

        
        currentPage += '\n\n';
        currentLength += 2;
    });

    
    if (currentPage.trim()) {
        pages.push(currentPage.trim());
    }

    return pages;
};

app.get('/books', (req, res) => {
    fs.readdir(booksDirectory, (err, files) => {
      if (err) {
        return res.status(500).json({ message: 'Не получилось прочитать директорию' });
      }
  
      const bookPromises = files
        .filter(file => file.endsWith('.fb2'))
        .map(file => {
          return new Promise((resolve, reject) => {
            const filePath = path.join(booksDirectory, file);
                     fs.readFile(filePath, 'utf-8', (err, data) => {
              if (err) {
                reject(err);
                return;
              }
              parser.parseString(data, (err, result) => {
                if (err) {
                  reject(err);
                  return;
                }
                const bookTitle = result?.FictionBook?.description?.[0]?.['title-info']?.[0]?.['book-title']?.[0] || path.basename(file, '.fb2');
                resolve({ file, title: bookTitle });
              });
            });
          });
        });
  
      Promise.all(bookPromises)
        .then(books => {
          const bookList = books.map((book, index) => ({
            id: index + 1,
            title: book.title,
            file: book.file
          }));
          res.json(bookList);
        })
        .catch(error => {
          console.error('Ошибка при обработке списка книг:', error);
          res.status(500).json({ message: 'Ошибка при обработке списка книг' });
        });
    });
  });

// Получение содержимого книги
app.get('/books/:filename', (req, res) => {
    const filePath = path.join(booksDirectory, req.params.filename);
  
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        return res.status(404).json({ message: 'Книга не найдена' });
      }
  
      parser.parseString(data, (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Не получилось проверить книгу' });
        }
  
        
        const bookTitle = result?.FictionBook?.description?.[0]?.['title-info']?.[0]?.['book-title']?.[0] || 'Без названия';
  
        
        const sections = result?.FictionBook?.body?.[0]?.section || [];
        const bookBody = extractTextFromSections(sections);
  
        
        const paragraphs = bookBody.split('\n').filter(Boolean); 
  
        const pages = paginateBookByWords(paragraphs, 2000);
  
        res.json({ title: bookTitle, pages });
      });
    });
  });

// API маршрут для поиска слова в книге
app.post('/books/:filename/search', (req, res) => {
    const filePath = path.join(booksDirectory, req.params.filename);
    const { word } = req.body;
  
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        return res.status(404).json({ message: 'Книга не найдена' });
      }
  
      parser.parseString(data, (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Не получилось прочитать FB2 файл' });
        }
  
        const sections = result.FictionBook.body[0].section;
        const bookBody = extractTextFromSections(sections);
        const pages = paginateBookByWords(bookBody.split('\n').filter(Boolean), 1000);
  
        
        const results = [];
        pages.forEach((page, pageIndex) => {
          const regex = new RegExp(`(.{0,20})(${word})(.{0,20})`, 'gi');
          let match;
          while ((match = regex.exec(page)) !== null) {
            results.push({
              page: pageIndex + 1,  
              context: `${match[1]}${match[2]}${match[3]}`,
            });
          }
        });
  
        res.json({ results });
      });
    });
  });

const port = 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
}); 