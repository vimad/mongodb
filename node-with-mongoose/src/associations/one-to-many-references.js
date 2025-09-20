import mongoose from 'mongoose';
import { validators, virtuals, indexes, queryOptimization, aggregation, errorHandling } from './utils.js';
const Schema = mongoose.Schema;

// ============================================================================
// ONE-TO-MANY RELATIONSHIPS - REFERENCES APPROACH
// ============================================================================

/**
 * Author Schema (Parent Document)
 * One author can have many posts
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
        }
    },
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

/**
 * Post Schema (Child Document)
 * Many posts belong to one author
 */
const PostSchema = new Schema({
    title: { 
        type: String, 
        required: [true, 'Post title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: { 
        type: String, 
        required: [true, 'Post content is required'],
        minlength: [50, 'Content must be at least 50 characters long']
    },
    excerpt: {
        type: String,
        maxlength: [300, 'Excerpt cannot exceed 300 characters'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    category: {
        type: String,
        enum: ['technology', 'lifestyle', 'business', 'education', 'other'],
        default: 'other'
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    publishedAt: { 
        type: Date,
        validate: {
            validator: function(date) {
                return !date || date <= new Date();
            },
            message: 'Published date cannot be in the future'
        }
    },
    author: { 
        type: Schema.Types.ObjectId, 
        ref: 'Author', 
        required: [true, 'Author reference is required']
    },
    metrics: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        comments: { type: Number, default: 0 }
    },
    featured: { type: Boolean, default: false },
    readingTime: { type: Number, default: 0 } // in minutes
}, {
    timestamps: true
});

// ============================================================================
// INDEXES FOR PERFORMANCE (using utility functions)
// ============================================================================

// Author indexes
AuthorSchema.index({ email: 1 });

// Compound index for author queries (using utility)
const authorActiveIndex = indexes.compound(['isActive', 'joinedAt'], { background: true });
AuthorSchema.index(authorActiveIndex.fields, authorActiveIndex.options);

// Sparse index on social media (using utility)
const twitterIndex = indexes.sparse(['socialMedia.twitter']);
AuthorSchema.index(twitterIndex.fields, twitterIndex.options);

// Post indexes
// Compound index for author's posts (using utility)
const postAuthorIndex = indexes.compound(['author', 'publishedAt'], { background: true });
PostSchema.index(postAuthorIndex.fields, postAuthorIndex.options);

// Compound index for published posts (using utility)
const postStatusIndex = indexes.compound(['status', 'publishedAt'], { background: true });
PostSchema.index(postStatusIndex.fields, postStatusIndex.options);

// Index for tag-based queries
PostSchema.index({ tags: 1 });

// Compound index for category queries (using utility)
const postCategoryIndex = indexes.compound(['category', 'publishedAt'], { background: true });
PostSchema.index(postCategoryIndex.fields, postCategoryIndex.options);

// Index for slug queries
PostSchema.index({ slug: 1 });

// Compound index for featured posts (using utility)
const featuredIndex = indexes.compound(['featured', 'publishedAt'], { background: true });
PostSchema.index(featuredIndex.fields, featuredIndex.options);

// Index for views
PostSchema.index({ 'metrics.views': -1 });

// Text index for search
PostSchema.index({ 
    title: 'text', 
    content: 'text', 
    tags: 'text' 
});

// ============================================================================
// VIRTUAL FIELDS (using utility functions)
// ============================================================================

/**
 * Virtual field for author's posts (using utility)
 */
const postsVirtual = virtuals.createReverseRelationship('_id', 'author', 'Post');
AuthorSchema.virtual('posts', postsVirtual);

/**
 * Virtual field for post count (using utility)
 */
const postCountVirtual = virtuals.createCountField('_id', 'author', 'Post');
AuthorSchema.virtual('postCount', postCountVirtual);

/**
 * Virtual field for published posts count (using utility)
 */
const publishedPostCountVirtual = virtuals.createCountField('_id', 'author', 'Post');
publishedPostCountVirtual.match = { status: 'published' };
AuthorSchema.virtual('publishedPostCount', publishedPostCountVirtual);

/**
 * Virtual field for total views across all posts
 */
AuthorSchema.virtual('totalViews', {
    ref: 'Post',
    localField: '_id',
    foreignField: 'author',
    options: { 
        match: { status: 'published' },
        sort: { 'metrics.views': -1 }
    }
});

/**
 * Virtual field for reading time calculation
 */
PostSchema.virtual('estimatedReadingTime').get(function() {
    if (this.readingTime > 0) return this.readingTime;
    
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
});

/**
 * Virtual field for post URL
 */
PostSchema.virtual('url').get(function() {
    return `/posts/${this.slug || this._id}`;
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Get author with all posts
 */
AuthorSchema.methods.withPosts = function() {
    return this.populate('posts');
};

/**
 * Get author with published posts only
 */
AuthorSchema.methods.withPublishedPosts = function() {
    return this.populate({
        path: 'posts',
        match: { status: 'published' },
        options: { sort: { publishedAt: -1 } }
    });
};

/**
 * Get author statistics (using aggregation utility)
 */
AuthorSchema.methods.getStats = async function() {
    const Post = mongoose.model('Post');
    const stats = await Post.aggregate([
        aggregation.match({ author: this._id }),
        aggregation.group('$author', {
            totalPosts: { $sum: 1 },
            publishedPosts: { 
                $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            },
            totalViews: { $sum: '$metrics.views' },
            totalLikes: { $sum: '$metrics.likes' },
            avgViews: { $avg: '$metrics.views' }
        })
    ]);
    
    return stats[0] || {
        totalPosts: 0,
        publishedPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        avgViews: 0
    };
};

/**
 * Publish a post
 */
PostSchema.methods.publish = function() {
    this.status = 'published';
    this.publishedAt = new Date();
    return this.save();
};

/**
 * Archive a post
 */
PostSchema.methods.archive = function() {
    this.status = 'archived';
    return this.save();
};

/**
 * Increment view count
 */
PostSchema.methods.incrementViews = function() {
    this.metrics.views += 1;
    return this.save();
};

/**
 * Like a post
 */
PostSchema.methods.like = function() {
    this.metrics.likes += 1;
    return this.save();
};

/**
 * Get related posts (same author, same tags)
 */
PostSchema.methods.getRelatedPosts = async function(limit = 5) {
    const Post = mongoose.model('Post');
    return Post.find({
        _id: { $ne: this._id },
        author: this.author,
        status: 'published',
        tags: { $in: this.tags }
    })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate('author', 'name');
};

// ============================================================================
// STATIC METHODS (using utility functions)
// ============================================================================

/**
 * Find authors with post counts (using aggregation utility)
 */
AuthorSchema.statics.findWithPostCounts = function() {
    return this.aggregate([
        aggregation.lookup('posts', '_id', 'author', 'posts'),
        {
            $addFields: {
                postCount: { $size: '$posts' },
                publishedPostCount: {
                    $size: {
                        $filter: {
                            input: '$posts',
                            cond: { $eq: ['$$this.status', 'published'] }
                        }
                    }
                }
            }
        },
        aggregation.project({ posts: 0 }) // Remove posts array from result
    ]);
};

/**
 * Find top authors by views (using aggregation utility)
 */
AuthorSchema.statics.findTopAuthors = function(limit = 10) {
    return this.aggregate([
        aggregation.lookup('posts', '_id', 'author', 'posts'),
        {
            $addFields: {
                totalViews: {
                    $sum: '$posts.metrics.views'
                },
                totalLikes: {
                    $sum: '$posts.metrics.likes'
                }
            }
        },
        aggregation.match({
            totalViews: { $gt: 0 }
        }),
        aggregation.sort({ totalViews: -1 }),
        aggregation.limit(limit),
        aggregation.project({ posts: 0 })
    ]);
};

/**
 * Find published posts with pagination (using utility functions)
 */
PostSchema.statics.findPublished = function(page = 1, limit = 10) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(queryLimit)
        .populate('author', 'name email');
};

/**
 * Search posts by text
 */
PostSchema.statics.search = function(query, options = {}) {
    const { page = 1, limit = 10, category, tags } = options;
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    
    const searchQuery = {
        $text: { $search: query },
        status: 'published'
    };
    
    if (category) searchQuery.category = category;
    if (tags && tags.length > 0) searchQuery.tags = { $in: tags };
    
    return this.find(searchQuery)
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(queryLimit)
        .populate('author', 'name email');
};

/**
 * Find posts by tag
 */
PostSchema.statics.findByTag = function(tag, page = 1, limit = 10) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find({ 
        tags: tag, 
        status: 'published' 
    })
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(queryLimit)
    .populate('author', 'name email');
};

/**
 * Get popular posts
 */
PostSchema.statics.findPopular = function(limit = 10, days = 30) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    
    return this.find({
        status: 'published',
        publishedAt: { $gte: dateLimit }
    })
    .sort({ 'metrics.views': -1 })
    .limit(limit)
    .populate('author', 'name email');
};

// ============================================================================
// PRE/POST MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware for Post - generate slug
 */
PostSchema.pre('save', function(next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    
    // Calculate reading time
    if (this.isModified('content')) {
        const wordsPerMinute = 200;
        const wordCount = this.content.split(/\s+/).length;
        this.readingTime = Math.ceil(wordCount / wordsPerMinute);
    }
    
    next();
});

/**
 * Pre-save middleware for Post - set published date
 */
PostSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
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
 * Post-save middleware for Post
 */
PostSchema.post('save', function(doc) {
    console.log(`Post "${doc.title}" saved by author ${doc.author}`);
});

// ============================================================================
// EXPORT MODELS
// ============================================================================

export const Author = mongoose.model('Author', AuthorSchema);
export const Post = mongoose.model('Post', PostSchema);
