import mongoose from 'mongoose';
import { validators, virtuals, indexes, queryOptimization, errorHandling } from './utils.js';
const Schema = mongoose.Schema;

// ============================================================================
// ONE-TO-ONE RELATIONSHIPS - REFERENCES APPROACH
// ============================================================================

/**
 * User Schema (Parent Document)
 * This approach uses references to link related documents
 * Best for: Large data, independent querying, referential integrity
 */
const UserWithReferenceSchema = new Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
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
    phone: {
        type: String,
        match: [/^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/, 'Please enter a valid phone number']
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date
}, {
    timestamps: true
});

/**
 * Profile Schema (Child Document)
 * Contains detailed user information referenced by User
 */
const ProfileSchema = new Schema({
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        trim: true
    },
    website: {
        type: String,
        match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
        trim: true
    },
    dateOfBirth: {
        type: Date,
        validate: {
            validator: function(date) {
                return date < new Date();
            },
            message: 'Date of birth must be in the past'
        }
    },
    location: {
        city: { type: String, trim: true },
        country: { type: String, trim: true },
        timezone: { type: String, trim: true }
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
        github: {
            type: String,
            match: [/^[A-Za-z0-9-]+$/, 'Please enter a valid GitHub username'],
            trim: true
        }
    },
    preferences: {
        theme: { 
            type: String, 
            enum: ['light', 'dark', 'auto'], 
            default: 'auto' 
        },
        language: { 
            type: String, 
            default: 'en',
            match: [/^[a-z]{2}(-[A-Z]{2})?$/, 'Please enter a valid language code']
        },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        }
    },
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'UserWithReference', 
        required: [true, 'User reference is required'],
        unique: true, // Ensures one-to-one relationship
        validate: {
            validator: async function (value) {
                const userExists = await mongoose.model('UserWithReference').exists({ _id: value });
                return !!userExists;
            },
            message: 'Referenced user does not exist'
        }
    }
}, {
    // timestamp fields are added automatically by Mongoose
    timestamps: true
});

// ============================================================================
// INDEXES FOR PERFORMANCE (using utility functions)
// ============================================================================

// User indexes
UserWithReferenceSchema.index({ email: 1 });

// Compound index for user queries (using utility)
// index will build in background
const userActiveIndex = indexes.compound(['isActive', 'lastLoginAt'], { background: true });
UserWithReferenceSchema.index(userActiveIndex.fields, userActiveIndex.options);

// Profile indexes
ProfileSchema.index({ user: 1 }, { unique: true }); // Unique index for one-to-one

// Compound index for location queries (using utility)
const locationIndex = indexes.compound(['location.city', 'location.country']);
ProfileSchema.index(locationIndex.fields, locationIndex.options);

// Sparse indexes for social media (using utility)
const twitterIndex = indexes.sparse(['socialMedia.twitter']);
ProfileSchema.index(twitterIndex.fields, twitterIndex.options);

const githubIndex = indexes.sparse(['socialMedia.github']);
ProfileSchema.index(githubIndex.fields, githubIndex.options);

// ============================================================================
// VIRTUAL FIELDS (using utility functions)
// ============================================================================

/**
 * Virtual field to populate profile (using utility)
 */
const profileVirtual = virtuals.createReverseRelationship('_id', 'user', 'Profile', { justOne: true });
UserWithReferenceSchema.virtual('profile', profileVirtual);

/**
 * Virtual field for user's age
 */
ProfileSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
});

/**
 * Virtual field for full location
 */
