import mongoose from 'mongoose';
import { validators, virtuals, indexes, queryOptimization, aggregation, errorHandling } from './utils.js';
const Schema = mongoose.Schema;

// ============================================================================
// ONE-TO-MANY RELATIONSHIPS - EMBEDDED SUBDOCUMENTS APPROACH
// ============================================================================

/**
 * Comment Schema (Embedded Subdocument)
 * Comments are embedded within blog posts
 * Best for: Small, always accessed together, limited number of comments
 */
const CommentSchema = new Schema({
    content: { 
        type: String, 
        required: [true, 'Comment content is required'],
        trim: true,
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    author: { 
        type: String, 
        required: [true, 'Comment author is required'],
        trim: true,
        maxlength: [100, 'Author name cannot exceed 100 characters']
    },
    email: {
        type: String,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
        trim: true,
        lowercase: true
    },
    website: {
        type: String,
        match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
        trim: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },
    likes: { 
        type: Number, 
        default: 0,
        min: [0, 'Likes cannot be negative']
    },
    isApproved: { 
        type: Boolean, 
        default: false 
    },
    isSpam: { 
        type: Boolean, 
        default: false 
    },
    parentComment: {
        type: Schema.Types.ObjectId,
        default: null // For nested comments (replies)
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        referrer: String
    }
}, {
    _id: true, // Keep _id for embedded comments to enable replies
    timestamps: false // We handle timestamps manually
});

/**
 * BlogPost Schema (Parent Document)
 * Contains embedded comments array
 */
const BlogPostSchema = new Schema({
    title: { 
        type: String, 
        required: [true, 'Post title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: { 
        type: String, 
        required: [true, 'Post content is required'],
        minlength: [100, 'Content must be at least 100 characters long']
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
        name: { 
            type: String, 
            required: [true, 'Author name is required'],
            trim: true
        },
        email: { 
            type: String, 
            required: [true, 'Author email is required'],
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        },
        website: {
            type: String,
            match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
            trim: true
        }
    },
    comments: [CommentSchema], // Embedded comments array
    metrics: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 }
    },
    featured: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: true },
    commentModeration: { 
        type: String, 
        enum: ['none', 'approve', 'spam-filter'], 
        default: 'approve' 
    },
    readingTime: { type: Number, default: 0 } // in minutes
}, {
    timestamps: true
});

// ============================================================================
// INDEXES FOR PERFORMANCE (using utility functions)
// ============================================================================

// BlogPost indexes
// Compound index for status and published date (using utility)
const statusIndex = indexes.compound(['status', 'publishedAt'], { background: true });
BlogPostSchema.index(statusIndex.fields, statusIndex.options);

// Index for tags
BlogPostSchema.index({ tags: 1 });

// Compound index for category queries (using utility)
const categoryIndex = indexes.compound(['category', 'publishedAt'], { background: true });
BlogPostSchema.index(categoryIndex.fields, categoryIndex.options);

// Index for slug
BlogPostSchema.index({ slug: 1 });

// Index for author email
BlogPostSchema.index({ 'author.email': 1 });

// Compound index for featured posts (using utility)
const featuredIndex = indexes.compound(['featured', 'publishedAt'], { background: true });
BlogPostSchema.index(featuredIndex.fields, featuredIndex.options);

// Index for views
BlogPostSchema.index({ 'metrics.views': -1 });

// Comment-specific indexes within BlogPost
BlogPostSchema.index({ 'comments.createdAt': -1 });
BlogPostSchema.index({ 'comments.author': 1 });
BlogPostSchema.index({ 'comments.isApproved': 1 });

// Text index for search
BlogPostSchema.index({ 
    title: 'text', 
    content: 'text', 
    tags: 'text' 
});

// ============================================================================
// VIRTUAL FIELDS (using utility functions)
// ============================================================================

/**
 * Virtual field for comment count
 */
BlogPostSchema.virtual('commentCount').get(function() {
    return this.comments ? this.comments.length : 0;
});

/**
 * Virtual field for approved comment count
 */
BlogPostSchema.virtual('approvedCommentCount').get(function() {
    if (!this.comments) return 0;
    return this.comments.filter(comment => comment.isApproved && !comment.isSpam).length;
});

/**
 * Virtual field for pending comment count
 */
BlogPostSchema.virtual('pendingCommentCount').get(function() {
    if (!this.comments) return 0;
    return this.comments.filter(comment => !comment.isApproved && !comment.isSpam).length;
});

/**
 * Virtual field for estimated reading time
 */
BlogPostSchema.virtual('estimatedReadingTime').get(function() {
    if (this.readingTime > 0) return this.readingTime;
    
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
});

/**
 * Virtual field for post URL
 */
