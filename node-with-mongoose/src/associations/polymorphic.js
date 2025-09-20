import mongoose from 'mongoose';
import { validators, virtuals, indexes, queryOptimization, aggregation, errorHandling } from './utils.js';
const Schema = mongoose.Schema;

// ============================================================================
// POLYMORPHIC ASSOCIATIONS
// ============================================================================

/**
 * Comment Schema - Polymorphic Association
 * Comments can be attached to different types of entities (Posts, Products, etc.)
 */
const CommentPolymorphicSchema = new Schema({
    content: { 
        type: String, 
        required: [true, 'Comment content is required'],
        trim: true,
        maxlength: [2000, 'Comment cannot exceed 2000 characters']
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
        userId: { 
            type: Schema.Types.ObjectId, 
            ref: 'User' // Optional reference to user account
        },
        avatar: { type: String, trim: true }
    },
    // Polymorphic reference fields
    commentableType: { 
        type: String, 
        enum: ['Post', 'Product', 'Article', 'Video', 'Photo', 'Event'],
        required: [true, 'Commentable type is required']
    },
    commentableId: { 
        type: Schema.Types.ObjectId, 
        required: [true, 'Commentable ID is required']
    },
    // Nested comments (replies)
    parent: { 
        type: Schema.Types.ObjectId, 
        ref: 'CommentPolymorphic',
        default: null
    },
    level: {
        type: Number,
        default: 0,
        min: [0, 'Level cannot be negative'],
        max: [3, 'Maximum nesting level is 3']
    },
    isApproved: { 
        type: Boolean, 
        default: false 
    },
    isSpam: { 
        type: Boolean, 
        default: false 
    },
    isPinned: { 
        type: Boolean, 
        default: false 
    },
    likes: { 
        type: Number, 
        default: 0,
        min: [0, 'Likes cannot be negative']
    },
    dislikes: { 
        type: Number, 
        default: 0,
        min: [0, 'Dislikes cannot be negative']
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        editedAt: Date,
        editCount: { type: Number, default: 0 },
        moderationNotes: String
    }
}, {
    timestamps: true
});

/**
 * Like Schema - Polymorphic Association
 * Likes can be attached to different types of entities
 */
const LikePolymorphicSchema = new Schema({
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'User reference is required']
    },
    // Polymorphic reference fields
    likeableType: { 
        type: String, 
        enum: ['Post', 'Product', 'Article', 'Video', 'Photo', 'Comment', 'Event'],
        required: [true, 'Likeable type is required']
    },
    likeableId: { 
        type: Schema.Types.ObjectId, 
        required: [true, 'Likeable ID is required']
    },
    type: {
        type: String,
        enum: ['like', 'love', 'laugh', 'angry', 'sad', 'wow'],
        default: 'like'
    }
}, {
    timestamps: true
});

/**
 * Tag Schema - Polymorphic Association
 * Tags can be attached to different types of entities
 */
const TagPolymorphicSchema = new Schema({
    name: { 
        type: String, 
        required: [true, 'Tag name is required'],
        trim: true,
        lowercase: true,
        unique: true
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        trim: true
    },
    color: { 
        type: String, 
        match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'],
        default: '#007bff'
    },
    usageCount: { 
        type: Number, 
        default: 0,
        min: [0, 'Usage count cannot be negative']
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
}, {
    timestamps: true
});

/**
 * TagAssociation Schema - Junction for polymorphic tagging
 */
const TagAssociationSchema = new Schema({
    tag: { 
        type: Schema.Types.ObjectId, 
        ref: 'TagPolymorphic', 
        required: [true, 'Tag reference is required']
    },
    // Polymorphic reference fields
    taggableType: { 
        type: String, 
        enum: ['Post', 'Product', 'Article', 'Video', 'Photo', 'Event', 'User'],
        required: [true, 'Taggable type is required']
    },
    taggableId: { 
        type: Schema.Types.ObjectId, 
        required: [true, 'Taggable ID is required']
    },
    addedBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    }
}, {
    timestamps: true
});

/**
 * Attachment Schema - Polymorphic Association
 * Files can be attached to different types of entities
 */