ProfileSchema.virtual('fullLocation').get(function() {
    if (!this.location) return null;
    const { city, country } = this.location;
    return city && country ? `${city}, ${country}` : city || country;
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Get user with populated profile
 */
UserWithReferenceSchema.methods.withProfile = function() {
    return this.populate('profile');
};

/**
 * Check if user has a profile
 */
UserWithReferenceSchema.methods.hasProfile = async function() {
    const profile = await mongoose.model('Profile').findOne({ user: this._id });
    return profile !== null;
};

/**
 * Get profile with populated user
 */
ProfileSchema.methods.withUser = function() {
    return this.populate('user');
};

/**
 * Update social media handles
 */
ProfileSchema.methods.updateSocialMedia = function(socialData) {
    if (!this.socialMedia) {
        this.socialMedia = {};
    }
    Object.assign(this.socialMedia, socialData);
    return this.save();
};

/**
 * Get public profile data (without sensitive info)
 */
ProfileSchema.methods.getPublicData = function() {
    return {
        bio: this.bio,
        website: this.website,
        location: this.location,
        socialMedia: this.socialMedia,
        age: this.age
    };
};

// ============================================================================
// STATIC METHODS (using utility functions)
// ============================================================================

/**
 * Find users with profiles
 */
UserWithReferenceSchema.statics.findWithProfiles = function() {
    return this.find().populate('profile');
};

/**
 * Find users without profiles
 */
UserWithReferenceSchema.statics.findWithoutProfiles = async function() {
    const usersWithProfiles = await mongoose.model('Profile').distinct('user');
    return this.find({ _id: { $nin: usersWithProfiles } });
};

/**
 * Find profiles by location
 */
ProfileSchema.statics.findByLocation = function(city, country) {
    const query = {};
    if (city) query['location.city'] = city;
    if (country) query['location.country'] = country;
    return this.find(query).populate('user');
};

/**
 * Find profiles with social media
 */
ProfileSchema.statics.findWithSocialMedia = function() {
    return this.find({
        $or: [
            { 'socialMedia.twitter': { $exists: true, $ne: null } },
            { 'socialMedia.linkedin': { $exists: true, $ne: null } },
            { 'socialMedia.github': { $exists: true, $ne: null } }
        ]
    }).populate('user');
};

/**
 * Find users with pagination (using utility functions)
 */
UserWithReferenceSchema.statics.findWithPagination = function(page = 1, limit = 10, filters = {}) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find(filters)
        .skip(skip)
        .limit(queryLimit)
        .populate('profile');
};

/**
 * Find profiles with projection (using utility functions)
 */
ProfileSchema.statics.findWithProjection = function(filters = {}, fields = ['bio', 'website', 'location']) {
    const projection = queryOptimization.projection(fields);
    return this.find(filters, projection).populate('user');
};

/**
 * Get user statistics
 */
UserWithReferenceSchema.statics.getUserStats = async function() {
    const totalUsers = await this.countDocuments();
    const activeUsers = await this.countDocuments({ isActive: true });
    const usersWithProfiles = await mongoose.model('Profile').countDocuments();
    
    return {
        totalUsers,
        activeUsers,
        usersWithProfiles,
        usersWithoutProfiles: totalUsers - usersWithProfiles,
        profilePercentage: totalUsers > 0 ? (usersWithProfiles / totalUsers * 100).toFixed(2) : 0
    };
};

// ============================================================================
// PRE/POST MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware for Profile
 */
ProfileSchema.pre('save', function(next) {
    // Ensure social media handles are properly formatted
    if (this.socialMedia) {
        if (this.socialMedia.twitter && !this.socialMedia.twitter.startsWith('@')) {
            this.socialMedia.twitter = '@' + this.socialMedia.twitter;
        }
    }
    next();
});

/**
 * Post-save middleware for User
 */
UserWithReferenceSchema.post('save', function(doc) {
    console.log(`User ${doc.name} (${doc.email}) saved`);
});

/**
 * Post-save middleware for Profile
 */
ProfileSchema.post('save', function(doc) {
    console.log(`Profile saved for user ${doc.user}`);
});

// ============================================================================
// EXPORT MODELS
// ============================================================================

export const UserWithReference = mongoose.model('UserWithReference', UserWithReferenceSchema);
export const Profile = mongoose.model('Profile', ProfileSchema);