BlogPostSchema.virtual('url').get(function() {
    return `/blog/${this.slug || this._id}`;
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Add a new comment to the post
 */
BlogPostSchema.methods.addComment = function(commentData) {
    if (!this.allowComments) {
        throw new Error('Comments are not allowed on this post');
    }
    
    const comment = {
        ...commentData,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    // Auto-approve based on moderation settings
    if (this.commentModeration === 'none') {
        comment.isApproved = true;
    } else if (this.commentModeration === 'spam-filter') {
        // Simple spam detection (in real app, use more sophisticated methods)
        const spamKeywords = ['spam', 'viagra', 'casino', 'lottery'];
        comment.isApproved = !spamKeywords.some(keyword => 
            comment.content.toLowerCase().includes(keyword)
        );
    }
    
    this.comments.push(comment);
    return this.save();
};

/**
 * Approve a comment by ID
 */
BlogPostSchema.methods.approveComment = function(commentId) {
    const comment = this.comments.id(commentId);
    if (!comment) {
        throw new Error('Comment not found');
    }
    
    comment.isApproved = true;
    comment.isSpam = false;
    comment.updatedAt = new Date();
    return this.save();
};

/**
 * Mark a comment as spam
 */
BlogPostSchema.methods.markCommentAsSpam = function(commentId) {
    const comment = this.comments.id(commentId);
    if (!comment) {
        throw new Error('Comment not found');
    }
    
    comment.isSpam = true;
    comment.isApproved = false;
    comment.updatedAt = new Date();
    return this.save();
};

/**
 * Delete a comment by ID
 */
BlogPostSchema.methods.deleteComment = function(commentId) {
    const comment = this.comments.id(commentId);
    if (!comment) {
        throw new Error('Comment not found');
    }
    
    comment.remove();
    return this.save();
};

/**
 * Like a comment
 */
BlogPostSchema.methods.likeComment = function(commentId) {
    const comment = this.comments.id(commentId);
    if (!comment) {
        throw new Error('Comment not found');
    }
    
    comment.likes += 1;
    comment.updatedAt = new Date();
    return this.save();
};

/**
 * Get approved comments only
 */
BlogPostSchema.methods.getApprovedComments = function() {
    if (!this.comments) return [];
    return this.comments.filter(comment => comment.isApproved && !comment.isSpam);
};

/**
 * Get pending comments (for moderation)
 */
BlogPostSchema.methods.getPendingComments = function() {
    if (!this.comments) return [];
    return this.comments.filter(comment => !comment.isApproved && !comment.isSpam);
};

/**
 * Get comments by author
 */
BlogPostSchema.methods.getCommentsByAuthor = function(authorName) {
    if (!this.comments) return [];
    return this.comments.filter(comment => 
        comment.author.toLowerCase() === authorName.toLowerCase()
    );
};

/**
 * Publish the post
 */
BlogPostSchema.methods.publish = function() {
    this.status = 'published';
    this.publishedAt = new Date();
    return this.save();
};

/**
 * Archive the post
 */
BlogPostSchema.methods.archive = function() {
    this.status = 'archived';
    return this.save();
};

/**
 * Increment view count
 */
BlogPostSchema.methods.incrementViews = function() {
    this.metrics.views += 1;
    return this.save();
};

// ============================================================================
// STATIC METHODS (using utility functions)
// ============================================================================

/**
 * Find published posts with pagination (using utility functions)
 */
BlogPostSchema.statics.findPublished = function(page = 1, limit = 10) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(queryLimit);
};

/**
 * Find posts with most comments (using aggregation utility)
 */
BlogPostSchema.statics.findMostCommented = function(limit = 10) {
    return this.aggregate([
        aggregation.match({ status: 'published' }),
        {
            $addFields: {
                commentCount: { $size: '$comments' }
            }
        },
        aggregation.sort({ commentCount: -1 }),
        aggregation.limit(limit)
    ]);
};

/**
 * Find posts with pending comments (for moderation)
 */
BlogPostSchema.statics.findWithPendingComments = function() {
    return this.find({
        'comments.isApproved': false,
        'comments.isSpam': false
    });
};

/**
 * Search posts by text
 */
BlogPostSchema.statics.search = function(query, options = {}) {
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
        .limit(queryLimit);
};

/**
 * Find posts by tag
 */
BlogPostSchema.statics.findByTag = function(tag, page = 1, limit = 10) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find({ 
        tags: tag, 
        status: 'published' 
    })
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(queryLimit);
};

/**
 * Get comment statistics (using aggregation utility)
 */
BlogPostSchema.statics.getCommentStats = function() {
    return this.aggregate([
        {
            $unwind: {
                path: '$comments',
                preserveNullAndEmptyArrays: true
            }
        },
        aggregation.group('null', {
            totalComments: { $sum: 1 },
            approvedComments: {
                $sum: { $cond: ['$comments.isApproved', 1, 0] }
            },
            pendingComments: {
                $sum: { 
                    $cond: [
                        { $and: [
                            { $not: '$comments.isApproved' },
                            { $not: '$comments.isSpam' }
                        ]}, 
                        1, 
                        0
                    ]
                }
            },
            spamComments: {
                $sum: { $cond: ['$comments.isSpam', 1, 0] }
            },
            totalLikes: { $sum: '$comments.likes' }
        })
    ]);
};

/**
 * Find posts by author email
 */
BlogPostSchema.statics.findByAuthor = function(authorEmail, page = 1, limit = 10) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find({ 'author.email': authorEmail })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(queryLimit);
};

// ============================================================================
// PRE/POST MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware - generate slug
 */
BlogPostSchema.pre('save', function(next) {
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
    
    // Set published date when status changes to published
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    
    next();
});

/**
 * Pre-save middleware - update comment timestamps
 */
BlogPostSchema.pre('save', function(next) {
    if (this.isModified('comments')) {
        this.comments.forEach(comment => {
            if (comment.isModified()) {
                comment.updatedAt = new Date();
            }
        });
    }
    next();
});

/**
 * Post-save middleware
 */
BlogPostSchema.post('save', function(doc) {
    console.log(`Blog post "${doc.title}" saved with ${doc.commentCount} comments`);
});

// ============================================================================
// EXPORT MODEL
// ============================================================================

export const BlogPost = mongoose.model('BlogPost', BlogPostSchema);
