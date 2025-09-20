import {
    UserWithEmbeddedAddress,
    Author,
    Post,
    Student,
    Course,
    Enrollment,
    queryOptimization,
    aggregation,
    indexes
} from '../../src/associations/index.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('Associations Integration Test (with Utility Functions)', () => {
    
    beforeEach(async () => {
        // Clean up all collections
        await UserWithEmbeddedAddress.deleteMany({});
        await Author.deleteMany({});
        await Post.deleteMany({});
        await Student.deleteMany({});
        await Course.deleteMany({});
        await Enrollment.deleteMany({});
    });

    describe('Utility Functions Integration', () => {
        it('should use query optimization utilities', async () => {
            // Test pagination utility
            const { skip, limit } = queryOptimization.pagination(2, 5);
            expect(skip).to.equal(5); // (2-1) * 5
            expect(limit).to.equal(5);

            // Test projection utility
            const projection = queryOptimization.projection(['name', 'email']);
            expect(projection).to.deep.equal({ name: 1, email: 1 });

            // Test sort utility
            const sort = queryOptimization.sort(['-createdAt', 'name']);
            expect(sort).to.deep.equal({ createdAt: -1, name: 1 });
        });

        it('should use aggregation utilities', async () => {
            // Test aggregation pipeline building
            const pipeline = [
                aggregation.match({ status: 'active' }),
                aggregation.group('$category', { count: { $sum: 1 } }),
                aggregation.sort({ count: -1 }),
                aggregation.limit(10)
            ];

            expect(pipeline).to.have.length(4);
            expect(pipeline[0]).to.have.property('$match');
            expect(pipeline[1]).to.have.property('$group');
            expect(pipeline[2]).to.have.property('$sort');
            expect(pipeline[3]).to.have.property('$limit');
        });

        it('should use index utilities', async () => {
            // Test compound index
            const compoundIndex = indexes.compound(['field1', 'field2'], { background: true });
            expect(compoundIndex.fields).to.deep.equal(['field1', 'field2']);
            expect(compoundIndex.options).to.deep.equal({ background: true });

            // Test unique compound index
            const uniqueIndex = indexes.uniqueCompound(['field1', 'field2']);
            expect(uniqueIndex.fields).to.deep.equal(['field1', 'field2']);
            expect(uniqueIndex.options).to.deep.equal({ unique: true });

            // Test sparse index
            const sparseIndex = indexes.sparse(['field1']);
            expect(sparseIndex.fields).to.deep.equal(['field1']);
            expect(sparseIndex.options).to.deep.equal({ sparse: true });
        });
    });

    describe('One-to-One Embedded with Utilities', () => {
        it('should create user with embedded address using utility functions', async () => {
            const user = await UserWithEmbeddedAddress.create({
                name: 'Test User',
                email: 'test@example.com',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    zipCode: '12345',
                    country: 'USA'
                }
            });

            // Test instance method
            const fullAddress = user.getFullAddress();
            expect(fullAddress).to.equal('123 Test St, Test City, 12345, USA');

            // Test static method with pagination utility
            const users = await UserWithEmbeddedAddress.findWithPagination(1, 10);
            expect(users).to.have.length(1);

            // Test static method with projection utility
            const projectedUsers = await UserWithEmbeddedAddress.findWithProjection({}, ['name', 'email']);
            expect(projectedUsers[0].name).to.exist;
            expect(projectedUsers[0].email).to.exist;
            expect(projectedUsers[0].address).to.be.undefined;
        });
    });

    describe('One-to-Many References with Utilities', () => {
        it('should create author and posts with utility functions', async () => {
            const author = await Author.create({
                name: 'Test Author',
                email: 'author@example.com',
                bio: 'Test bio'
            });

            const post = await Post.create({
                title: 'Test Post',
                content: 'This is a test post with enough content to meet the minimum character requirement.',
                author: author._id,
                tags: ['test', 'example']
            });

            // Test instance method
            const authorWithPosts = await author.withPosts();
            expect(authorWithPosts.posts).to.have.length(1);

            // Test static method with aggregation utility
            const authorsWithCounts = await Author.findWithPostCounts();
            expect(authorsWithCounts).to.have.length(1);
            expect(authorsWithCounts[0].postCount).to.equal(1);

            // Test post instance method
            await post.publish();
            expect(post.status).to.equal('published');
            expect(post.publishedAt).to.be.instanceOf(Date);
        });
    });

    describe('Many-to-Many Junction with Utilities', () => {
        it('should create student-course relationships with utility functions', async () => {
            const student = await Student.create({
                name: 'Test Student',
                email: 'student@university.edu',
                studentId: 'STU001',
                dateOfBirth: new Date('2000-01-01')
            });

            const course = await Course.create({
                title: 'Test Course',
                code: 'TEST101',
                description: 'A test course',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Test Instructor',
                    email: 'instructor@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            // Test instance method
            await student.enrollInCourse(course._id);
            const enrollment = await Enrollment.findOne({
                student: student._id,
                course: course._id
            });
            expect(enrollment).to.not.be.null;
            expect(enrollment.status).to.equal('enrolled');

            // Test static method with aggregation utility
            const mostEnrolled = await Student.findMostEnrolled(10);
            expect(mostEnrolled).to.have.length(1);
            expect(mostEnrolled[0].enrollmentCount).to.equal(1);

            // Test course statistics with aggregation utility
            const stats = await course.getStats();
            expect(stats.totalEnrollments).to.equal(1);
            expect(stats.currentEnrollments).to.equal(1);
        });
    });

    describe('Cross-Model Operations with Utilities', () => {
        it('should perform complex operations across multiple models', async () => {
            // Create test data
            const author = await Author.create({
                name: 'Cross Author',
                email: 'cross@example.com'
            });

            const post = await Post.create({
                title: 'Cross Post',
                content: 'This is a cross-model test post with enough content to meet the minimum character requirement.',
                author: author._id,
                status: 'published'
            });

            const student = await Student.create({
                name: 'Cross Student',
                email: 'cross@university.edu',
                studentId: 'STU002',
                dateOfBirth: new Date('2000-01-01')
            });

            const course = await Course.create({
                title: 'Cross Course',
                code: 'CROSS101',
                description: 'A cross-model test course',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Cross Instructor',
                    email: 'cross@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            await student.enrollInCourse(course._id);

            // Test pagination across models
            const authors = await Author.findWithPagination(1, 10);
            const students = await Student.findWithPagination(1, 10);
            const courses = await Course.findWithPagination(1, 10);

            expect(authors).to.have.length(1);
            expect(students).to.have.length(1);
            expect(courses).to.have.length(1);

            // Test projection across models
            const projectedAuthors = await Author.findWithProjection({}, ['name', 'email']);
            const projectedStudents = await Student.findWithProjection({}, ['name', 'email']);
            const projectedCourses = await Course.findWithProjection({}, ['title', 'code']);

            expect(projectedAuthors[0].name).to.exist;
            expect(projectedStudents[0].name).to.exist;
            expect(projectedCourses[0].title).to.exist;

            // Test aggregation across models
            const authorStats = await Author.findWithPostCounts();
            const studentStats = await Student.findMostEnrolled(10);
            const courseStats = await Course.findMostPopular(10);

            expect(authorStats).to.have.length(1);
            expect(studentStats).to.have.length(1);
            expect(courseStats).to.have.length(1);
        });
    });

    describe('Error Handling with Utilities', () => {
        it('should handle validation errors properly', async () => {
            // Test validation error
            const invalidUser = new UserWithEmbeddedAddress({
                name: 'Test',
                email: 'invalid-email'
            });

            try {
                await invalidUser.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }

            // Test duplicate key error
            const student1 = await Student.create({
                name: 'Duplicate Student',
                email: 'duplicate@university.edu',
                studentId: 'STU003',
                dateOfBirth: new Date('2000-01-01')
            });

            try {
                await Student.create({
                    name: 'Another Student',
                    email: 'duplicate@university.edu', // Duplicate email
                    studentId: 'STU004',
                    dateOfBirth: new Date('2000-01-01')
                });
                expect.fail('Should have thrown duplicate key error');
            } catch (error) {
                expect(error.code).to.equal(11000); // Duplicate key error
            }
        });
    });

    afterEach(async () => {
        // Clean up all collections
        await UserWithEmbeddedAddress.deleteMany({});
        await Author.deleteMany({});
        await Post.deleteMany({});
        await Student.deleteMany({});
        await Course.deleteMany({});
        await Enrollment.deleteMany({});
    });
});
