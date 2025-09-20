// ============================================================================
// ASSOCIATIONS INDEX - EXPORT ALL MODELS AND UTILITIES
// ============================================================================

// One-to-One Relationships
export { UserWithEmbeddedAddress } from './one-to-one-embedded.js';
export { UserWithReference, Profile } from './one-to-one-references.js';

// One-to-Many Relationships
export { Author, Post } from './one-to-many-references.js';
export { BlogPost } from './one-to-many-embedded.js';

// Many-to-Many Relationships
export { Student, Course, Enrollment } from './many-to-many-junction.js';
export { Author as BookAuthor, Book } from './many-to-many-embedded.js';

// Advanced Patterns
export { Category, Comment, Employee } from './self-referencing.js';
export { 
    CommentPolymorphic, 
    LikePolymorphic, 
    TagPolymorphic, 
    TagAssociation, 
    AttachmentPolymorphic 
} from './polymorphic.js';

// Utilities
export * from './utils.js';

// ============================================================================
// CONVENIENCE EXPORTS BY CATEGORY
// ============================================================================

// One-to-One Models
export const OneToOneModels = {
    UserWithEmbeddedAddress,
    UserWithReference,
    Profile
};

// One-to-Many Models
export const OneToManyModels = {
    Author,
    Post,
    BlogPost
};

// Many-to-Many Models
export const ManyToManyModels = {
    Student,
    Course,
    Enrollment,
    BookAuthor,
    Book
};

// Advanced Pattern Models
export const AdvancedModels = {
    Category,
    Comment,
    Employee,
    CommentPolymorphic,
    LikePolymorphic,
    TagPolymorphic,
    TagAssociation,
    AttachmentPolymorphic
};

// All Models
export const AllModels = {
    ...OneToOneModels,
    ...OneToManyModels,
    ...ManyToManyModels,
    ...AdvancedModels
};

// ============================================================================
// MODEL CATEGORIES FOR EASY REFERENCE
// ============================================================================

export const ModelCategories = {
    'one-to-one': {
        embedded: ['UserWithEmbeddedAddress'],
        references: ['UserWithReference', 'Profile']
    },
    'one-to-many': {
        references: ['Author', 'Post'],
        embedded: ['BlogPost']
    },
    'many-to-many': {
        junction: ['Student', 'Course', 'Enrollment'],
        embedded: ['BookAuthor', 'Book']
    },
    'advanced': {
        selfReferencing: ['Category', 'Comment', 'Employee'],
        polymorphic: ['CommentPolymorphic', 'LikePolymorphic', 'TagPolymorphic', 'TagAssociation', 'AttachmentPolymorphic']
    }
};

// ============================================================================
// QUICK ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all models by category
 */
export const getModelsByCategory = (category) => {
    return ModelCategories[category] || {};
};

/**
 * Get all models by association type
 */
export const getModelsByAssociationType = (type) => {
    const models = [];
    Object.values(ModelCategories).forEach(category => {
        if (category[type]) {
            models.push(...category[type]);
        }
    });
    return models;
};

/**
 * Get model by name
 */
export const getModelByName = (name) => {
    return AllModels[name];
};

/**
 * Get all model names
 */
export const getAllModelNames = () => {
    return Object.keys(AllModels);
};
