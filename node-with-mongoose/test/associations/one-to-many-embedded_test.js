import { BlogPost } from '../../src/associations/one-to-many-embedded.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('One-to-Many Relationships - Embedded Subdocuments (with Utilities)', () => {
    
    beforeEach(async () => {
        // Clean up collection
        await BlogPost.deleteMany({});
    });

    describe('Basic CRUD Operations', () => {
        it('should create blog post with embedded comments', async () => {
            const blogPost = await BlogPost.create({
                title: 'Getting Started with MongoDB',
                content: 'MongoDB is a powerful NoSQL database that provides high performance, high availability, and easy scalability. In this comprehensive guide, we will explore the fundamentals of MongoDB and how to get started with it.',
                excerpt: 'Learn the basics of MongoDB in this comprehensive guide.',
                tags: ['database', 'mongodb', 'tutorial'],
                category: 'technology',
                status: 'published',
                author: {
                    name: 'Tech Writer',
                    email: 'tech@example.com',
                    website: 'https://techwriter.com'
                },
                comments: [
                    {
                        content: 'Great article! Very informative.',
                        author: 'John Doe',
                        email: 'john@example.com',
                        isApproved: true
                    },
                    {
                        content: 'Thanks for sharing this knowledge.',
                        author: 'Jane Smith',
                        email: 'jane@example.com',
                        isApproved: true
                    }
                ]
            });

            expect(blogPost.comments).to.have.length(2);
            expect(blogPost.comments[0].content).to.equal('Great article! Very informative.');
            expect(blogPost.comments[1].author).to.equal('Jane Smith');
        });

        it('should update embedded comments', async () => {
            const blogPost = await BlogPost.create({
                title: 'Test Post',
                content: 'This is a test post with enough content to meet the minimum character requirement for validation.',
                author: {
                    name: 'Test Author',
                    email: 'test@example.com'
                },
                comments: [
                    {
                        content: 'Initial comment',
                        author: 'Commenter',
                        email: 'commenter@example.com'
                    }
                ]
            });

            // Update embedded comment
            blogPost.comments[0].content = 'Updated comment';
            blogPost.comments[0].isApproved = true;
            await blogPost.save();

            const updatedPost = await BlogPost.findById(blogPost._id);
            expect(updatedPost.comments[0].content).to.equal('Updated comment');
            expect(updatedPost.comments[0].isApproved).to.be.true;
        });

        it('should query by embedded comment fields', async () => {
            await BlogPost.create({
                title: 'Comment Test Post',
                content: 'This is a test post for comment queries with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Comment Author',
                    email: 'comment@example.com'
                },
                comments: [
                    {
                        content: 'This is a test comment',
                        author: 'Test Commenter',
                        email: 'testcommenter@example.com',
                        isApproved: true
                    }
                ]
            });

            const postsWithApprovedComments = await BlogPost.find({ 'comments.isApproved': true });
            expect(postsWithApprovedComments).to.have.length(1);
            expect(postsWithApprovedComments[0].title).to.equal('Comment Test Post');
        });
    });

    describe('Instance Methods', () => {
        it('should add a new comment to the post', async () => {
            const blogPost = await BlogPost.create({
                title: 'Add Comment Post',
                content: 'This is a test post for adding comments with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Add Author',
                    email: 'add@example.com'
                },
                allowComments: true
            });

            await blogPost.addComment({
                content: 'This is a new comment added via instance method',
                author: 'New Commenter',
                email: 'newcommenter@example.com'
            });

            expect(blogPost.comments).to.have.length(1);
            expect(blogPost.comments[0].content).to.equal('This is a new comment added via instance method');
        });

        it('should not add comment when comments are disabled', async () => {
            const blogPost = await BlogPost.create({
                title: 'No Comments Post',
                content: 'This is a test post with comments disabled and enough content to meet the minimum character requirement.',
                author: {
                    name: 'No Comment Author',
                    email: 'nocomment@example.com'
                },
                allowComments: false
            });

            try {
                await blogPost.addComment({
                    content: 'This should fail',
                    author: 'Test Commenter',
                    email: 'test@example.com'
                });
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Comments are not allowed on this post');
            }
        });

        it('should approve a comment by ID', async () => {
            const blogPost = await BlogPost.create({
                title: 'Approve Comment Post',
                content: 'This is a test post for comment approval with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Approve Author',
                    email: 'approve@example.com'
                },
                comments: [
                    {
                        content: 'Pending comment',
                        author: 'Pending Commenter',
                        email: 'pending@example.com',
                        isApproved: false
                    }
                ]
            });

            const commentId = blogPost.comments[0]._id;
            await blogPost.approveComment(commentId);

            const updatedPost = await BlogPost.findById(blogPost._id);
            expect(updatedPost.comments[0].isApproved).to.be.true;
            expect(updatedPost.comments[0].isSpam).to.be.false;
        });

        it('should mark a comment as spam', async () => {
            const blogPost = await BlogPost.create({
                title: 'Spam Comment Post',
                content: 'This is a test post for spam detection with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Spam Author',
                    email: 'spam@example.com'
                },
                comments: [
                    {
                        content: 'This is spam content',
                        author: 'Spam Commenter',
                        email: 'spam@example.com',
                        isApproved: false
                    }
                ]
            });

            const commentId = blogPost.comments[0]._id;
            await blogPost.markCommentAsSpam(commentId);

            const updatedPost = await BlogPost.findById(blogPost._id);
            expect(updatedPost.comments[0].isSpam).to.be.true;
            expect(updatedPost.comments[0].isApproved).to.be.false;
        });

        it('should delete a comment by ID', async () => {
            const blogPost = await BlogPost.create({
                title: 'Delete Comment Post',
                content: 'This is a test post for comment deletion with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Delete Author',
                    email: 'delete@example.com'
                },
                comments: [
                    {
                        content: 'Comment to be deleted',
                        author: 'Delete Commenter',
                        email: 'delete@example.com'
                    },
                    {
                        content: 'Comment to keep',
                        author: 'Keep Commenter',
                        email: 'keep@example.com'
                    }
                ]
            });

            const commentId = blogPost.comments[0]._id;
            await blogPost.deleteComment(commentId);

            const updatedPost = await BlogPost.findById(blogPost._id);
            expect(updatedPost.comments).to.have.length(1);
            expect(updatedPost.comments[0].content).to.equal('Comment to keep');
        });

        it('should like a comment', async () => {
            const blogPost = await BlogPost.create({
                title: 'Like Comment Post',
                content: 'This is a test post for comment liking with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Like Author',
                    email: 'like@example.com'
                },
                comments: [
                    {
                        content: 'Comment to like',
                        author: 'Like Commenter',
                        email: 'like@example.com',
                        likes: 0
                    }
                ]
            });

            const commentId = blogPost.comments[0]._id;
            await blogPost.likeComment(commentId);

            const updatedPost = await BlogPost.findById(blogPost._id);
            expect(updatedPost.comments[0].likes).to.equal(1);
        });

        it('should get approved comments only', async () => {
            const blogPost = await BlogPost.create({
                title: 'Approved Comments Post',
                content: 'This is a test post for approved comments with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Approved Author',
                    email: 'approved@example.com'
                },
                comments: [
                    {
                        content: 'Approved comment',
                        author: 'Approved Commenter',
                        email: 'approved@example.com',
                        isApproved: true,
                        isSpam: false
                    },
                    {
                        content: 'Pending comment',
                        author: 'Pending Commenter',
                        email: 'pending@example.com',
                        isApproved: false,
                        isSpam: false
                    },
                    {
                        content: 'Spam comment',
                        author: 'Spam Commenter',
                        email: 'spam@example.com',
                        isApproved: false,
                        isSpam: true
                    }
                ]
            });

            const approvedComments = blogPost.getApprovedComments();
            expect(approvedComments).to.have.length(1);
            expect(approvedComments[0].content).to.equal('Approved comment');
        });

        it('should get pending comments', async () => {
            const blogPost = await BlogPost.create({
                title: 'Pending Comments Post',
                content: 'This is a test post for pending comments with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Pending Author',
                    email: 'pending@example.com'
                },
                comments: [
                    {
                        content: 'Approved comment',
                        author: 'Approved Commenter',
                        email: 'approved@example.com',
                        isApproved: true
                    },
                    {
                        content: 'Pending comment 1',
                        author: 'Pending Commenter 1',
                        email: 'pending1@example.com',
                        isApproved: false,
                        isSpam: false
                    },
                    {
                        content: 'Pending comment 2',
                        author: 'Pending Commenter 2',
                        email: 'pending2@example.com',
                        isApproved: false,
                        isSpam: false
                    }
                ]
            });

            const pendingComments = blogPost.getPendingComments();
            expect(pendingComments).to.have.length(2);
        });

        it('should get comments by author', async () => {
            const blogPost = await BlogPost.create({
                title: 'Author Comments Post',
                content: 'This is a test post for author comments with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Author Author',
                    email: 'author@example.com'
                },
                comments: [
                    {
                        content: 'Comment by John',
                        author: 'John Doe',
                        email: 'john@example.com'
                    },
                    {
                        content: 'Another comment by John',
                        author: 'John Doe',
                        email: 'john@example.com'
                    },
                    {
                        content: 'Comment by Jane',
                        author: 'Jane Smith',
                        email: 'jane@example.com'
                    }
                ]
            });

            const johnComments = blogPost.getCommentsByAuthor('John Doe');
            expect(johnComments).to.have.length(2);

            const janeComments = blogPost.getCommentsByAuthor('Jane Smith');
            expect(janeComments).to.have.length(1);
        });

        it('should publish the post', async () => {
            const blogPost = await BlogPost.create({
                title: 'Draft Post',
                content: 'This is a draft post that will be published with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Draft Author',
                    email: 'draft@example.com'
                },
                status: 'draft'
            });

            expect(blogPost.status).to.equal('draft');
            expect(blogPost.publishedAt).to.be.undefined;

            await blogPost.publish();

            expect(blogPost.status).to.equal('published');
            expect(blogPost.publishedAt).to.be.instanceOf(Date);
        });

        it('should archive the post', async () => {
            const blogPost = await BlogPost.create({
                title: 'Active Post',
                content: 'This is an active post that will be archived with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Active Author',
                    email: 'active@example.com'
                },
                status: 'published'
            });

            await blogPost.archive();

            expect(blogPost.status).to.equal('archived');
        });

        it('should increment view count', async () => {
            const blogPost = await BlogPost.create({
                title: 'View Post',
                content: 'This is a post for testing view increments with enough content to meet the minimum character requirement.',
                author: {
                    name: 'View Author',
                    email: 'view@example.com'
                },
                metrics: { views: 0 }
            });

            await blogPost.incrementViews();

            expect(blogPost.metrics.views).to.equal(1);
        });
    });

    describe('Static Methods (using utility functions)', () => {
        beforeEach(async () => {
            // Create test data
            await BlogPost.create([
                {
                    title: 'Post 1',
                    content: 'This is the first post with enough content to meet the minimum character requirement.',
                    author: {
                        name: 'Author 1',
                        email: 'author1@example.com'
                    },
                    status: 'published',
                    comments: [
                        {
                            content: 'Comment 1',
                            author: 'Commenter 1',
                            email: 'commenter1@example.com',
                            isApproved: true
                        },
                        {
                            content: 'Comment 2',
                            author: 'Commenter 2',
                            email: 'commenter2@example.com',
                            isApproved: true
                        }
                    ]
                },
                {
                    title: 'Post 2',
                    content: 'This is the second post with enough content to meet the minimum character requirement.',
                    author: {
                        name: 'Author 2',
                        email: 'author2@example.com'
                    },
                    status: 'published',
                    comments: [
                        {
                            content: 'Comment 3',
                            author: 'Commenter 3',
                            email: 'commenter3@example.com',
                            isApproved: true
                        }
                    ]
                },
                {
                    title: 'Post 3',
                    content: 'This is the third post with enough content to meet the minimum character requirement.',
                    author: {
                        name: 'Author 3',
                        email: 'author3@example.com'
                    },
                    status: 'draft',
                    comments: [
                        {
                            content: 'Pending comment',
                            author: 'Pending Commenter',
                            email: 'pending@example.com',
                            isApproved: false
                        }
                    ]
                }
            ]);
        });

        it('should find published posts with pagination (using utility functions)', async () => {
            const publishedPosts = await BlogPost.findPublished(1, 10);
            expect(publishedPosts).to.have.length(2);
            expect(publishedPosts[0].status).to.equal('published');
        });

        it('should find posts with most comments (using aggregation utility)', async () => {
            const mostCommented = await BlogPost.findMostCommented(10);
            expect(mostCommented).to.have.length(3);
            expect(mostCommented[0].commentCount).to.equal(2); // Post 1
            expect(mostCommented[1].commentCount).to.equal(1); // Post 2 or 3
        });

        it('should find posts with pending comments', async () => {
            const postsWithPending = await BlogPost.findWithPendingComments();
            expect(postsWithPending).to.have.length(1);
            expect(postsWithPending[0].title).to.equal('Post 3');
        });

        it('should search posts by text', async () => {
            const searchResults = await BlogPost.search('first', { limit: 10 });
            expect(searchResults).to.have.length(1);
            expect(searchResults[0].title).to.equal('Post 1');
        });

        it('should find posts by tag', async () => {
            const blogPost = await BlogPost.create({
                title: 'Tagged Post',
                content: 'This is a tagged post with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Tag Author',
                    email: 'tag@example.com'
                },
                tags: ['javascript', 'tutorial'],
                status: 'published'
            });

            const taggedPosts = await BlogPost.findByTag('javascript');
            expect(taggedPosts).to.have.length(1);
            expect(taggedPosts[0].title).to.equal('Tagged Post');
        });

        it('should get comment statistics (using aggregation utility)', async () => {
            const stats = await BlogPost.getCommentStats();
            expect(stats).to.have.length(1);
            expect(stats[0].totalComments).to.equal(4);
            expect(stats[0].approvedComments).to.equal(3);
            expect(stats[0].pendingComments).to.equal(1);
        });

        it('should find posts by author email', async () => {
            const authorPosts = await BlogPost.findByAuthor('author1@example.com');
            expect(authorPosts).to.have.length(1);
            expect(authorPosts[0].title).to.equal('Post 1');
        });
    });

    describe('Virtual Fields', () => {
        it('should return comment count', async () => {
            const blogPost = await BlogPost.create({
                title: 'Count Post',
                content: 'This is a post for testing comment count with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Count Author',
                    email: 'count@example.com'
                },
                comments: [
                    {
                        content: 'Comment 1',
                        author: 'Commenter 1',
                        email: 'commenter1@example.com'
                    },
                    {
                        content: 'Comment 2',
                        author: 'Commenter 2',
                        email: 'commenter2@example.com'
                    },
                    {
                        content: 'Comment 3',
                        author: 'Commenter 3',
                        email: 'commenter3@example.com'
                    }
                ]
            });

            expect(blogPost.commentCount).to.equal(3);
        });

        it('should return approved comment count', async () => {
            const blogPost = await BlogPost.create({
                title: 'Approved Count Post',
                content: 'This is a post for testing approved comment count with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Approved Count Author',
                    email: 'approvedcount@example.com'
                },
                comments: [
                    {
                        content: 'Approved comment',
                        author: 'Approved Commenter',
                        email: 'approved@example.com',
                        isApproved: true,
                        isSpam: false
                    },
                    {
                        content: 'Pending comment',
                        author: 'Pending Commenter',
                        email: 'pending@example.com',
                        isApproved: false,
                        isSpam: false
                    },
                    {
                        content: 'Spam comment',
                        author: 'Spam Commenter',
                        email: 'spam@example.com',
                        isApproved: false,
                        isSpam: true
                    }
                ]
            });

            expect(blogPost.approvedCommentCount).to.equal(1);
        });

        it('should return pending comment count', async () => {
            const blogPost = await BlogPost.create({
                title: 'Pending Count Post',
                content: 'This is a post for testing pending comment count with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Pending Count Author',
                    email: 'pendingcount@example.com'
                },
                comments: [
                    {
                        content: 'Approved comment',
                        author: 'Approved Commenter',
                        email: 'approved@example.com',
                        isApproved: true
                    },
                    {
                        content: 'Pending comment 1',
                        author: 'Pending Commenter 1',
                        email: 'pending1@example.com',
                        isApproved: false,
                        isSpam: false
                    },
                    {
                        content: 'Pending comment 2',
                        author: 'Pending Commenter 2',
                        email: 'pending2@example.com',
                        isApproved: false,
                        isSpam: false
                    }
                ]
            });

            expect(blogPost.pendingCommentCount).to.equal(2);
        });

        it('should calculate estimated reading time', async () => {
            const blogPost = await BlogPost.create({
                title: 'Reading Time Post',
                content: 'This is a very long post with enough content to test the reading time calculation. '.repeat(50),
                author: {
                    name: 'Reading Author',
                    email: 'reading@example.com'
                }
            });

            expect(blogPost.estimatedReadingTime).to.be.greaterThan(0);
        });

        it('should generate post URL', async () => {
            const blogPost = await BlogPost.create({
                title: 'URL Test Post',
                content: 'This is a post for testing URL generation with enough content to meet the minimum character requirement.',
                author: {
                    name: 'URL Author',
                    email: 'url@example.com'
                }
            });

            expect(blogPost.url).to.include('/blog/');
        });
    });

    describe('Comment Moderation', () => {
        it('should auto-approve comments when moderation is set to none', async () => {
            const blogPost = await BlogPost.create({
                title: 'No Moderation Post',
                content: 'This is a post with no comment moderation with enough content to meet the minimum character requirement.',
                author: {
                    name: 'No Moderation Author',
                    email: 'nomoderation@example.com'
                },
                commentModeration: 'none'
            });

            await blogPost.addComment({
                content: 'This should be auto-approved',
                author: 'Auto Approve Commenter',
                email: 'autoapprove@example.com'
            });

            expect(blogPost.comments[0].isApproved).to.be.true;
        });

        it('should filter spam when moderation is set to spam-filter', async () => {
            const blogPost = await BlogPost.create({
                title: 'Spam Filter Post',
                content: 'This is a post with spam filtering with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Spam Filter Author',
                    email: 'spamfilter@example.com'
                },
                commentModeration: 'spam-filter'
            });

            // Add spam comment
            await blogPost.addComment({
                content: 'This is spam content with casino and lottery',
                author: 'Spam Commenter',
                email: 'spam@example.com'
            });

            expect(blogPost.comments[0].isApproved).to.be.false;

            // Add normal comment
            await blogPost.addComment({
                content: 'This is a normal comment',
                author: 'Normal Commenter',
                email: 'normal@example.com'
            });

            expect(blogPost.comments[1].isApproved).to.be.true;
        });
    });

    describe('Validation', () => {
        it('should validate required fields', async () => {
            const blogPost = new BlogPost({
                title: 'Test Post',
                // Missing content and author
            });

            try {
                await blogPost.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate content length', async () => {
            const blogPost = new BlogPost({
                title: 'Short Post',
                content: 'Too short',
                author: {
                    name: 'Short Author',
                    email: 'short@example.com'
                }
            });

            try {
                await blogPost.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate author email format', async () => {
            const blogPost = new BlogPost({
                title: 'Invalid Author Post',
                content: 'This is a post with invalid author email with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Invalid Author',
                    email: 'invalid-email'
                }
            });

            try {
                await blogPost.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate comment content length', async () => {
            const blogPost = new BlogPost({
                title: 'Comment Validation Post',
                content: 'This is a post for comment validation with enough content to meet the minimum character requirement.',
                author: {
                    name: 'Comment Validation Author',
                    email: 'commentvalidation@example.com'
                },
                comments: [
                    {
                        content: 'x'.repeat(1001), // Too long
                        author: 'Long Commenter',
                        email: 'long@example.com'
                    }
                ]
            });

            try {
                await blogPost.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await BlogPost.deleteMany({});
    });
});
