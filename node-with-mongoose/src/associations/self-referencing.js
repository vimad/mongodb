import mongoose from 'mongoose';
import { validators, virtuals, indexes, queryOptimization, aggregation, errorHandling } from './utils.js';
const Schema = mongoose.Schema;

// ============================================================================
// SELF-REFERENCING RELATIONSHIPS (TREE STRUCTURES)
// ============================================================================

/**
 * Category Schema - Self-Referencing Tree Structure
 * Categories can have parent categories and child categories
 */
const CategorySchema = new Schema({
    name: { 
        type: String, 
        required: [true, 'Category name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        trim: true
    },
    parent: { 
        type: Schema.Types.ObjectId, 
        ref: 'Category',
        default: null
    },
    level: {
        type: Number,
        default: 0,
        min: [0, 'Level cannot be negative']
    },
    path: {
        type: String,
        default: '',
        index: true
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    metadata: {
        icon: { type: String, trim: true },
        color: { 
            type: String, 
            match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'],
            default: '#000000'
        },
        image: { type: String, trim: true },
        seoTitle: { type: String, trim: true },
        seoDescription: { type: String, trim: true }
    },
    statistics: {
        productCount: { type: Number, default: 0 },
        subcategoryCount: { type: Number, default: 0 },
        totalProductCount: { type: Number, default: 0 } // Including all descendants
    }
}, {
    timestamps: true
});

/**
 * Comment Schema - Self-Referencing for Nested Comments
 * Comments can have parent comments (replies) and child comments
 */
const CommentSchema = new Schema({
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
        avatar: { type: String, trim: true }
    },
    parent: { 
        type: Schema.Types.ObjectId, 
        ref: 'Comment',
        default: null
    },
    level: {
        type: Number,
        default: 0,
        min: [0, 'Level cannot be negative'],
        max: [5, 'Maximum nesting level is 5']
    },
    path: {
        type: String,
        default: '',
        index: true
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
    replies: { 
        type: Number, 
        default: 0 
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        editedAt: Date,
        editCount: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

/**
 * Employee Schema - Self-Referencing for Organizational Hierarchy
 * Employees can have managers (parent) and subordinates (children)
 */
const EmployeeSchema = new Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        unique: true,
        match: [/^EMP\d{6}$/, 'Employee ID must be in format EMP######']
    },
    personalInfo: {
        firstName: { 
            type: String, 
            required: [true, 'First name is required'],
            trim: true
        },
        lastName: { 
            type: String, 
            required: [true, 'Last name is required'],
            trim: true
        },
        email: { 
            type: String, 
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true
        },
        phone: {
            type: String,
            match: [/^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/, 'Please enter a valid phone number']
        },
        dateOfBirth: Date
    },
    workInfo: {
        title: { 
            type: String, 
            required: [true, 'Job title is required'],
            trim: true
        },
        department: { 
            type: String, 
            required: [true, 'Department is required'],
            trim: true
        },
        level: { 
            type: Number, 
            required: [true, 'Level is required'],
            min: [1, 'Level must be at least 1'],
            max: [10, 'Level cannot exceed 10']
        },
        salary: { 
            type: Number, 
            min: [0, 'Salary cannot be negative']
        },
        hireDate: { 
            type: Date, 
            required: [true, 'Hire date is required'],
            default: Date.now
        }
    },
    manager: { 
        type: Schema.Types.ObjectId, 
        ref: 'Employee',
        default: null
    },
    level: {
        type: Number,
        default: 0
    },
    path: {
        type: String,
        default: '',
        index: true
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    subordinates: { 
        type: Number, 
        default: 0 
    }
}, {
    timestamps: true
});

// ============================================================================
// INDEXES FOR PERFORMANCE (using utility functions)
// ============================================================================

// Category indexes
// Compound index for parent and sort order (using utility)
const categoryParentIndex = indexes.compound(['parent', 'sortOrder'], { background: true });
CategorySchema.index(categoryParentIndex.fields, categoryParentIndex.options);

// Compound index for level and active status (using utility)
const categoryLevelIndex = indexes.compound(['level', 'isActive'], { background: true });
CategorySchema.index(categoryLevelIndex.fields, categoryLevelIndex.options);


// Comment indexes
// Compound index for parent and creation date (using utility)
const commentParentIndex = indexes.compound(['parent', 'createdAt'], { background: true });
CommentSchema.index(commentParentIndex.fields, commentParentIndex.options);


// Compound index for level and approval status (using utility)
const commentLevelIndex = indexes.compound(['level', 'isApproved'], { background: true });
CommentSchema.index(commentLevelIndex.fields, commentLevelIndex.options);

// Index for author email
CommentSchema.index({ 'author.email': 1 });

// Employee indexes
// Compound index for manager and level (using utility)
const employeeManagerIndex = indexes.compound(['manager', 'level'], { background: true });
EmployeeSchema.index(employeeManagerIndex.fields, employeeManagerIndex.options);

// Compound index for department and work level (using utility)
const employeeDeptIndex = indexes.compound(['workInfo.department', 'workInfo.level'], { background: true });
EmployeeSchema.index(employeeDeptIndex.fields, employeeDeptIndex.options);

// ============================================================================
// VIRTUAL FIELDS (using utility functions)
// ============================================================================

/**
 * Virtual field for category's children (using utility)
 */
const categoryChildrenVirtual = virtuals.createReverseRelationship('_id', 'parent', 'Category');
CategorySchema.virtual('children', categoryChildrenVirtual);

/**
 * Virtual field for comment's replies (using utility)
 */
const commentRepliesVirtual = virtuals.createReverseRelationship('_id', 'parent', 'Comment');
CommentSchema.virtual('replyRecords', commentRepliesVirtual);

/**
 * Virtual field for employee's subordinates (using utility)
 */
const employeeSubordinatesVirtual = virtuals.createReverseRelationship('_id', 'manager', 'Employee');
EmployeeSchema.virtual('subordinateRecords', employeeSubordinatesVirtual);

/**
 * Virtual field for category's full path
 */
CategorySchema.virtual('fullPath').get(function() {
    return this.path ? this.path.split('/').filter(Boolean) : [];
});

/**
 * Virtual field for employee's full name
 */
EmployeeSchema.virtual('fullName').get(function() {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Get category with all children
 */
CategorySchema.methods.withChildren = function() {
    return this.populate('children');
};

/**
 * Get category's full hierarchy path
 */
CategorySchema.methods.getHierarchyPath = async function() {
    const path = [];
    let current = this;
    
    while (current) {
        path.unshift(current.name);
        if (current.parent) {
            current = await mongoose.model('Category').findById(current.parent);
        } else {
            current = null;
        }
    }
    
    return path;
};

/**
 * Get all descendants of a category
 */
CategorySchema.methods.getDescendants = async function() {
    const descendants = [];
    
    const findChildren = async (categoryId) => {
        const children = await mongoose.model('Category').find({ parent: categoryId });
        for (const child of children) {
            descendants.push(child);
            await findChildren(child._id);
        }
    };
    
    await findChildren(this._id);
    return descendants;
};

/**
 * Get all ancestors of a category
 */
CategorySchema.methods.getAncestors = async function() {
    const ancestors = [];
    let current = this;
    
    while (current.parent) {
        current = await mongoose.model('Category').findById(current.parent);
        if (current) {
            ancestors.unshift(current);
        }
    }
    
    return ancestors;
};

/**
 * Move category to new parent
 */
CategorySchema.methods.moveToParent = async function(newParentId) {
    const Category = mongoose.model('Category');
    
    // Prevent moving to self or descendant
    if (newParentId && newParentId.toString() === this._id.toString()) {
        throw new Error('Cannot move category to itself');
    }
    
    if (newParentId) {
        const newParent = await Category.findById(newParentId);
        if (!newParent) {
            throw new Error('New parent category not found');
        }
        
        // Check if new parent is a descendant
        const descendants = await this.getDescendants();
        if (descendants.some(desc => desc._id.toString() === newParentId.toString())) {
            throw new Error('Cannot move category to its descendant');
        }
    }
    
    this.parent = newParentId;
    await this.save();
    await this.updatePath();
    
    // Update all descendants' paths
    const descendants = await this.getDescendants();
    for (const descendant of descendants) {
        await descendant.updatePath();
    }
};

/**
 * Update category path
 */
CategorySchema.methods.updatePath = async function() {
    const Category = mongoose.model('Category');
    const ancestors = await this.getAncestors();
    this.path = ancestors.map(ancestor => ancestor._id.toString()).join('/');
    this.level = ancestors.length;
    return this.save();
};

/**
 * Get comment with all replies
 */
CommentSchema.methods.withReplies = function() {
    return this.populate('replies');
};

/**
 * Get comment's full thread path
 */
CommentSchema.methods.getThreadPath = async function() {
    const path = [];
    let current = this;
    
    while (current) {
        path.unshift(current._id.toString());
        if (current.parent) {
            current = await mongoose.model('Comment').findById(current.parent);
        } else {
            current = null;
        }
    }
    
    return path;
};

/**
 * Like a comment
 */
CommentSchema.methods.like = function() {
    this.likes += 1;
    return this.save();
};

/**
 * Dislike a comment
 */
CommentSchema.methods.dislike = function() {
    this.dislikes += 1;
    return this.save();
};

/**
 * Get employee with subordinates
 */
EmployeeSchema.methods.withSubordinates = function() {
    return this.populate('subordinates');
};

/**
 * Get employee's management chain
 */
EmployeeSchema.methods.getManagementChain = async function() {
    const chain = [];
    let current = this;
    
    while (current.manager) {
        current = await mongoose.model('Employee').findById(current.manager);
        if (current) {
            chain.unshift(current);
        }
    }
    
    return chain;
};

/**
 * Get all subordinates (recursive)
 */
EmployeeSchema.methods.getAllSubordinates = async function() {
    const subordinates = [];
    
    const findSubordinates = async (employeeId) => {
        const directSubordinates = await mongoose.model('Employee').find({ manager: employeeId });
        for (const subordinate of directSubordinates) {
            subordinates.push(subordinate);
            await findSubordinates(subordinate._id);
        }
    };
    
    await findSubordinates(this._id);
    return subordinates;
};

// ============================================================================
// STATIC METHODS (using utility functions)
// ============================================================================

/**
 * Get category tree structure (using aggregation utility)
 */
CategorySchema.statics.getTree = function() {
    return this.aggregate([
        aggregation.match({ isActive: true }),
        {
            $graphLookup: {
                from: 'categories',
                startWith: '$_id',
                connectFromField: '_id',
                connectToField: 'parent',
                as: 'children',
                maxDepth: 10
            }
        },
        aggregation.match({
            parent: null
        }),
        aggregation.sort({ sortOrder: 1, name: 1 })
    ]);
};

/**
 * Get comments in thread format
 */
CommentSchema.statics.getThread = function(parentId = null) {
    return this.find({ parent: parentId, isApproved: true })
        .sort({ isPinned: -1, createdAt: 1 })
        .populate('replies');
};

/**
 * Get organizational chart (using aggregation utility)
 */
EmployeeSchema.statics.getOrgChart = function() {
    return this.aggregate([
        aggregation.match({ isActive: true }),
        {
            $graphLookup: {
                from: 'employees',
                startWith: '$_id',
                connectFromField: '_id',
                connectToField: 'manager',
                as: 'subordinates',
                maxDepth: 10
            }
        },
        aggregation.match({
            manager: null
        }),
        aggregation.sort({ 'workInfo.level': 1, 'personalInfo.firstName': 1 })
    ]);
};

/**
 * Find employees by department
 */
EmployeeSchema.statics.findByDepartment = function(department) {
    return this.find({ 
        'workInfo.department': department,
        isActive: true 
    }).populate('manager', 'personalInfo.firstName personalInfo.lastName workInfo.title');
};

/**
 * Get category statistics (using aggregation utility)
 */
CategorySchema.statics.getCategoryStats = function() {
    return this.aggregate([
        aggregation.group('null', {
            totalCategories: { $sum: 1 },
            rootCategories: {
                $sum: { $cond: [{ $eq: ['$parent', null] }, 1, 0] }
            },
            leafCategories: {
                $sum: { $cond: [{ $eq: ['$statistics.subcategoryCount', 0] }, 1, 0] }
            },
            averageLevel: { $avg: '$level' },
            maxLevel: { $max: '$level' }
        })
    ]);
};

/**
 * Find categories with pagination (using utility functions)
 */
CategorySchema.statics.findWithPagination = function(page = 1, limit = 10, filters = {}) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find(filters)
        .skip(skip)
        .limit(queryLimit);
};

/**
 * Find comments with projection (using utility functions)
 */
CommentSchema.statics.findWithProjection = function(filters = {}, fields = ['content', 'author', 'createdAt', 'likes']) {
    const projection = queryOptimization.projection(fields);
    return this.find(filters, projection);
};

// ============================================================================
// PRE/POST MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware for Category - generate slug
 */
CategorySchema.pre('save', function(next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

/**
 * Pre-save middleware for Comment - set level and path
 */
CommentSchema.pre('save', async function(next) {
    if (this.isModified('parent')) {
        if (this.parent) {
            const parentComment = await mongoose.model('Comment').findById(this.parent);
            if (parentComment) {
                this.level = parentComment.level + 1;
                this.path = parentComment.path ? `${parentComment.path}/${parentComment._id}` : parentComment._id.toString();
            }
        } else {
            this.level = 0;
            this.path = '';
        }
    }
    next();
});

/**
 * Pre-save middleware for Employee - set level and path
 */
EmployeeSchema.pre('save', async function(next) {
    if (this.isModified('manager')) {
        if (this.manager) {
            const manager = await mongoose.model('Employee').findById(this.manager);
            if (manager) {
                this.level = manager.level + 1;
                this.path = manager.path ? `${manager.path}/${manager._id}` : manager._id.toString();
            }
        } else {
            this.level = 0;
            this.path = '';
        }
    }
    next();
});

/**
 * Post-save middleware for Category
 */
CategorySchema.post('save', function(doc) {
    console.log(`Category ${doc.name} saved at level ${doc.level}`);
});

/**
 * Post-save middleware for Comment
 */
CommentSchema.post('save', function(doc) {
    console.log(`Comment saved at level ${doc.level}`);
});

/**
 * Post-save middleware for Employee
 */
EmployeeSchema.post('save', function(doc) {
    console.log(`Employee ${doc.fullName} saved at level ${doc.level}`);
});

// ============================================================================
// EXPORT MODELS
// ============================================================================

export const Category = mongoose.model('Category', CategorySchema);
export const Comment = mongoose.model('Comment', CommentSchema);
export const Employee = mongoose.model('Employee', EmployeeSchema);
