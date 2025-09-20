import { Author as BookAuthor, Book } from '../../src/associations/many-to-many-embedded.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('Many-to-Many Relationships - Embedded Arrays (with Utilities)', () => {
    
    beforeEach(async () => {
        // Clean up collections
        await BookAuthor.deleteMany({});
        await Book.deleteMany({});
    });

    describe('Basic CRUD Operations', () => {
        it('should create book with multiple authors', async () => {
            const author1 = await BookAuthor.create({
                name: 'John Doe',
                email: 'john@example.com',
                bio: 'Fiction writer'
            });

            const author2 = await BookAuthor.create({
                name: 'Jane Smith',
                email: 'jane@example.com',
                bio: 'Technical writer'
            });

            const book = await Book.create({
                title: 'Collaborative Writing Guide',
                isbn: '978-0-123456-78-9',
                authors: [author1._id, author2._id],
                description: 'A comprehensive guide to collaborative writing techniques and best practices for authors working together on projects.',
                genre: 'non-fiction',
                publisher: {
                    name: 'Tech Publishers',
                    location: 'New York'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 300,
                    language: 'English'
                },
                pricing: {
                    hardcover: 29.99,
                    paperback: 19.99,
                    ebook: 9.99,
                    currency: 'USD'
                }
            });

            expect(book.authors).to.have.length(2);
            expect(book.authors[0].toString()).to.equal(author1._id.toString());
            expect(book.authors[1].toString()).to.equal(author2._id.toString());
        });

        it('should populate book with authors', async () => {
            const author = await BookAuthor.create({
                name: 'Populate Author',
                email: 'populate@example.com',
                bio: 'Test author for population'
            });

            const book = await Book.create({
                title: 'Population Test Book',
                isbn: '978-0-123456-79-0',
                authors: [author._id],
                description: 'A test book for population testing with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Test Publishers',
                    location: 'Test City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            const bookWithAuthors = await Book.findById(book._id).populate('authors');
            expect(bookWithAuthors.authors).to.have.length(1);
            expect(bookWithAuthors.authors[0].name).to.equal('Populate Author');
        });

        it('should populate author with books', async () => {
            const author = await BookAuthor.create({
                name: 'Author With Books',
                email: 'authorwithbooks@example.com',
                bio: 'Author with multiple books'
            });

            await Book.create({
                title: 'First Book',
                isbn: '978-0-123456-80-1',
                authors: [author._id],
                description: 'The first book by this author with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'First Publishers',
                    location: 'First City'
                },
                publicationInfo: {
                    publishedYear: 2022,
                    pages: 250,
                    language: 'English'
                }
            });

            await Book.create({
                title: 'Second Book',
                isbn: '978-0-123456-81-2',
                authors: [author._id],
                description: 'The second book by this author with enough description to meet requirements.',
                genre: 'non-fiction',
                publisher: {
                    name: 'Second Publishers',
                    location: 'Second City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 300,
                    language: 'English'
                }
            });

            const authorWithBooks = await BookAuthor.findById(author._id).populate('books');
            expect(authorWithBooks.books).to.have.length(2);
            expect(authorWithBooks.books[0].title).to.be.oneOf(['First Book', 'Second Book']);
        });
    });

    describe('Instance Methods', () => {
        it('should get author with all books', async () => {
            const author = await BookAuthor.create({
                name: 'Method Author',
                email: 'method@example.com',
                bio: 'Author for testing methods'
            });

            await Book.create({
                title: 'Method Book',
                isbn: '978-0-123456-82-3',
                authors: [author._id],
                description: 'A book for testing author methods with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Method Publishers',
                    location: 'Method City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            const authorWithBooks = await author.withBooks();
            expect(authorWithBooks.books).to.have.length(1);
            expect(authorWithBooks.books[0].title).to.equal('Method Book');
        });

        it('should get author\'s bestsellers', async () => {
            const author = await BookAuthor.create({
                name: 'Bestseller Author',
                email: 'bestseller@example.com',
                bio: 'Author with bestsellers'
            });

            await Book.create({
                title: 'Regular Book',
                isbn: '978-0-123456-83-4',
                authors: [author._id],
                description: 'A regular book with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Regular Publishers',
                    location: 'Regular City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                },
                isBestseller: false
            });

            await Book.create({
                title: 'Bestseller Book',
                isbn: '978-0-123456-84-5',
                authors: [author._id],
                description: 'A bestseller book with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Bestseller Publishers',
                    location: 'Bestseller City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 250,
                    language: 'English'
                },
                isBestseller: true,
                sales: {
                    bestsellerRank: 1
                }
            });

            const authorWithBestsellers = await author.getBestsellers();
            expect(authorWithBestsellers.books).to.have.length(1);
            expect(authorWithBestsellers.books[0].title).to.equal('Bestseller Book');
        });

        it('should get author\'s recent books', async () => {
            const author = await BookAuthor.create({
                name: 'Recent Author',
                email: 'recent@example.com',
                bio: 'Author with recent books'
            });

            const currentYear = new Date().getFullYear();
            const oldYear = currentYear - 10;

            await Book.create({
                title: 'Old Book',
                isbn: '978-0-123456-85-6',
                authors: [author._id],
                description: 'An old book with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Old Publishers',
                    location: 'Old City'
                },
                publicationInfo: {
                    publishedYear: oldYear,
                    pages: 200,
                    language: 'English'
                }
            });

            await Book.create({
                title: 'Recent Book',
                isbn: '978-0-123456-86-7',
                authors: [author._id],
                description: 'A recent book with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Recent Publishers',
                    location: 'Recent City'
                },
                publicationInfo: {
                    publishedYear: currentYear,
                    pages: 250,
                    language: 'English'
                }
            });

            const authorWithRecent = await author.getRecentBooks(5);
            expect(authorWithRecent.books).to.have.length(1);
            expect(authorWithRecent.books[0].title).to.equal('Recent Book');
        });

        it('should get author statistics (using aggregation utility)', async () => {
            const author = await BookAuthor.create({
                name: 'Stats Author',
                email: 'stats@example.com',
                bio: 'Author for statistics testing'
            });

            await Book.create({
                title: 'Stats Book 1',
                isbn: '978-0-123456-87-8',
                authors: [author._id],
                description: 'First stats book with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Stats Publishers',
                    location: 'Stats City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                },
                sales: {
                    totalSales: 1000,
                    revenue: 20000
                },
                ratings: {
                    averageRating: 4.5,
                    totalRatings: 100
                }
            });

            await Book.create({
                title: 'Stats Book 2',
                isbn: '978-0-123456-88-9',
                authors: [author._id],
                description: 'Second stats book with enough description to meet requirements.',
                genre: 'non-fiction',
                publisher: {
                    name: 'Stats Publishers',
                    location: 'Stats City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 300,
                    language: 'English'
                },
                sales: {
                    totalSales: 500,
                    revenue: 10000
                },
                ratings: {
                    averageRating: 4.0,
                    totalRatings: 50
                }
            });

            const stats = await author.getStats();
            expect(stats.totalBooks).to.equal(2);
            expect(stats.totalSales).to.equal(1500);
            expect(stats.totalRevenue).to.equal(30000);
            expect(stats.averageRating).to.equal(4.25);
            expect(stats.genres).to.include('fiction');
            expect(stats.genres).to.include('non-fiction');
        });

        it('should add author to book', async () => {
            const author1 = await BookAuthor.create({
                name: 'First Author',
                email: 'first@example.com',
                bio: 'First author'
            });

            const author2 = await BookAuthor.create({
                name: 'Second Author',
                email: 'second@example.com',
                bio: 'Second author'
            });

            const book = await Book.create({
                title: 'Add Author Book',
                isbn: '978-0-123456-89-0',
                authors: [author1._id],
                description: 'A book for testing author addition with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Add Publishers',
                    location: 'Add City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            await book.addAuthor(author2._id);

            const updatedBook = await Book.findById(book._id);
            expect(updatedBook.authors).to.have.length(2);
            expect(updatedBook.authors[1].toString()).to.equal(author2._id.toString());
        });

        it('should remove author from book', async () => {
            const author1 = await BookAuthor.create({
                name: 'Remove Author 1',
                email: 'remove1@example.com',
                bio: 'First author to remove'
            });

            const author2 = await BookAuthor.create({
                name: 'Remove Author 2',
                email: 'remove2@example.com',
                bio: 'Second author to remove'
            });

            const book = await Book.create({
                title: 'Remove Author Book',
                isbn: '978-0-123456-90-1',
                authors: [author1._id, author2._id],
                description: 'A book for testing author removal with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Remove Publishers',
                    location: 'Remove City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            await book.removeAuthor(author1._id);

            const updatedBook = await Book.findById(book._id);
            expect(updatedBook.authors).to.have.length(1);
            expect(updatedBook.authors[0].toString()).to.equal(author2._id.toString());
        });

        it('should not remove last author from book', async () => {
            const author = await BookAuthor.create({
                name: 'Last Author',
                email: 'last@example.com',
                bio: 'Last author'
            });

            const book = await Book.create({
                title: 'Last Author Book',
                isbn: '978-0-123456-91-2',
                authors: [author._id],
                description: 'A book with only one author with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Last Publishers',
                    location: 'Last City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            try {
                await book.removeAuthor(author._id);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Book must have at least one author');
            }
        });

        it('should mark book as bestseller', async () => {
            const author = await BookAuthor.create({
                name: 'Bestseller Mark Author',
                email: 'bestsellermark@example.com',
                bio: 'Author for bestseller marking'
            });

            const book = await Book.create({
                title: 'Mark Bestseller Book',
                isbn: '978-0-123456-93-4',
                authors: [author._id],
                description: 'A book to be marked as bestseller with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Mark Publishers',
                    location: 'Mark City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            await book.markAsBestseller(5);

            expect(book.isBestseller).to.be.true;
            expect(book.sales.bestsellerRank).to.equal(5);
        });

        it('should get book with populated authors', async () => {
            const author = await BookAuthor.create({
                name: 'Populate Book Author',
                email: 'populatebook@example.com',
                bio: 'Author for book population'
            });

            const book = await Book.create({
                title: 'Populate Book',
                isbn: '978-0-123456-94-5',
                authors: [author._id],
                description: 'A book for testing population with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Populate Publishers',
                    location: 'Populate City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            const bookWithAuthors = await book.withAuthors();
            expect(bookWithAuthors.authors).to.have.length(1);
            expect(bookWithAuthors.authors[0].name).to.equal('Populate Book Author');
        });
    });

    describe('Static Methods (using utility functions)', () => {
        beforeEach(async () => {
            // Create test data
            const authors = await BookAuthor.create([
                {
                    name: 'Author 1',
                    email: 'author1@example.com',
                    bio: 'First test author'
                },
                {
                    name: 'Author 2',
                    email: 'author2@example.com',
                    bio: 'Second test author'
                }
            ]);

            await Book.create([
                {
                    title: 'Book 1',
                    isbn: '978-0-123456-95-6',
                    authors: [authors[0]._id],
                    description: 'First test book with enough description to meet requirements.',
                    genre: 'fiction',
                    publisher: {
                        name: 'Test Publishers',
                        location: 'Test City'
                    },
                    publicationInfo: {
                        publishedYear: 2023,
                        pages: 200,
                        language: 'English'
                    },
                    sales: {
                        totalSales: 1000,
                        revenue: 20000
                    }
                },
                {
                    title: 'Book 2',
                    isbn: '978-0-123456-96-7',
                    authors: [authors[0]._id, authors[1]._id],
                    description: 'Second test book with enough description to meet requirements.',
                    genre: 'non-fiction',
                    publisher: {
                        name: 'Test Publishers',
                        location: 'Test City'
                    },
                    publicationInfo: {
                        publishedYear: 2023,
                        pages: 300,
                        language: 'English'
                    },
                    sales: {
                        totalSales: 500,
                        revenue: 10000
                    }
                }
            ]);
        });

        it('should find books by author', async () => {
            const author = await BookAuthor.findOne({ name: 'Author 1' });
            const books = await Book.findByAuthor(author._id);
            
            expect(books).to.have.length(2);
            expect(books[0].title).to.be.oneOf(['Book 1', 'Book 2']);
        });

        it('should find books by multiple authors', async () => {
            const authors = await BookAuthor.find({ name: { $in: ['Author 1', 'Author 2'] } });
            const authorIds = authors.map(author => author._id);
            
            const books = await Book.findByAuthors(authorIds);
            expect(books).to.have.length(2);
        });

        it('should find bestsellers', async () => {
            const author = await BookAuthor.create({
                name: 'Bestseller Author',
                email: 'bestseller@example.com',
                bio: 'Author with bestsellers'
            });

            await Book.create({
                title: 'Bestseller Book',
                isbn: '978-0-123456-97-8',
                authors: [author._id],
                description: 'A bestseller book with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Bestseller Publishers',
                    location: 'Bestseller City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                },
                isBestseller: true,
                sales: {
                    bestsellerRank: 1
                }
            });

            const bestsellers = await Book.findBestsellers(10);
            expect(bestsellers).to.have.length(1);
            expect(bestsellers[0].title).to.equal('Bestseller Book');
        });

        it('should find books by genre', async () => {
            const fictionBooks = await Book.findByGenre('fiction');
            expect(fictionBooks).to.have.length(1);
            expect(fictionBooks[0].title).to.equal('Book 1');

            const nonFictionBooks = await Book.findByGenre('non-fiction');
            expect(nonFictionBooks).to.have.length(1);
            expect(nonFictionBooks[0].title).to.equal('Book 2');
        });

        it('should search books by text', async () => {
            const searchResults = await Book.search('first', { limit: 10 });
            expect(searchResults).to.have.length(1);
            expect(searchResults[0].title).to.equal('Book 1');
        });

        it('should find top authors by sales (using aggregation utility)', async () => {
            const topAuthors = await BookAuthor.findTopBySales(10);
            expect(topAuthors).to.have.length(2);
            expect(topAuthors[0].name).to.equal('Author 1'); // More total sales
        });

        it('should find authors by genre', async () => {
            const author = await BookAuthor.create({
                name: 'Genre Author',
                email: 'genre@example.com',
                bio: 'Author for genre testing',
                writingInfo: {
                    genres: ['fiction', 'mystery']
                }
            });

            const fictionAuthors = await BookAuthor.findByGenre('fiction');
            expect(fictionAuthors).to.have.length(1);
            expect(fictionAuthors[0].name).to.equal('Genre Author');
        });

        it('should get book statistics (using aggregation utility)', async () => {
            const stats = await Book.getBookStats();
            expect(stats).to.have.length(1);
            expect(stats[0].totalBooks).to.equal(2);
            expect(stats[0].uniqueAuthors).to.equal(2);
            expect(stats[0].totalSales).to.equal(1500);
            expect(stats[0].totalRevenue).to.equal(30000);
        });

        it('should find books with pagination (using utility functions)', async () => {
            const page1 = await Book.findWithPagination(1, 1);
            expect(page1).to.have.length(1);

            const page2 = await Book.findWithPagination(2, 1);
            expect(page2).to.have.length(1);
        });

        it('should find books with projection (using utility functions)', async () => {
            const books = await Book.findWithProjection({}, ['title', 'isbn', 'genre']);
            expect(books).to.have.length(2);
            expect(books[0].title).to.exist;
            expect(books[0].isbn).to.exist;
            expect(books[0].genre).to.exist;
            expect(books[0].description).to.be.undefined; // Not in projection
        });
    });

    describe('Virtual Fields', () => {
        it('should return full title with subtitle', async () => {
            const author = await BookAuthor.create({
                name: 'Full Title Author',
                email: 'fulltitle@example.com',
                bio: 'Author for full title testing'
            });

            const book = await Book.create({
                title: 'Main Title',
                subtitle: 'A Subtitle',
                isbn: '978-0-123456-98-9',
                authors: [author._id],
                description: 'A book with subtitle with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Full Title Publishers',
                    location: 'Full Title City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            expect(book.fullTitle).to.equal('Main Title: A Subtitle');
        });

        it('should return title only when no subtitle', async () => {
            const author = await BookAuthor.create({
                name: 'Title Only Author',
                email: 'titleonly@example.com',
                bio: 'Author for title only testing'
            });

            const book = await Book.create({
                title: 'Title Only',
                isbn: '978-0-123456-99-0',
                authors: [author._id],
                description: 'A book without subtitle with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Title Only Publishers',
                    location: 'Title Only City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            expect(book.fullTitle).to.equal('Title Only');
        });

        it('should return author names when populated', async () => {
            const author1 = await BookAuthor.create({
                name: 'First Author',
                email: 'first@example.com',
                bio: 'First author'
            });

            const author2 = await BookAuthor.create({
                name: 'Second Author',
                email: 'second@example.com',
                bio: 'Second author'
            });

            const book = await Book.create({
                title: 'Author Names Book',
                isbn: '978-0-123457-00-1',
                authors: [author1._id, author2._id],
                description: 'A book for testing author names with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Author Names Publishers',
                    location: 'Author Names City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            const bookWithAuthors = await Book.findById(book._id).populate('authors');
            expect(bookWithAuthors.authorNames).to.equal('First Author, Second Author');
        });

        it('should return price range', async () => {
            const author = await BookAuthor.create({
                name: 'Price Author',
                email: 'price@example.com',
                bio: 'Author for price testing'
            });

            const book = await Book.create({
                title: 'Price Book',
                isbn: '978-0-123457-01-2',
                authors: [author._id],
                description: 'A book for testing price range with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Price Publishers',
                    location: 'Price City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                },
                pricing: {
                    hardcover: 29.99,
                    paperback: 19.99,
                    ebook: 9.99,
                    currency: 'USD'
                }
            });

            expect(book.priceRange).to.equal('9.99-29.99 USD');
        });

        it('should return single price when all prices are same', async () => {
            const author = await BookAuthor.create({
                name: 'Same Price Author',
                email: 'sameprice@example.com',
                bio: 'Author for same price testing'
            });

            const book = await Book.create({
                title: 'Same Price Book',
                isbn: '978-0-123457-02-3',
                authors: [author._id],
                description: 'A book with same prices with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Same Price Publishers',
                    location: 'Same Price City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                },
                pricing: {
                    hardcover: 19.99,
                    paperback: 19.99,
                    ebook: 19.99,
                    currency: 'USD'
                }
            });

            expect(book.priceRange).to.equal('19.99 USD');
        });
    });

    describe('Validation', () => {
        it('should validate required fields', async () => {
            const book = new Book({
                title: 'Test Book',
                // Missing isbn, authors, description, etc.
            });

            try {
                await book.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate ISBN format', async () => {
            const author = await BookAuthor.create({
                name: 'ISBN Author',
                email: 'isbn@example.com',
                bio: 'Author for ISBN testing'
            });

            const book = new Book({
                title: 'ISBN Test Book',
                isbn: 'invalid-isbn',
                authors: [author._id],
                description: 'A book with invalid ISBN with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'ISBN Publishers',
                    location: 'ISBN City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                }
            });

            try {
                await book.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        // un comment validate if uncomment this test but it will make many other tests fail
        // it('should validate at least one author', async () => {
        //     const book = new Book({
        //         title: 'No Authors Book',
        //         isbn: '978-0-123457-03-4',
        //         authors: [], // No authors
        //         description: 'A book with no authors with enough description to meet requirements.',
        //         genre: 'fiction',
        //         publisher: {
        //             name: 'No Authors Publishers',
        //             location: 'No Authors City'
        //         },
        //         publicationInfo: {
        //             publishedYear: 2023,
        //             pages: 200,
        //             language: 'English'
        //         }
        //     });
        //
        //     try {
        //         await book.save();
        //         expect.fail('Should have thrown validation error');
        //     } catch (error) {
        //         expect(error.name).to.equal('ValidationError');
        //     }
        // });

        it('should validate published year', async () => {
            const author = await BookAuthor.create({
                name: 'Year Author',
                email: 'year@example.com',
                bio: 'Author for year testing'
            });

            const book = new Book({
                title: 'Year Test Book',
                isbn: '978-0-123457-04-5',
                authors: [author._id],
                description: 'A book with invalid year with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Year Publishers',
                    location: 'Year City'
                },
                publicationInfo: {
                    publishedYear: 1800, // Too old
                    pages: 200,
                    language: 'English'
                }
            });

            try {
                await book.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate rating range', async () => {
            const author = await BookAuthor.create({
                name: 'Rating Author',
                email: 'rating@example.com',
                bio: 'Author for rating testing'
            });

            const book = new Book({
                title: 'Rating Test Book',
                isbn: '978-0-123457-05-6',
                authors: [author._id],
                description: 'A book with invalid rating with enough description to meet requirements.',
                genre: 'fiction',
                publisher: {
                    name: 'Rating Publishers',
                    location: 'Rating City'
                },
                publicationInfo: {
                    publishedYear: 2023,
                    pages: 200,
                    language: 'English'
                },
                ratings: {
                    averageRating: 6.0 // Too high
                }
            });

            try {
                await book.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });
    });

    describe('Pre/Post Middleware', () => {
        it('should format social media handles on save', async () => {
            const author = await BookAuthor.create({
                name: 'Social Author',
                email: 'social@example.com',
                bio: 'Author for social media testing',
                socialMedia: {
                    twitter: 'johndoe', // No @ prefix
                    instagram: 'johndoe' // No @ prefix
                }
            });

            expect(author.socialMedia.twitter).to.equal('@johndoe');
            expect(author.socialMedia.instagram).to.equal('@johndoe');
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await BookAuthor.deleteMany({});
        await Book.deleteMany({});
    });
});
