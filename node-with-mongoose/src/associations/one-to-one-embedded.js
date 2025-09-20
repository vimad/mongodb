import mongoose from 'mongoose';
import { validators, virtuals, indexes, queryOptimization } from './utils.js';
const Schema = mongoose.Schema;

// ============================================================================
// ONE-TO-ONE RELATIONSHIPS - EMBEDDED SUBDOCUMENTS APPROACH
// ============================================================================

/**
 * Embedded Address Schema
 * This approach embeds the address directly in the user document
 * Best for: Small, always accessed together, limited size data
 */
const AddressSchema = new Schema({
    street: { 
        type: String, 
        required: [true, 'Street address is required'],
        trim: true
    },
    city: { 
        type: String, 
        required: [true, 'City is required'],
        trim: true
    },
    zipCode: { 
        type: String, 
        required: [true, 'ZIP code is required'],
        match: [/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code']
    },
    country: { 
        type: String, 
        default: 'USA',
        trim: true
    },
    coordinates: {
        latitude: Number,
        longitude: Number
    }
}, {
    _id: false // Disable _id for subdocuments to save space
});

/**
 * User Schema with Embedded Address
 * The address is stored as a subdocument within the user document
 */
const UserWithEmbeddedAddressSchema = new Schema({
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
    address: AddressSchema, // Embedded subdocument
    preferences: {
        newsletter: { type: Boolean, default: true },
        notifications: { type: Boolean, default: true }
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// ============================================================================
// INDEXES FOR PERFORMANCE (using utility functions)
// ============================================================================

// Index on email for fast lookups
UserWithEmbeddedAddressSchema.index({ email: 1 });

// Compound index for location-based queries (using utility)
const locationIndex = indexes.compound(['address.city', 'address.country']);
UserWithEmbeddedAddressSchema.index(locationIndex.fields, locationIndex.options);

// Sparse index on phone (using utility)
const phoneIndex = indexes.sparse(['phone']);
UserWithEmbeddedAddressSchema.index(phoneIndex.fields, phoneIndex.options);

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Get full address as a formatted string
 */
UserWithEmbeddedAddressSchema.methods.getFullAddress = function() {
    if (!this.address) return null;
    
    const { street, city, zipCode, country } = this.address;
    return `${street}, ${city}, ${zipCode}, ${country}`;
};

/**
 * Update address with validation
 */
UserWithEmbeddedAddressSchema.methods.updateAddress = function(addressData) {
    if (!this.address) {
        this.address = {};
    }
    
    Object.assign(this.address, addressData);
    return this.save();
};

/**
 * Check if user is in a specific city
 */
UserWithEmbeddedAddressSchema.methods.isInCity = function(city) {
    return this.address && this.address.city === city;
};

// ============================================================================
// STATIC METHODS (using utility functions)
// ============================================================================

/**
 * Find users by city
 */
UserWithEmbeddedAddressSchema.statics.findByCity = function(city) {
    return this.find({ 'address.city': city });
};

/**
 * Find users by country
 */
UserWithEmbeddedAddressSchema.statics.findByCountry = function(country) {
    return this.find({ 'address.country': country });
};

/**
 * Find users within a ZIP code range
 */
UserWithEmbeddedAddressSchema.statics.findByZipRange = function(startZip, endZip) {
    return this.find({
        'address.zipCode': {
            $gte: startZip,
            $lte: endZip
        }
    });
};

/**
 * Get users with coordinates (for location-based services)
 */
UserWithEmbeddedAddressSchema.statics.findWithCoordinates = function() {
    return this.find({
        'address.coordinates.latitude': { $exists: true },
        'address.coordinates.longitude': { $exists: true }
    });
};

/**
 * Find users with pagination (using utility functions)
 */
UserWithEmbeddedAddressSchema.statics.findWithPagination = function(page = 1, limit = 10, filters = {}) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find(filters)
        .skip(skip)
        .limit(queryLimit);
};

/**
 * Find users with projection (using utility functions)
 */
UserWithEmbeddedAddressSchema.statics.findWithProjection = function(filters = {}, fields = ['name', 'email', 'address']) {
    const projection = queryOptimization.projection(fields);
    return this.find(filters, projection);
};

// ============================================================================
// VIRTUAL FIELDS (using utility functions)
// ============================================================================

/**
 * Virtual field for formatted address
 */
UserWithEmbeddedAddressSchema.virtual('formattedAddress').get(function() {
    return this.getFullAddress();
});

/**
 * Virtual field for location string
 */
UserWithEmbeddedAddressSchema.virtual('location').get(function() {
    if (!this.address) return null;
    return `${this.address.city}, ${this.address.country}`;
});

// ============================================================================
// PRE/POST MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware to validate address
 */
UserWithEmbeddedAddressSchema.pre('save', function(next) {
    if (this.address && this.address.coordinates) {
        const { latitude, longitude } = this.address.coordinates;
        if (latitude < -90 || latitude > 90) {
            return next(new Error('Latitude must be between -90 and 90'));
        }
        if (longitude < -180 || longitude > 180) {
            return next(new Error('Longitude must be between -180 and 180'));
        }
    }
    next();
});

/**
 * Post-save middleware for logging
 */
UserWithEmbeddedAddressSchema.post('save', function(doc) {
    console.log(`User ${doc.name} saved with address in ${doc.address?.city || 'unknown city'}`);
});

// ============================================================================
// EXPORT MODEL
// ============================================================================

export const UserWithEmbeddedAddress = mongoose.model('UserWithEmbeddedAddress', UserWithEmbeddedAddressSchema);
