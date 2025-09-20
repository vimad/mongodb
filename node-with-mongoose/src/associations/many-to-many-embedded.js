import mongoose from 'mongoose';
import { validators, virtuals, indexes, queryOptimization, aggregation, errorHandling } from './utils.js';
const Schema = mongoose.Schema;

// ============================================================================
// MANY-TO-MANY RELATIONSHIPS - EMBEDDED ARRAYS APPROACH
// ============================================================================

/**
 * Author Schema
 * Authors can write multiple books
 */
const AuthorSchema = new Schema({
    name: { 
        type: String, 
        required: [true, 'Author name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long']
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    bio: {
        type: String,
        maxlength: [1000, 'Bio cannot exceed 1000 characters'],
        trim: true
    },
    website: {
        type: String,
        match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
        trim: true
    },
    socialMedia: {
        twitter: {
            type: String,
            match: [/^@?[A-Za-z0-9_]+$/, 'Please enter a valid Twitter handle'],
            trim: true
        },
        linkedin: {
            type: String,
            match: [/^[A-Za-z0-9-]+$/, 'Please enter a valid LinkedIn username'],
            trim: true
        },
        instagram: {
            type: String,
            match: [/^@?[A-Za-z0-9_.]+$/, 'Please enter a valid Instagram handle'],
            trim: true
        }
    },
    personalInfo: {
        dateOfBirth: Date,
        nationality: { type: String, trim: true },
        languages: [{ type: String, trim: true }],
        awards: [{ 
            name: { type: String, trim: true },
            year: Number,
            organization: { type: String, trim: true }
        }]
    },
    writingInfo: {
        genres: [{ 
            type: String, 
            enum: ['fiction', 'non-fiction', 'mystery', 'romance', 'sci-fi', 'fantasy', 'biography', 'history', 'self-help', 'business', 'technology', 'other'],
            trim: true
        }],
        writingStyle: { type: String, trim: true },
        influences: [{ type: String, trim: true }],
        debutYear: Number
    },
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

/**
 * Book Schema
 * Books can have multiple authors (embedded array of references)
 */
const BookSchema = new Schema({
    title: { 
        type: String, 
        required: [true, 'Book title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    subtitle: {
        type: String,
        maxlength: [200, 'Subtitle cannot exceed 200 characters'],
        trim: true
    },
    isbn: { 
        type: String, 
        required: [true, 'ISBN is required'],
        unique: true,
        match: [/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/, 'Please enter a valid ISBN']
    },
    authors: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'Author',
        required: true
    }], // Array of author references
    description: {
        type: String,
        required: [true, 'Book description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    genre: {
        type: String,
        required: [true, 'Genre is required'],
        enum: ['fiction', 'non-fiction', 'mystery', 'romance', 'sci-fi', 'fantasy', 'biography', 'history', 'self-help', 'business', 'technology', 'children', 'young-adult', 'poetry', 'drama', 'other']
    },
    subgenres: [{
        type: String,
        trim: true
    }],
    publisher: {
        name: { 
            type: String, 
            required: [true, 'Publisher name is required'],
            trim: true
        },
        location: { type: String, trim: true },
        website: {
            type: String,
            match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
            trim: true
        }
    },
    publicationInfo: {
        publishedYear: { 
            type: Number, 
            required: [true, 'Published year is required'],
            min: [1000, 'Published year must be realistic'],
            max: [new Date().getFullYear() + 2, 'Published year cannot be too far in the future']
        },
        edition: { type: String, default: '1st', trim: true },
        pages: { 
            type: Number, 
            min: [1, 'Book must have at least 1 page'],
            max: [10000, 'Book cannot have more than 10000 pages']
        },
        language: { 
            type: String, 
            default: 'English',
            match: [/^[A-Za-z\s]+$/, 'Language must contain only letters and spaces']
        }
    },
    pricing: {
        hardcover: { 
            type: Number, 
            min: [0, 'Price cannot be negative'],
            max: [1000, 'Price seems too high']
        },
        paperback: { 
            type: Number, 
            min: [0, 'Price cannot be negative'],
            max: [500, 'Price seems too high']
        },
        ebook: { 
            type: Number, 
            min: [0, 'Price cannot be negative'],
            max: [100, 'Ebook price seems too high']
        },
        currency: { 
            type: String, 
            default: 'USD',
            enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR']
        }
    },
    ratings: {
        averageRating: { 
            type: Number, 
            default: 0,
            min: [0, 'Rating cannot be negative'],
            max: [5, 'Rating cannot exceed 5']
        },
        totalRatings: { type: Number, default: 0 },
        ratingBreakdown: {
            fiveStar: { type: Number, default: 0 },
            fourStar: { type: Number, default: 0 },
            threeStar: { type: Number, default: 0 },
            twoStar: { type: Number, default: 0 },
            oneStar: { type: Number, default: 0 }
        }
    },
    sales: {
        totalSales: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        bestsellerRank: Number,
        amazonRank: Number
    },
    awards: [{
        name: { type: String, trim: true },
        year: Number,
        category: { type: String, trim: true },
        organization: { type: String, trim: true }
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    isActive: { type: Boolean, default: true },
    isBestseller: { type: Boolean, default: false },
    isNewRelease: { type: Boolean, default: false }
}, {
    timestamps: true
});

// ============================================================================
// INDEXES FOR PERFORMANCE (using utility functions)
// ============================================================================

// Author indexes
AuthorSchema.index({ email: 1 });

// Compound index for author status (using utility)
const authorActiveIndex = indexes.compound(['isActive', 'joinedAt'], { background: true });
AuthorSchema.index(authorActiveIndex.fields, authorActiveIndex.options);

// Index for writing genres
AuthorSchema.index({ 'writingInfo.genres': 1 });

// Sparse index on social media (using utility)
const twitterIndex = indexes.sparse(['socialMedia.twitter']);
AuthorSchema.index(twitterIndex.fields, twitterIndex.options);

// Index for nationality
AuthorSchema.index({ 'personalInfo.nationality': 1 });

// Book indexes
BookSchema.index({ isbn: 1 });

// Index for authors array
BookSchema.index({ authors: 1 });

// Compound index for genre and publication year (using utility)
const genreYearIndex = indexes.compound(['genre', 'publicationInfo.publishedYear'], { background: true });
BookSchema.index(genreYearIndex.fields, genreYearIndex.options);

// Index for publisher
BookSchema.index({ 'publisher.name': 1 });

// Index for publication year
BookSchema.index({ 'publicationInfo.publishedYear': -1 });

// Index for ratings
BookSchema.index({ 'ratings.averageRating': -1 });

// Index for sales
BookSchema.index({ 'sales.totalSales': -1 });

// Index for tags
BookSchema.index({ tags: 1 });

// Compound index for bestsellers (using utility)
const bestsellerIndex = indexes.compound(['isBestseller', 'sales.bestsellerRank'], { background: true });
BookSchema.index(bestsellerIndex.fields, bestsellerIndex.options);

// Compound index for new releases (using utility)
const newReleaseIndex = indexes.compound(['isNewRelease', 'publicationInfo.publishedYear'], { background: true });
BookSchema.index(newReleaseIndex.fields, newReleaseIndex.options);

// Text index for search
BookSchema.index({ 
    title: 'text', 
    subtitle: 'text',
    description: 'text', 
    tags: 'text' 
});

// ============================================================================
// VIRTUAL FIELDS (using utility functions)
// ============================================================================

/**
 * Virtual field for author's books (using utility)
 */
const authorBooksVirtual = virtuals.createReverseRelationship('_id', 'authors', 'Book');
AuthorSchema.virtual('books', authorBooksVirtual);

/**
 * Virtual field for book count (using utility)
 */
const bookCountVirtual = virtuals.createCountField('_id', 'authors', 'Book');
AuthorSchema.virtual('bookCount', bookCountVirtual);

/**
 * Virtual field for total sales across all books
 */
AuthorSchema.virtual('totalSales', {
    ref: 'Book',
    localField: '_id',
    foreignField: 'authors'
});

/**
 * Virtual field for full title (title + subtitle)
 */
BookSchema.virtual('fullTitle').get(function() {
    return this.subtitle ? `${this.title}: ${this.subtitle}` : this.title;
});

/**
 * Virtual field for author names
 */
BookSchema.virtual('authorNames').get(function() {
    // This would be populated when querying
    if (this.populated('authors')) {
        return this.authors.map(author => author.name).join(', ');
    }
    return 'Authors not populated';
});

/**
 * Virtual field for price range
 */
BookSchema.virtual('priceRange').get(function() {
    const prices = [this.pricing.hardcover, this.pricing.paperback, this.pricing.ebook]
        .filter(price => price && price > 0);
    
    if (prices.length === 0) return 'Price not available';
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    return min === max ? `${min} ${this.pricing.currency}` : `${min}-${max} ${this.pricing.currency}`;
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Get author with all books
 */
AuthorSchema.methods.withBooks = function() {
    return this.populate('books');
};

/**
 * Get author's bestsellers
 */
AuthorSchema.methods.getBestsellers = function() {
    return this.populate({
        path: 'books',
        match: { isBestseller: true },
        options: { sort: { 'sales.bestsellerRank': 1 } }
    });
};

/**
 * Get author's recent books
 */
AuthorSchema.methods.getRecentBooks = function(years = 5) {
    const cutoffYear = new Date().getFullYear() - years;
    return this.populate({
        path: 'books',
        match: { 'publicationInfo.publishedYear': { $gte: cutoffYear } },
        options: { sort: { 'publicationInfo.publishedYear': -1 } }
    });
};

/**
 * Get author statistics (using aggregation utility)
 */
AuthorSchema.methods.getStats = async function() {
    const Book = mongoose.model('Book');
    const stats = await Book.aggregate([
        aggregation.match({ authors: this._id }),
        aggregation.group('$authors', {
            totalBooks: { $sum: 1 },
            totalSales: { $sum: '$sales.totalSales' },
            totalRevenue: { $sum: '$sales.revenue' },
            averageRating: { $avg: '$ratings.averageRating' },
            bestsellers: {
                $sum: { $cond: ['$isBestseller', 1, 0] }
            },
            genres: { $addToSet: '$genre' }
        })
    ]);
    
    return stats[0] || {
        totalBooks: 0,
        totalSales: 0,
        totalRevenue: 0,
        averageRating: 0,
        bestsellers: 0,
        genres: []
    };
};

/**
 * Add author to book
 */
BookSchema.methods.addAuthor = function(authorId) {
    if (!this.authors.includes(authorId)) {
        this.authors.push(authorId);
        return this.save();
    }
    return Promise.resolve(this);
};

/**
 * Remove author from book
 */
BookSchema.methods.removeAuthor = function(authorId) {
    if (this.authors.length <= 1) {
        throw new Error('Book must have at least one author');
    }
    
    this.authors = this.authors.filter(id => !id.equals(authorId));
    return this.save();
};

/**
 * Update book rating
 */
BookSchema.methods.updateRating = function(rating) {
    if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
    }
    
    // Update rating breakdown
    const ratingKey = `${rating}Star`;
    this.ratings.ratingBreakdown[ratingKey] += 1;
    this.ratings.totalRatings += 1;
    
    // Recalculate average rating
    const totalPoints = Object.entries(this.ratings.ratingBreakdown)
        .reduce((sum, [key, count]) => {
            const starCount = parseInt(key.charAt(0));
            return sum + (starCount * count);
        }, 0);
    
    this.ratings.averageRating = totalPoints / this.ratings.totalRatings;
    
    return this.save();
};

/**
 * Mark as bestseller
 */
BookSchema.methods.markAsBestseller = function(rank) {
    this.isBestseller = true;
    this.sales.bestsellerRank = rank;
    return this.save();
};

/**
 * Get book with populated authors
 */
BookSchema.methods.withAuthors = function() {
    return this.populate('authors');
};

// ============================================================================
// STATIC METHODS (using utility functions)
// ============================================================================

/**
 * Find books by author
 */
BookSchema.statics.findByAuthor = function(authorId, options = {}) {
    const { page = 1, limit = 10, sortBy = 'publicationInfo.publishedYear', sortOrder = -1 } = options;
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    const sort = queryOptimization.sort([`${sortOrder === -1 ? '-' : ''}${sortBy}`]);
    
    return this.find({ authors: authorId })
        .sort(sort)
        .skip(skip)
        .limit(queryLimit)
        .populate('authors', 'name email');
};

/**
 * Find books by multiple authors
 */
BookSchema.statics.findByAuthors = function(authorIds) {
    return this.find({ authors: { $in: authorIds } })
        .populate('authors', 'name email');
};

/**
 * Find bestsellers
 */
BookSchema.statics.findBestsellers = function(limit = 20) {
    return this.find({ isBestseller: true })
        .sort({ 'sales.bestsellerRank': 1 })
        .limit(limit)
        .populate('authors', 'name');
};

/**
 * Find books by genre
 */
BookSchema.statics.findByGenre = function(genre, options = {}) {
    const { page = 1, limit = 10, sortBy = 'ratings.averageRating', sortOrder = -1 } = options;
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    const sort = queryOptimization.sort([`${sortOrder === -1 ? '-' : ''}${sortBy}`]);
    
    return this.find({ genre })
        .sort(sort)
        .skip(skip)
        .limit(queryLimit)
        .populate('authors', 'name');
};

/**
 * Search books by text
 */
BookSchema.statics.search = function(query, options = {}) {
    const { page = 1, limit = 10, genre, minRating } = options;
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    
    const searchQuery = {
        $text: { $search: query }
    };
    
    if (genre) searchQuery.genre = genre;
    if (minRating) searchQuery['ratings.averageRating'] = { $gte: minRating };
    
    return this.find(searchQuery)
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(queryLimit)
        .populate('authors', 'name');
};

/**
 * Find top authors by sales (using aggregation utility)
 */
AuthorSchema.statics.findTopBySales = function(limit = 10) {
    return this.aggregate([
        aggregation.lookup('books', '_id', 'authors', 'books'),
        {
            $addFields: {
                totalSales: { $sum: '$books.sales.totalSales' },
                totalRevenue: { $sum: '$books.sales.revenue' },
                bookCount: { $size: '$books' },
                averageRating: { $avg: '$books.ratings.averageRating' }
            }
        },
        aggregation.match({
            totalSales: { $gt: 0 }
        }),
        aggregation.sort({ totalSales: -1 }),
        aggregation.limit(limit),
        aggregation.project({ books: 0 })
    ]);
};

/**
 * Find authors by genre
 */
AuthorSchema.statics.findByGenre = function(genre) {
    return this.find({ 'writingInfo.genres': genre });
};

/**
 * Get book statistics (using aggregation utility)
 */
BookSchema.statics.getBookStats = function() {
    return this.aggregate([
        aggregation.group('null', {
            totalBooks: { $sum: 1 },
            totalAuthors: { $addToSet: '$authors' },
            averageRating: { $avg: '$ratings.averageRating' },
            totalSales: { $sum: '$sales.totalSales' },
            totalRevenue: { $sum: '$sales.revenue' },
            bestsellers: { $sum: { $cond: ['$isBestseller', 1, 0] } },
            genres: { $addToSet: '$genre' }
        }),
        {
            $addFields: {
                uniqueAuthors: { $size: { $reduce: {
                    input: '$totalAuthors',
                    initialValue: [],
                    in: { $setUnion: ['$$value', '$$this'] }
                }}}
            }
        }
    ]);
};

/**
 * Find books with pagination (using utility functions)
 */
BookSchema.statics.findWithPagination = function(page = 1, limit = 10, filters = {}) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find(filters)
        .skip(skip)
        .limit(queryLimit)
        .populate('authors', 'name');
};

/**
 * Find books with projection (using utility functions)
 */
BookSchema.statics.findWithProjection = function(filters = {}, fields = ['title', 'isbn', 'genre', 'publicationInfo.publishedYear']) {
    const projection = queryOptimization.projection(fields);
    return this.find(filters, projection).populate('authors', 'name');
};

// ============================================================================
// PRE/POST MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware for Book - validate authors
 */
BookSchema.pre('save', function(next) {
    if (this.authors.length === 0) {
        return next(new Error('Book must have at least one author'));
    }
    
    // Ensure ISBN is properly formatted
    if (this.isbn) {
        this.isbn = this.isbn.replace(/[-\s]/g, '');
    }
    
    next();
});

/**
 * Pre-save middleware for Author - format social media handles
 */
AuthorSchema.pre('save', function(next) {
    if (this.socialMedia) {
        if (this.socialMedia.twitter && !this.socialMedia.twitter.startsWith('@')) {
            this.socialMedia.twitter = '@' + this.socialMedia.twitter;
        }
        if (this.socialMedia.instagram && !this.socialMedia.instagram.startsWith('@')) {
            this.socialMedia.instagram = '@' + this.socialMedia.instagram;
        }
    }
    next();
});

/**
 * Post-save middleware for Author
 */
AuthorSchema.post('save', function(doc) {
    console.log(`Author ${doc.name} saved`);
});

/**
 * Post-save middleware for Book
 */
BookSchema.post('save', function(doc) {
    console.log(`Book "${doc.title}" saved with ${doc.authors.length} author(s)`);
});

// ============================================================================
// EXPORT MODELS
// ============================================================================

export const Author = mongoose.model('Author', AuthorSchema);
export const Book = mongoose.model('Book', BookSchema);
