# Mongoose Associations Examples

This directory contains comprehensive examples of different association patterns in Mongoose, demonstrating both embedded and reference approaches with utility functions integration.

## 📁 File Structure

```
src/associations/
├── utils.js                    # Shared utilities and helper functions
├── one-to-one-embedded.js      # One-to-one with embedded subdocuments
├── one-to-one-references.js    # One-to-one with references
├── one-to-many-references.js   # One-to-many with references
├── one-to-many-embedded.js     # One-to-many with embedded arrays
├── many-to-many-junction.js    # Many-to-many with junction collection
├── many-to-many-embedded.js    # Many-to-many with embedded arrays
├── self-referencing.js         # Self-referencing (tree structures)
├── polymorphic.js              # Polymorphic associations
└── index.js                    # Export all models and utilities
```

## 🔧 Utility Functions Integration

All association files use utility functions from `utils.js` for:

### Index Management
- `indexes.compound()` - Create compound indexes
- `indexes.uniqueCompound()` - Create unique compound indexes  
- `indexes.sparse()` - Create sparse indexes

### Virtual Fields
- `virtuals.createReverseRelationship()` - Create reverse relationship virtuals
- `virtuals.createCountField()` - Create count virtual fields

### Query Optimization
- `queryOptimization.pagination()` - Create pagination parameters
- `queryOptimization.projection()` - Create field projections
- `queryOptimization.sort()` - Create sort objects

### Aggregation
- `aggregation.lookup()` - Create lookup stages
- `aggregation.match()` - Create match stages
- `aggregation.group()` - Create group stages
- `aggregation.project()` - Create project stages

### Error Handling
- `errorHandling.isDuplicateKeyError()` - Check for duplicate key errors
- `errorHandling.isValidationError()` - Check for validation errors
- `errorHandling.getValidationMessages()` - Extract validation messages

## 📊 Association Patterns

### 1. One-to-One Relationships

#### Embedded Approach (`one-to-one-embedded.js`)
- **Best for**: Small, always accessed together data
- **Example**: User with embedded address
- **Key Features**:
  - Address stored as subdocument within user
  - No separate collection needed
  - Atomic updates
  - Uses utility functions for indexes and query optimization

#### References Approach (`one-to-one-references.js`)
- **Best for**: Large data, independent querying
- **Example**: User with separate Profile collection
- **Key Features**:
  - Separate collections with references
  - Population for data retrieval
  - Referential integrity
  - Uses utility functions for virtual fields and validation

### 2. One-to-Many Relationships

#### References Approach (`one-to-many-references.js`)
- **Best for**: Large datasets, complex queries
- **Example**: Author with multiple Posts
- **Key Features**:
  - Separate collections with foreign keys
  - Virtual fields for reverse relationships
  - Aggregation pipelines for statistics
  - Uses utility functions for aggregation and query optimization

#### Embedded Approach (`one-to-many-embedded.js`)
- **Best for**: Small, always accessed together data
- **Example**: BlogPost with embedded comments
- **Key Features**:
  - Comments stored as array within blog post
  - Nested comment replies
  - Comment moderation features
  - Uses utility functions for indexes and instance methods

### 3. Many-to-Many Relationships

#### Junction Collection (`many-to-many-junction.js`)
- **Best for**: Complex relationships with metadata
- **Example**: Students, Courses, and Enrollments
- **Key Features**:
  - Separate junction collection (Enrollment)
  - Rich metadata (grades, attendance, etc.)
  - Complex queries and aggregations
  - Uses utility functions for all major operations

#### Embedded Arrays (`many-to-many-embedded.js`)
- **Best for**: Simple many-to-many relationships
- **Example**: Authors and Books (authors array in books)
- **Key Features**:
  - Array of references in one collection
  - Simpler queries
  - Good for read-heavy operations
  - Uses utility functions for virtual fields and statistics

### 4. Advanced Patterns

#### Self-Referencing (`self-referencing.js`)
- **Best for**: Hierarchical data structures
- **Examples**: Categories, Comments, Employee hierarchy
- **Key Features**:
  - Tree structures with parent-child relationships
  - Path tracking for efficient queries
  - Level-based operations
  - Uses utility functions for aggregation and tree operations

#### Polymorphic (`polymorphic.js`)
- **Best for**: Flexible associations across different entity types
- **Examples**: Comments on Posts/Products, Likes on various entities
- **Key Features**:
  - Single model can reference multiple entity types
  - Type and ID fields for polymorphic references
  - Flexible tagging and attachment systems
  - Uses utility functions for complex queries and statistics

## 🧪 Testing

Each association pattern has corresponding test files in `test/associations/` that demonstrate:

- Basic CRUD operations
- Instance methods
- Static methods using utility functions
- Virtual fields
- Validation
- Error handling
- Complex queries and aggregations

## 🚀 Usage Examples

### Import Models
```javascript
import { 
    UserWithEmbeddedAddress,
    Author, 
    Post,
    Student,
    Course,
    Enrollment 
} from './src/associations/index.js';
```

### Use Utility Functions
```javascript
import { 
    queryOptimization,
    aggregation,
    indexes 
} from './src/associations/utils.js';

// Create pagination
const { skip, limit } = queryOptimization.pagination(1, 10);

// Create aggregation pipeline
const pipeline = [
    aggregation.match({ status: 'active' }),
    aggregation.group('$category', { count: { $sum: 1 } }),
    aggregation.sort({ count: -1 })
];

// Create compound index
const compoundIndex = indexes.compound(['field1', 'field2']);
```

## 📈 Performance Considerations

### Indexing Strategy
- Use utility functions to create appropriate indexes
- Compound indexes for multi-field queries
- Sparse indexes for optional fields
- Unique indexes for referential integrity

### Query Optimization
- Use projection to limit returned fields
- Implement pagination for large datasets
- Use aggregation for complex statistics
- Leverage virtual fields for computed properties

### Memory Management
- Use `lean()` queries for read-only operations
- Implement proper population strategies
- Consider embedded vs references trade-offs
- Use streaming for large result sets

## 🔍 Key Features Demonstrated

1. **Utility Integration**: All examples use shared utility functions
2. **Index Optimization**: Proper indexing strategies for performance
3. **Query Patterns**: Common query patterns with utility functions
4. **Aggregation Pipelines**: Complex data analysis using utility functions
5. **Validation**: Comprehensive validation with error handling utilities
6. **Virtual Fields**: Computed properties using utility functions
7. **Instance Methods**: Rich object methods for common operations
8. **Static Methods**: Class-level methods using utility functions
9. **Error Handling**: Proper error handling with utility functions
10. **Testing**: Comprehensive test coverage with utility function usage

## 📚 Learning Path

1. Start with `utils.js` to understand available utility functions
2. Explore `one-to-one-embedded.js` for simple embedded patterns
3. Study `one-to-many-references.js` for reference patterns
4. Examine `many-to-many-junction.js` for complex relationships
5. Review `self-referencing.js` for hierarchical data
6. Investigate `polymorphic.js` for flexible associations
7. Run tests to see utility functions in action
8. Use `index.js` for easy model imports

This modular structure makes it easy to reference specific association patterns and understand how utility functions enhance code reusability and maintainability.
