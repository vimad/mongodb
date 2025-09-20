import { Author, Post } from '../../src/associations/one-to-many-references.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('One-to-Many Relationships - References (with Utilities)', () => {
    
    beforeEach(async () => {
        // Clean up collections
        await Author.deleteMany({});
        await Post.deleteMany({});
    });

    describe('Basic CRUD Operations', () => {
        it('should create author with multiple posts', async () => {
            const author = await Author.create({
                name: 'Tech Writer',
                email: 'tech@example.com',
                bio: 'Technology blogger'
            });

            const post1 = await Post.create({
                title: 'Getting Started with MongoDB',
                content: 'MongoDB is a powerful NoSQL database that provides high performance, high availability, and easy scalability.',
                author: author._id,
                tags: ['database', 'tutorial']
            });

            const post2 = await Post.create({
                title: 'Advanced Mongoose Patterns',
                content: 'Learn advanced patterns in Mongoose for better data modeling and query optimization.',
                author: author._id,
                tags: ['mongoose', 'advanced']
            });

            expect(post1.author.toString()).to.equal(author._id.toString());
            expect(post2.author.toString()).to.equal(author._id.toString());
        });

        it('should populate author with posts', async () => {
            const author = await Author.create({
                name: 'Blog Author',
                email: 'blog@example.com'
            });

            await Post.create({
                title: 'Post 1',
                content: 'This is the content of the first post with enough characters to meet the minimum requirement.',
                author: author._id
            });

            await Post.create({
                title: 'Post 2',
                content: 'This is the content of the second post with enough characters to meet the minimum requirement.',
                author: author._id
            });

            const authorWithPosts = await Author.findById(author._id).populate('posts');
            expect(authorWithPosts.posts).to.have.length(2);
            expect(authorWithPosts.posts[0].title).to.equal('Post 1');
        });

        it('should use virtual field for post count', async () => {
            const author = await Author.create({
                name: 'Count Author',
                email: 'count@example.com'
            });

            await Post.create({ 
                title: 'Post 1', 
                content: 'This is the content of the first post with enough characters to meet the minimum requirement.',
                author: author._id 
            });
            await Post.create({ 
                title: 'Post 2', 
                content: 'This is the content of the second post with enough characters to meet the minimum requirement.',
                author: author._id 
            });
            await Post.create({ 
                title: 'Post 3', 
                content: 'This is the content of the third post with enough characters to meet the minimum requirement.',
                author: author._id 
            });

            const authorWithCount = await Author.findById(author._id).populate('postCount');
            expect(authorWithCount.postCount).to.equal(3);
        });
    });

    describe('Instance Methods', () => {
        it('should get author with posts using instance method', async () => {
            const author = await Author.create({
                name: 'Method Author',
                email: 'method@example.com'
            });

            await Post.create({
                title: 'Test Post',
                content: 'This is a test post with enough content to meet the minimum character requirement.',
                author: author._id
            });

            const authorWithPosts = await author.withPosts();
            expect(authorWithPosts.posts).to.have.length(1);
        });

        it('should get author with published posts only', async () => {
            const author = await Author.create({
                name: 'Published Author',
                email: 'published@example.com'
            });

            const post1 = await Post.create({
                title: 'Draft Post',
                content: 'This is a draft post with enough content to meet the minimum character requirement.',
                author: author._id,
                status: 'draft'
            });

            const post2 = await Post.create({
                title: 'Published Post',
                content: 'This is a published post with enough content to meet the minimum character requirement.',
                author: author._id,
                status: 'published'
            });

            const authorWithPublished = await author.withPublishedPosts();
            expect(authorWithPublished.posts).to.have.length(1);
            expect(authorWithPublished.posts[0].title).to.equal('Published Post');
        });

        it('should get author statistics (using aggregation utility)', async () => {
            const author = await Author.create({
                name: 'Stats Author',
                email: 'stats@example.com'
            });

            await Post.create({
                title: 'Post 1',
                content: 'This is the first post with enough content to meet the minimum character requirement.',
                author: author._id,
                status: 'published',
                metrics: { views: 100, likes: 10 }
            });

            await Post.create({
                title: 'Post 2',
                content: 'This is the second post with enough content to meet the minimum character requirement.',
                author: author._id,
                status: 'published',
                metrics: { views: 200, likes: 20 }
            });

            const stats = await author.getStats();
            expect(stats.totalPosts).to.equal(2);
            expect(stats.publishedPosts).to.equal(2);
            expect(stats.totalViews).to.equal(300);
            expect(stats.totalLikes).to.equal(30);
        });
    });

    describe('Post Instance Methods', () => {
        it('should publish a post', async () => {
            const author = await Author.create({
                name: 'Publish Author',
                email: 'publish@example.com'
            });

            const post = await Post.create({
                title: 'Draft Post',
                content: 'This is a draft post that will be published with enough content to meet the minimum character requirement.',
                author: author._id,
                status: 'draft'
            });

            expect(post.status).to.equal('draft');
            expect(post.publishedAt).to.be.undefined;

            await post.publish();

            expect(post.status).to.equal('published');
            expect(post.publishedAt).to.be.instanceOf(Date);
        });

        it('should archive a post', async () => {
            const author = await Author.create({
                name: 'Archive Author',
                email: 'archive@example.com'
            });

            const post = await Post.create({
                title: 'Active Post',
                content: 'This is an active post that will be archived with enough content to meet the minimum character requirement.',
                author: author._id,
                status: 'published'
            });

            await post.archive();

            expect(post.status).to.equal('archived');
        });

        it('should increment view count', async () => {
            const author = await Author.create({
                name: 'View Author',
                email: 'view@example.com'
            });

            const post = await Post.create({
                title: 'View Post',
                content: 'This is a post for testing view increments with enough content to meet the minimum character requirement.',
                author: author._id,
                metrics: { views: 0 }
            });

            await post.incrementViews();

            expect(post.metrics.views).to.equal(1);
        });

        it('should like a post', async () => {
            const author = await Author.create({
                name: 'Like Author',
                email: 'like@example.com'
            });

            const post = await Post.create({
                title: 'Like Post',
                content: 'This is a post for testing likes with enough content to meet the minimum character requirement.',
                author: author._id,
                metrics: { likes: 0 }
            });

            await post.like();

            expect(post.metrics.likes).to.equal(1);
        });
    });

    describe('Static Methods (using utility functions)', () => {
        beforeEach(async () => {
            // Create test data
            const author1 = await Author.create({
                name: 'Author 1',
                email: 'author1@example.com'
            });

            const author2 = await Author.create({
                name: 'Author 2',
                email: 'author2@example.com'
            });

            await Post.create([
                {
                    title: 'Post 1',
                    content: 'This is the first post with enough content to meet the minimum character requirement.',
                    author: author1._id,
                    status: 'published',
                    metrics: { views: 100, likes: 10 }
                },
                {
                    title: 'Post 2',
                    content: 'This is the second post with enough content to meet the minimum character requirement.',
                    author: author1._id,
                    status: 'published',
                    metrics: { views: 200, likes: 20 }
                },
                {
                    title: 'Post 3',
                    content: 'This is the third post with enough content to meet the minimum character requirement.',
                    author: author2._id,
                    status: 'draft',
                    metrics: { views: 50, likes: 5 }
                }
            ]);
        });

        it('should find authors with post counts (using aggregation utility)', async () => {
            const authorsWithCounts = await Author.findWithPostCounts();
            expect(authorsWithCounts).to.have.length(2);
            
            const author1 = authorsWithCounts.find(a => a.name === 'Author 1');
            const author2 = authorsWithCounts.find(a => a.name === 'Author 2');
            
            expect(author1.postCount).to.equal(2);
            expect(author1.publishedPostCount).to.equal(2);
            expect(author2.postCount).to.equal(1);
            expect(author2.publishedPostCount).to.equal(0);
        });

        it('should find top authors by views (using aggregation utility)', async () => {
            const topAuthors = await Author.findTopAuthors(10);
            expect(topAuthors).to.have.length(2);
            expect(topAuthors[0].name).to.equal('Author 1'); // More total views
        });

        it('should find published posts with pagination (using utility functions)', async () => {
            const publishedPosts = await Post.findPublished(1, 10);
            expect(publishedPosts).to.have.length(2);
            expect(publishedPosts[0].status).to.equal('published');
        });

        it('should search posts by text', async () => {
            const searchResults = await Post.search('first', { limit: 10 });
            expect(searchResults).to.have.length(1);
            expect(searchResults[0].title).to.equal('Post 1');
        });

        it('should find posts by tag', async () => {
            const author = await Author.create({
                name: 'Tag Author',
                email: 'tag@example.com'
            });

            await Post.create({
                title: 'Tagged Post',
                content: 'This is a tagged post with enough content to meet the minimum character requirement.',
                author: author._id,
                tags: ['javascript', 'tutorial'],
                status: 'published'
            });

            const taggedPosts = await Post.findByTag('javascript');
            expect(taggedPosts).to.have.length(1);
            expect(taggedPosts[0].title).to.equal('Tagged Post');
        });

        it('should find popular posts', async () => {
            const popularPosts = await Post.findPopular(10, 30);
            expect(popularPosts).to.have.length(2);
            expect(popularPosts[0].title).to.equal('Post 2'); // More views
        });
    });

    describe('Virtual Fields', () => {
        it('should calculate estimated reading time', async () => {
            const author = await Author.create({
                name: 'Reading Author',
                email: 'reading@example.com'
            });

            const post = await Post.create({
                title: 'Long Post',
                content: 'This is a very long post with enough content to test the reading time calculation. '.repeat(50),
                author: author._id
            });

            expect(post.estimatedReadingTime).to.be.greaterThan(0);
        });

        it('should generate post URL', async () => {
            const author = await Author.create({
                name: 'URL Author',
                email: 'url@example.com'
            });

            const post = await Post.create({
                title: 'URL Test Post',
                content: 'This is a post for testing URL generation with enough content to meet the minimum character requirement.',
                author: author._id
            });

            expect(post.url).to.include('/posts/');
        });
    });

    describe('Validation', () => {
        it('should validate required fields', async () => {
            const post = new Post({
                title: 'Test Post',
                // Missing content and author
            });

            try {
                await post.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate content length', async () => {
            const author = await Author.create({
                name: 'Validation Author',
                email: 'validation@example.com'
            });

            const post = new Post({
                title: 'Short Post',
                content: 'Too short',
                author: author._id
            });

            try {
                await post.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await Author.deleteMany({});
        await Post.deleteMany({});
    });
});