const AttachmentPolymorphicSchema = new Schema({
    filename: { 
        type: String, 
        required: [true, 'Filename is required'],
        trim: true
    },
    originalName: { 
        type: String, 
        required: [true, 'Original filename is required'],
        trim: true
    },
    mimeType: { 
        type: String, 
        required: [true, 'MIME type is required']
    },
    size: { 
        type: Number, 
        required: [true, 'File size is required'],
        min: [0, 'File size cannot be negative']
    },
    path: { 
        type: String, 
        required: [true, 'File path is required']
    },
    url: { 
        type: String, 
        required: [true, 'File URL is required']
    },
    // Polymorphic reference fields
    attachableType: { 
        type: String, 
        enum: ['Post', 'Product', 'Article', 'Video', 'Photo', 'Event', 'User'],
        required: [true, 'Attachable type is required']
    },
    attachableId: { 
        type: Schema.Types.ObjectId, 
        required: [true, 'Attachable ID is required']
    },
    uploadedBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'Uploader reference is required']
    },
    metadata: {
        width: Number,
        height: Number,
        duration: Number, // for videos/audio
        thumbnail: String,
        alt: String,
        caption: String
    },
    isPublic: { 
        type: Boolean, 
        default: true 
    }
}, {
    timestamps: true
});

// ============================================================================
// INDEXES FOR PERFORMANCE (using utility functions)
// ============================================================================

// Comment indexes
// Compound index for polymorphic reference (using utility)
const commentPolymorphicIndex = indexes.compound(['commentableType', 'commentableId', 'createdAt'], { background: true });
CommentPolymorphicSchema.index(commentPolymorphicIndex.fields, commentPolymorphicIndex.options);

// Compound index for parent and creation date (using utility)
const commentParentIndex = indexes.compound(['parent', 'createdAt'], { background: true });
CommentPolymorphicSchema.index(commentParentIndex.fields, commentParentIndex.options);

// Index for author email
CommentPolymorphicSchema.index({ 'author.email': 1 });

// Compound index for approval and spam status (using utility)
const commentStatusIndex = indexes.compound(['isApproved', 'isSpam'], { background: true });
CommentPolymorphicSchema.index(commentStatusIndex.fields, commentStatusIndex.options);

// Like indexes
// Unique compound index to prevent duplicate likes (using utility)
const likeUniqueIndex = indexes.uniqueCompound(['likeableType', 'likeableId', 'user']);
LikePolymorphicSchema.index(likeUniqueIndex.fields, likeUniqueIndex.options);

// Compound index for user and likeable type (using utility)
const likeUserIndex = indexes.compound(['user', 'likeableType'], { background: true });
LikePolymorphicSchema.index(likeUserIndex.fields, likeUserIndex.options);

// Compound index for likeable reference (using utility)
const likeableIndex = indexes.compound(['likeableType', 'likeableId'], { background: true });
LikePolymorphicSchema.index(likeableIndex.fields, likeableIndex.options);

// Compound index for active status and usage count (using utility)
const tagActiveIndex = indexes.compound(['isActive', 'usageCount'], { background: true });
TagPolymorphicSchema.index(tagActiveIndex.fields, tagActiveIndex.options);

// TagAssociation indexes
// Compound index for taggable reference (using utility)
const taggableIndex = indexes.compound(['taggableType', 'taggableId'], { background: true });
TagAssociationSchema.index(taggableIndex.fields, taggableIndex.options);

// Compound index for tag and taggable type (using utility)
const tagTypeIndex = indexes.compound(['tag', 'taggableType'], { background: true });
TagAssociationSchema.index(tagTypeIndex.fields, tagTypeIndex.options);

// Unique compound index for tag and taggable ID (using utility)
const tagUniqueIndex = indexes.uniqueCompound(['tag', 'taggableId']);
TagAssociationSchema.index(tagUniqueIndex.fields, tagUniqueIndex.options);

// Attachment indexes
// Compound index for attachable reference (using utility)
const attachableIndex = indexes.compound(['attachableType', 'attachableId'], { background: true });
AttachmentPolymorphicSchema.index(attachableIndex.fields, attachableIndex.options);

// Compound index for uploader and attachable type (using utility)
const uploaderIndex = indexes.compound(['uploadedBy', 'attachableType'], { background: true });
AttachmentPolymorphicSchema.index(uploaderIndex.fields, uploaderIndex.options);

// Index for MIME type
AttachmentPolymorphicSchema.index({ mimeType: 1 });

// ============================================================================
// VIRTUAL FIELDS (using utility functions)
// ============================================================================

/**
 * Virtual field for comment's replies (using utility)
 */
