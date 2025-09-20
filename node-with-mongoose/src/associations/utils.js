import mongoose from 'mongoose';

// ============================================================================
// SHARED UTILITIES FOR ASSOCIATIONS
// ============================================================================

/**
 * Common validation functions for associations
 */
export const validators = {
    /**
     * Validates that a referenced document exists
     */
    async validateReference(model, fieldName) {
        return {
            validator: async function(value) {
                if (!value) return true; // Allow null/undefined
                const doc = await model.findById(value);
                return doc !== null;
            },
            message: `${fieldName} must reference an existing document`
        };
    },

    /**
     * Validates that an array of references all exist
     */
    async validateReferenceArray(model, fieldName) {
        return {
            validator: async function(values) {
                if (!values || values.length === 0) return true;
                const docs = await model.find({ _id: { $in: values } });
                return docs.length === values.length;
            },
            message: `All ${fieldName} must reference existing documents`
        };
    }
};

/**
 * Common virtual field configurations
 */
export const virtuals = {
    /**
     * Creates a virtual field for reverse one-to-many relationship
     */
    createReverseRelationship(localField, foreignField, ref, options = {}) {
        return {
            ref,
            localField,
            foreignField,
            ...options
        };
    },

    /**
     * Creates a virtual field for counting related documents
     */
    createCountField(localField, foreignField, ref) {
        return {
            ref,
            localField,
            foreignField,
            count: true
        };
    }
};

/**
 * Common index configurations
 */
export const indexes = {
    /**
     * Creates a compound index for efficient queries
     */
    compound(fields, options = {}) {
        return { fields, options };
    },

    /**
     * Creates a unique compound index
     */
    uniqueCompound(fields) {
        return { fields, options: { unique: true } };
    },

    /**
     * Creates a sparse index (ignores null values)
     */
    sparse(fields, options = {}) {
        return { fields, options: { ...options, sparse: true } };
    }
};

/**
 * Sample data creation utilities
 */
export const sampleData = {
    /**
     * Creates sample authors for testing
     */
    async createAuthors() {
        const Author = mongoose.model('Author');
        return await Author.create([
            {
                name: 'John Doe',
                email: 'john@example.com',
                bio: 'Technology writer and blogger'
            },
            {
                name: 'Jane Smith',
                email: 'jane@example.com',
                bio: 'Fiction author and storyteller'
            },
            {
                name: 'Bob Johnson',
                email: 'bob@example.com',
                bio: 'Technical documentation specialist'
            }
        ]);
    },

    /**
     * Creates sample students for testing
     */
    async createStudents() {
        const Student = mongoose.model('Student');
        return await Student.create([
            {
                name: 'Alice Johnson',
                email: 'alice@university.edu'
            },
            {
                name: 'Bob Wilson',
                email: 'bob@university.edu'
            },
            {
                name: 'Charlie Brown',
                email: 'charlie@university.edu'
            }
        ]);
    },

    /**
     * Creates sample courses for testing
     */
    async createCourses() {
        const Course = mongoose.model('Course');
        return await Course.create([
            {
                title: 'Database Systems',
                description: 'Learn about database design and implementation',
                credits: 3,
                instructor: 'Dr. Smith'
            },
            {
                title: 'Web Development',
                description: 'Full-stack web development with modern frameworks',
                credits: 4,
                instructor: 'Prof. Brown'
            },
            {
                title: 'Data Structures',
                description: 'Advanced data structures and algorithms',
                credits: 3,
                instructor: 'Dr. Davis'
            }
        ]);
    }
};

/**
 * Query optimization utilities
 */
export const queryOptimization = {
    /**
     * Creates a projection object for limiting returned fields
     */
    projection(fields) {
        const projection = {};
        fields.forEach(field => {
            projection[field] = 1;
        });
        return projection;
    },

    /**
     * Creates a sort object for ordering results
     */
    sort(fields) {
        const sort = {};
        fields.forEach(field => {
            if (field.startsWith('-')) {
                sort[field.substring(1)] = -1;
            } else {
                sort[field] = 1;
            }
        });
        return sort;
    },

    /**
     * Creates pagination parameters
     */
    pagination(page = 1, limit = 10) {
        return {
            skip: (page - 1) * limit,
            limit: limit
        };
    }
};

/**
 * Error handling utilities
 */
export const errorHandling = {
    /**
     * Checks if error is a duplicate key error
     */
    isDuplicateKeyError(error) {
        return error.code === 11000;
    },

    /**
     * Checks if error is a validation error
     */
    isValidationError(error) {
        return error.name === 'ValidationError';
    },

    /**
     * Extracts validation error messages
     */
    getValidationMessages(error) {
        if (!this.isValidationError(error)) return [];
        return Object.values(error.errors).map(err => err.message);
    }
};

/**
 * Aggregation pipeline builders
 */
export const aggregation = {
    /**
     * Creates a lookup stage for joining collections
     */
    lookup(from, localField, foreignField, as) {
        return {
            $lookup: {
                from,
                localField,
                foreignField,
                as
            }
        };
    },

    /**
     * Creates a match stage for filtering
     */
    match(criteria) {
        return { $match: criteria };
    },

    /**
     * Creates a group stage for aggregation
     */
    group(id, accumulators) {
        return {
            $group: {
                _id: id,
                ...accumulators
            }
        };
    },

    /**
     * Creates a project stage for field selection
     */
    project(fields) {
        return { $project: fields };
    },

    /**
     * Creates a sort stage for ordering
     */
    sort(fields) {
        return { $sort: fields };
    },

    /**
     * Creates a limit stage
     */
    limit(count) {
        return { $limit: count };
    },

    /**
     * Creates a skip stage
     */
    skip(count) {
        return { $skip: count };
    }
};