const commentRepliesVirtual = virtuals.createReverseRelationship('_id', 'parent', 'CommentPolymorphic');
CommentPolymorphicSchema.virtual('replies', commentRepliesVirtual);

/**
 * Virtual field for comment's likes (using utility)
 */
const commentLikesVirtual = virtuals.createReverseRelationship('_id', 'likeableId', 'LikePolymorphic');
commentLikesVirtual.match = { likeableType: 'Comment' };
CommentPolymorphicSchema.virtual('likeRecords', commentLikesVirtual);

/**
 * Virtual field for tag's associations (using utility)
 */
const tagAssociationsVirtual = virtuals.createReverseRelationship('_id', 'tag', 'TagAssociation');
TagPolymorphicSchema.virtual('associations', tagAssociationsVirtual);

/**
 * Virtual field for attachment's file extension
 */
AttachmentPolymorphicSchema.virtual('extension').get(function() {
    return this.originalName.split('.').pop().toLowerCase();
});

/**
 * Virtual field for human-readable file size
 */
AttachmentPolymorphicSchema.virtual('humanSize').get(function() {
    const bytes = this.size;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Get comment with replies
 */
CommentPolymorphicSchema.methods.withReplies = function() {
    return this.populate('replies');
};

/**
 * Like a comment
 */
CommentPolymorphicSchema.methods.like = function() {
    this.likes += 1;
    return this.save();
};

/**
 * Dislike a comment
 */
CommentPolymorphicSchema.methods.dislike = function() {
    this.dislikes += 1;
    return this.save();
};

/**
 * Get the entity this comment belongs to
 */
CommentPolymorphicSchema.methods.getCommentableEntity = async function() {
    const modelName = this.commentableType;
    const Model = mongoose.model(modelName);
    return Model.findById(this.commentableId);
};

/**
 * Add tag to entity
 */
TagPolymorphicSchema.methods.addToEntity = async function(entityType, entityId, userId) {
    const TagAssociation = mongoose.model('TagAssociation');
    
    // Check if association already exists
    const existing = await TagAssociation.findOne({
        tag: this._id,
        taggableType: entityType,
        taggableId: entityId
    });
    
    if (!existing) {
        await TagAssociation.create({
            tag: this._id,
            taggableType: entityType,
            taggableId: entityId,
            addedBy: userId
        });
        
        this.usageCount += 1;
        await this.save();
    }
    
    return this;
};

/**
 * Remove tag from entity
 */
TagPolymorphicSchema.methods.removeFromEntity = async function(entityType, entityId) {
    const TagAssociation = mongoose.model('TagAssociation');
    
    const association = await TagAssociation.findOneAndDelete({
        tag: this._id,
        taggableType: entityType,
        taggableId: entityId
    });
    
    if (association) {
        this.usageCount = Math.max(0, this.usageCount - 1);
        await this.save();
    }
    
    return this;
};

/**
 * Get entities tagged with this tag
 */
TagPolymorphicSchema.methods.getTaggedEntities = async function(entityType) {
    const TagAssociation = mongoose.model('TagAssociation');
    const associations = await TagAssociation.find({
        tag: this._id,
        taggableType: entityType
    });
    
    const entityIds = associations.map(assoc => assoc.taggableId);
    const Model = mongoose.model(entityType);
    return Model.find({ _id: { $in: entityIds } });
};

// ============================================================================
// STATIC METHODS (using utility functions)
// ============================================================================

/**
 * Find comments for a specific entity
 */
CommentPolymorphicSchema.statics.findForEntity = function(entityType, entityId, options = {}) {
    const { page = 1, limit = 10, approved = true } = options;
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    
    const query = {
        commentableType: entityType,
        commentableId: entityId,
        parent: null // Only top-level comments
    };
    
    if (approved) {
        query.isApproved = true;
        query.isSpam = false;
    }
    
    return this.find(query)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(queryLimit)
        .populate('replies');
};

/**
 * Find likes for a specific entity
 */
LikePolymorphicSchema.statics.findForEntity = function(entityType, entityId) {
    return this.find({
        likeableType: entityType,
        likeableId: entityId
    }).populate('user', 'name email');
};

/**
 * Get like count for entity
 */
LikePolymorphicSchema.statics.getLikeCount = function(entityType, entityId) {
    return this.countDocuments({
        likeableType: entityType,
        likeableId: entityId
    });
};

/**
 * Check if user liked entity
 */
LikePolymorphicSchema.statics.hasUserLiked = function(userId, entityType, entityId) {
    return this.findOne({
        user: userId,
        likeableType: entityType,
        likeableId: entityId
    });
};

/**
 * Find tags for a specific entity
 */
TagAssociationSchema.statics.findForEntity = function(entityType, entityId) {
    return this.find({
        taggableType: entityType,
        taggableId: entityId
    }).populate('tag');
};

/**
 * Find entities by tag
 */
TagAssociationSchema.statics.findByTag = function(tagId, entityType) {
    return this.find({
        tag: tagId,
        taggableType: entityType
    });
};

/**
 * Find attachments for a specific entity
 */
AttachmentPolymorphicSchema.statics.findForEntity = function(entityType, entityId) {
    return this.find({
        attachableType: entityType,
        attachableId: entityId
    }).populate('uploadedBy', 'name email');
};

/**
 * Find popular tags
 */
TagPolymorphicSchema.statics.findPopular = function(limit = 20) {
    return this.find({ isActive: true })
        .sort({ usageCount: -1 })
        .limit(limit);
};

/**
 * Search tags by name
 */
TagPolymorphicSchema.statics.search = function(query, limit = 10) {
    return this.find({
        name: { $regex: query, $options: 'i' },
        isActive: true
    })
    .sort({ usageCount: -1 })
    .limit(limit);
};

/**
 * Get polymorphic statistics (using aggregation utility)
 */
CommentPolymorphicSchema.statics.getPolymorphicStats = function() {
    return this.aggregate([
        aggregation.group('$commentableType', {
            count: { $sum: 1 },
            approved: {
                $sum: { $cond: ['$isApproved', 1, 0] }
            },
            pending: {
                $sum: { 
                    $cond: [
                        { $and: [
                            { $not: '$isApproved' },
                            { $not: '$isSpam' }
                        ]}, 
                        1, 
                        0
                    ]
                }
            },
            spam: {
                $sum: { $cond: ['$isSpam', 1, 0] }
            }
        })
    ]);
};

/**
 * Find comments with pagination (using utility functions)
 */
CommentPolymorphicSchema.statics.findWithPagination = function(page = 1, limit = 10, filters = {}) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find(filters)
        .skip(skip)
        .limit(queryLimit);
};

/**
 * Find tags with projection (using utility functions)
 */
TagPolymorphicSchema.statics.findWithProjection = function(filters = {}, fields = ['name', 'description', 'usageCount', 'color']) {
    const projection = queryOptimization.projection(fields);
    return this.find(filters, projection);
};

// ============================================================================
// PRE/POST MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware for Comment - set level
 */
CommentPolymorphicSchema.pre('save', async function(next) {
    if (this.isModified('parent')) {
        if (this.parent) {
            const parentComment = await mongoose.model('CommentPolymorphic').findById(this.parent);
            if (parentComment) {
                this.level = parentComment.level + 1;
            }
        } else {
            this.level = 0;
        }
    }
    next();
});

/**
 * Pre-save middleware for Tag - normalize name
 */
TagPolymorphicSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.name = this.name.toLowerCase().trim();
    }
    next();
});

/**
 * Post-save middleware for Comment
 */
CommentPolymorphicSchema.post('save', function(doc) {
    console.log(`Comment saved for ${doc.commentableType} ${doc.commentableId}`);
});

/**
 * Post-save middleware for Like
 */
LikePolymorphicSchema.post('save', function(doc) {
    console.log(`Like saved for ${doc.likeableType} ${doc.likeableId}`);
});

/**
 * Post-save middleware for Tag
 */
TagPolymorphicSchema.post('save', function(doc) {
    console.log(`Tag ${doc.name} saved with usage count ${doc.usageCount}`);
});

// ============================================================================
// EXPORT MODELS
// ============================================================================

export const CommentPolymorphic = mongoose.model('CommentPolymorphic', CommentPolymorphicSchema);
export const LikePolymorphic = mongoose.model('LikePolymorphic', LikePolymorphicSchema);
export const TagPolymorphic = mongoose.model('TagPolymorphic', TagPolymorphicSchema);
export const TagAssociation = mongoose.model('TagAssociation', TagAssociationSchema);
export const AttachmentPolymorphic = mongoose.model('AttachmentPolymorphic', AttachmentPolymorphicSchema);
