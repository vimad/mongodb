import { 
    CommentPolymorphic, 
    LikePolymorphic, 
    TagPolymorphic, 
    TagAssociation, 
    AttachmentPolymorphic 
} from '../../src/associations/polymorphic.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('Polymorphic Associations (with Utilities)', () => {
    
    beforeEach(async () => {
        // Clean up collections
        await CommentPolymorphic.deleteMany({});
        await LikePolymorphic.deleteMany({});
        await TagPolymorphic.deleteMany({});
        await TagAssociation.deleteMany({});
        await AttachmentPolymorphic.deleteMany({});
    });

    describe('Polymorphic Comments', () => {
        it('should create comments for different entity types', async () => {
            const postComment = await CommentPolymorphic.create({
                content: 'Great post!',
                author: {
                    name: 'Post Commenter',
                    email: 'post@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId(),
                isApproved: true
            });

            const productComment = await CommentPolymorphic.create({
                content: 'Love this product!',
                author: {
                    name: 'Product Commenter',
                    email: 'product@example.com'
                },
                commentableType: 'Product',
                commentableId: new mongoose.Types.ObjectId(),
                isApproved: true
            });

            expect(postComment.commentableType).to.equal('Post');
            expect(productComment.commentableType).to.equal('Product');
        });

        it('should create nested comment replies', async () => {
            const parentComment = await CommentPolymorphic.create({
                content: 'Parent comment',
                author: {
                    name: 'Parent Author',
                    email: 'parent@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId()
            });

            const reply = await CommentPolymorphic.create({
                content: 'Reply to parent',
                author: {
                    name: 'Reply Author',
                    email: 'reply@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId(),
                parent: parentComment._id
            });

            expect(reply.parent.toString()).to.equal(parentComment._id.toString());
            expect(reply.level).to.equal(1);
        });

        it('should populate comment with replies', async () => {
            const parent = await CommentPolymorphic.create({
                content: 'Parent comment',
                author: {
                    name: 'Parent Author',
                    email: 'parent@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId()
            });

            await CommentPolymorphic.create({
                content: 'Reply 1',
                author: {
                    name: 'Reply Author 1',
                    email: 'reply1@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId(),
                parent: parent._id
            });

            await CommentPolymorphic.create({
                content: 'Reply 2',
                author: {
                    name: 'Reply Author 2',
                    email: 'reply2@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId(),
                parent: parent._id
            });

            const parentWithReplies = await CommentPolymorphic.findById(parent._id).populate('replies');
            expect(parentWithReplies.replies).to.have.length(2);
        });

        it('should like a comment', async () => {
            const comment = await CommentPolymorphic.create({
                content: 'Comment to like',
                author: {
                    name: 'Like Author',
                    email: 'like@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId(),
                likes: 0
            });

            await comment.like();

            expect(comment.likes).to.equal(1);
        });

        it('should dislike a comment', async () => {
            const comment = await CommentPolymorphic.create({
                content: 'Comment to dislike',
                author: {
                    name: 'Dislike Author',
                    email: 'dislike@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId(),
                dislikes: 0
            });

            await comment.dislike();

            expect(comment.dislikes).to.equal(1);
        });

        it('should find comments for specific entity', async () => {
            const entityId = new mongoose.Types.ObjectId();

            await CommentPolymorphic.create({
                content: 'Comment 1',
                author: {
                    name: 'Author 1',
                    email: 'author1@example.com'
                },
                commentableType: 'Post',
                commentableId: entityId,
                isApproved: true
            });

            await CommentPolymorphic.create({
                content: 'Comment 2',
                author: {
                    name: 'Author 2',
                    email: 'author2@example.com'
                },
                commentableType: 'Post',
                commentableId: entityId,
                isApproved: true
            });

            const comments = await CommentPolymorphic.findForEntity('Post', entityId);
            expect(comments).to.have.length(2);
        });

        it('should find comments with pagination (using utility functions)', async () => {
            const entityId = new mongoose.Types.ObjectId();

            await CommentPolymorphic.create([
                {
                    content: 'Comment 1',
                    author: {
                        name: 'Author 1',
                        email: 'author1@example.com'
                    },
                    commentableType: 'Post',
                    commentableId: entityId
                },
                {
                    content: 'Comment 2',
                    author: {
                        name: 'Author 2',
                        email: 'author2@example.com'
                    },
                    commentableType: 'Post',
                    commentableId: entityId
                },
                {
                    content: 'Comment 3',
                    author: {
                        name: 'Author 3',
                        email: 'author3@example.com'
                    },
                    commentableType: 'Post',
                    commentableId: entityId
                }
            ]);

            const page1 = await CommentPolymorphic.findWithPagination(1, 2);
            expect(page1).to.have.length(2);

            const page2 = await CommentPolymorphic.findWithPagination(2, 2);
            expect(page2).to.have.length(1);
        });

        it('should get polymorphic statistics (using aggregation utility)', async () => {
            await CommentPolymorphic.create([
                {
                    content: 'Post comment',
                    author: {
                        name: 'Post Author',
                        email: 'post@example.com'
                    },
                    commentableType: 'Post',
                    commentableId: new mongoose.Types.ObjectId(),
                    isApproved: true
                },
                {
                    content: 'Product comment',
                    author: {
                        name: 'Product Author',
                        email: 'product@example.com'
                    },
                    commentableType: 'Product',
                    commentableId: new mongoose.Types.ObjectId(),
                    isApproved: false
                }
            ]);

            const stats = await CommentPolymorphic.getPolymorphicStats();
            expect(stats).to.have.length(2);
            
            const postStats = stats.find(s => s._id === 'Post');
            const productStats = stats.find(s => s._id === 'Product');
            
            expect(postStats.count).to.equal(1);
            expect(postStats.approved).to.equal(1);
            expect(productStats.count).to.equal(1);
            expect(productStats.approved).to.equal(0);
        });
    });

    describe('Polymorphic Likes', () => {
        it('should create likes for different entity types', async () => {
            const userId = new mongoose.Types.ObjectId();
            const postId = new mongoose.Types.ObjectId();
            const productId = new mongoose.Types.ObjectId();

            const postLike = await LikePolymorphic.create({
                user: userId,
                likeableType: 'Post',
                likeableId: postId,
                type: 'like'
            });

            const productLike = await LikePolymorphic.create({
                user: userId,
                likeableType: 'Product',
                likeableId: productId,
                type: 'love'
            });

            expect(postLike.likeableType).to.equal('Post');
            expect(productLike.likeableType).to.equal('Product');
            expect(productLike.type).to.equal('love');
        });

        it('should prevent duplicate likes', async () => {
            const userId = new mongoose.Types.ObjectId();
            const entityId = new mongoose.Types.ObjectId();

            await LikePolymorphic.create({
                user: userId,
                likeableType: 'Post',
                likeableId: entityId,
                type: 'like'
            });

            // This should fail due to unique index
            try {
                await LikePolymorphic.create({
                    user: userId,
                    likeableType: 'Post',
                    likeableId: entityId,
                    type: 'love'
                });
                expect.fail('Should have thrown duplicate key error');
            } catch (error) {
                expect(error.code).to.equal(11000); // Duplicate key error
            }
        });

        it('should find likes for specific entity', async () => {
            const entityId = new mongoose.Types.ObjectId();
            const user1 = new mongoose.Types.ObjectId();
            const user2 = new mongoose.Types.ObjectId();

            await LikePolymorphic.create([
                {
                    user: user1,
                    likeableType: 'Post',
                    likeableId: entityId,
                    type: 'like'
                },
                {
                    user: user2,
                    likeableType: 'Post',
                    likeableId: entityId,
                    type: 'love'
                }
            ]);

            const likes = await LikePolymorphic.findForEntity('Post', entityId);
            expect(likes).to.have.length(2);
        });

        it('should get like count for entity', async () => {
            const entityId = new mongoose.Types.ObjectId();

            await LikePolymorphic.create([
                {
                    user: new mongoose.Types.ObjectId(),
                    likeableType: 'Post',
                    likeableId: entityId,
                    type: 'like'
                },
                {
                    user: new mongoose.Types.ObjectId(),
                    likeableType: 'Post',
                    likeableId: entityId,
                    type: 'love'
                },
                {
                    user: new mongoose.Types.ObjectId(),
                    likeableType: 'Post',
                    likeableId: entityId,
                    type: 'laugh'
                }
            ]);

            const likeCount = await LikePolymorphic.getLikeCount('Post', entityId);
            expect(likeCount).to.equal(3);
        });

        it('should check if user liked entity', async () => {
            const userId = new mongoose.Types.ObjectId();
            const entityId = new mongoose.Types.ObjectId();

            await LikePolymorphic.create({
                user: userId,
                likeableType: 'Post',
                likeableId: entityId,
                type: 'like'
            });

            const hasLiked = await LikePolymorphic.hasUserLiked(userId, 'Post', entityId);
            expect(hasLiked).to.not.be.null;
            expect(hasLiked.type).to.equal('like');

            const hasNotLiked = await LikePolymorphic.hasUserLiked(new mongoose.Types.ObjectId(), 'Post', entityId);
            expect(hasNotLiked).to.be.null;
        });
    });

    describe('Polymorphic Tags', () => {
        it('should create tags and associations', async () => {
            const tag = await TagPolymorphic.create({
                name: 'javascript',
                description: 'JavaScript programming language',
                color: '#f7df1e'
            });

            const entityId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();

            const association = await TagAssociation.create({
                tag: tag._id,
                taggableType: 'Post',
                taggableId: entityId,
                addedBy: userId
            });

            expect(association.tag.toString()).to.equal(tag._id.toString());
            expect(association.taggableType).to.equal('Post');
            expect(association.taggableId.toString()).to.equal(entityId.toString());
        });

        it('should add tag to entity using instance method', async () => {
            const tag = await TagPolymorphic.create({
                name: 'react',
                description: 'React library',
                color: '#61dafb'
            });

            const entityId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();

            await tag.addToEntity('Post', entityId, userId);

            const association = await TagAssociation.findOne({
                tag: tag._id,
                taggableType: 'Post',
                taggableId: entityId
            });

            expect(association).to.not.be.null;
            expect(tag.usageCount).to.equal(1);
        });

        it('should not create duplicate tag associations', async () => {
            const tag = await TagPolymorphic.create({
                name: 'vue',
                description: 'Vue.js framework',
                color: '#4fc08d'
            });

            const entityId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();

            await tag.addToEntity('Post', entityId, userId);
            await tag.addToEntity('Post', entityId, userId); // Should not create duplicate

            const associations = await TagAssociation.find({
                tag: tag._id,
                taggableType: 'Post',
                taggableId: entityId
            });

            expect(associations).to.have.length(1);
            expect(tag.usageCount).to.equal(1);
        });

        it('should remove tag from entity', async () => {
            const tag = await TagPolymorphic.create({
                name: 'angular',
                description: 'Angular framework',
                color: '#dd0031'
            });

            const entityId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();

            await tag.addToEntity('Post', entityId, userId);
            expect(tag.usageCount).to.equal(1);

            await tag.removeFromEntity('Post', entityId);
            expect(tag.usageCount).to.equal(0);

            const association = await TagAssociation.findOne({
                tag: tag._id,
                taggableType: 'Post',
                taggableId: entityId
            });

            expect(association).to.be.null;
        });

        it('should get entities tagged with tag', async () => {
            const tag = await TagPolymorphic.create({
                name: 'nodejs',
                description: 'Node.js runtime',
                color: '#339933'
            });

            const entityId1 = new mongoose.Types.ObjectId();
            const entityId2 = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();

            await tag.addToEntity('Post', entityId1, userId);
            await tag.addToEntity('Post', entityId2, userId);

            // Mock the Post model for testing
            const mockPosts = [
                { _id: entityId1, title: 'Post 1' },
                { _id: entityId2, title: 'Post 2' }
            ];

            // Since we can't actually query the Post model, we'll test the association query
            const associations = await TagAssociation.find({
                tag: tag._id,
                taggableType: 'Post'
            });

            expect(associations).to.have.length(2);
        });

        it('should find tags for specific entity', async () => {
            const tag1 = await TagPolymorphic.create({
                name: 'frontend',
                description: 'Frontend development',
                color: '#ff6b6b'
            });

            const tag2 = await TagPolymorphic.create({
                name: 'backend',
                description: 'Backend development',
                color: '#4ecdc4'
            });

            const entityId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();

            await TagAssociation.create([
                {
                    tag: tag1._id,
                    taggableType: 'Post',
                    taggableId: entityId,
                    addedBy: userId
                },
                {
                    tag: tag2._id,
                    taggableType: 'Post',
                    taggableId: entityId,
                    addedBy: userId
                }
            ]);

            const tags = await TagAssociation.findForEntity('Post', entityId);
            expect(tags).to.have.length(2);
        });

        it('should find entities by tag', async () => {
            const tag = await TagPolymorphic.create({
                name: 'database',
                description: 'Database related',
                color: '#ffa726'
            });

            const entityId1 = new mongoose.Types.ObjectId();
            const entityId2 = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();

            await TagAssociation.create([
                {
                    tag: tag._id,
                    taggableType: 'Post',
                    taggableId: entityId1,
                    addedBy: userId
                },
                {
                    tag: tag._id,
                    taggableType: 'Post',
                    taggableId: entityId2,
                    addedBy: userId
                }
            ]);

            const entities = await TagAssociation.findByTag(tag._id, 'Post');
            expect(entities).to.have.length(2);
        });

        it('should find popular tags', async () => {
            const popularTag = await TagPolymorphic.create({
                name: 'popular',
                description: 'Popular tag',
                color: '#e91e63',
                usageCount: 100
            });

            const unpopularTag = await TagPolymorphic.create({
                name: 'unpopular',
                description: 'Unpopular tag',
                color: '#9e9e9e',
                usageCount: 1
            });

            const popularTags = await TagPolymorphic.findPopular(10);
            expect(popularTags).to.have.length(2);
            expect(popularTags[0].name).to.equal('popular');
        });

        it('should search tags by name', async () => {
            await TagPolymorphic.create([
                {
                    name: 'javascript',
                    description: 'JavaScript',
                    color: '#f7df1e'
                },
                {
                    name: 'java',
                    description: 'Java',
                    color: '#007396'
                },
                {
                    name: 'python',
                    description: 'Python',
                    color: '#3776ab'
                }
            ]);

            const searchResults = await TagPolymorphic.search('java');
            expect(searchResults).to.have.length(2);
            expect(searchResults.map(t => t.name)).to.include.members(['javascript', 'java']);
        });

        it('should find tags with projection (using utility functions)', async () => {
            await TagPolymorphic.create([
                {
                    name: 'tag1',
                    description: 'First tag',
                    color: '#ff0000',
                    usageCount: 10
                },
                {
                    name: 'tag2',
                    description: 'Second tag',
                    color: '#00ff00',
                    usageCount: 20
                }
            ]);

            const tags = await TagPolymorphic.findWithProjection({}, ['name', 'description', 'usageCount']);
            expect(tags).to.have.length(2);
            expect(tags[0].name).to.exist;
            expect(tags[0].description).to.exist;
            expect(tags[0].usageCount).to.exist;
            expect(tags[0].color).to.be.undefined; // Not in projection
        });
    });

    describe('Polymorphic Attachments', () => {
        it('should create attachments for different entity types', async () => {
            const userId = new mongoose.Types.ObjectId();
            const postId = new mongoose.Types.ObjectId();
            const productId = new mongoose.Types.ObjectId();

            const postAttachment = await AttachmentPolymorphic.create({
                filename: 'post-image.jpg',
                originalName: 'post-image.jpg',
                mimeType: 'image/jpeg',
                size: 1024000,
                path: '/uploads/post-image.jpg',
                url: 'https://example.com/uploads/post-image.jpg',
                attachableType: 'Post',
                attachableId: postId,
                uploadedBy: userId,
                metadata: {
                    width: 1920,
                    height: 1080,
                    alt: 'Post image'
                }
            });

            const productAttachment = await AttachmentPolymorphic.create({
                filename: 'product-pdf.pdf',
                originalName: 'product-manual.pdf',
                mimeType: 'application/pdf',
                size: 2048000,
                path: '/uploads/product-pdf.pdf',
                url: 'https://example.com/uploads/product-pdf.pdf',
                attachableType: 'Product',
                attachableId: productId,
                uploadedBy: userId
            });

            expect(postAttachment.attachableType).to.equal('Post');
            expect(productAttachment.attachableType).to.equal('Product');
            expect(postAttachment.metadata.width).to.equal(1920);
        });

        it('should find attachments for specific entity', async () => {
            const userId = new mongoose.Types.ObjectId();
            const entityId = new mongoose.Types.ObjectId();

            await AttachmentPolymorphic.create([
                {
                    filename: 'image1.jpg',
                    originalName: 'image1.jpg',
                    mimeType: 'image/jpeg',
                    size: 1024000,
                    path: '/uploads/image1.jpg',
                    url: 'https://example.com/uploads/image1.jpg',
                    attachableType: 'Post',
                    attachableId: entityId,
                    uploadedBy: userId
                },
                {
                    filename: 'image2.jpg',
                    originalName: 'image2.jpg',
                    mimeType: 'image/jpeg',
                    size: 2048000,
                    path: '/uploads/image2.jpg',
                    url: 'https://example.com/uploads/image2.jpg',
                    attachableType: 'Post',
                    attachableId: entityId,
                    uploadedBy: userId
                }
            ]);

            const attachments = await AttachmentPolymorphic.findForEntity('Post', entityId);
            expect(attachments).to.have.length(2);
        });

        it('should return file extension', async () => {
            const attachment = await AttachmentPolymorphic.create({
                filename: 'document.pdf',
                originalName: 'My Document.pdf',
                mimeType: 'application/pdf',
                size: 1024000,
                path: '/uploads/document.pdf',
                url: 'https://example.com/uploads/document.pdf',
                attachableType: 'Post',
                attachableId: new mongoose.Types.ObjectId(),
                uploadedBy: new mongoose.Types.ObjectId()
            });

            expect(attachment.extension).to.equal('pdf');
        });

        it('should return human-readable file size', async () => {
            const attachment = await AttachmentPolymorphic.create({
                filename: 'large-file.jpg',
                originalName: 'large-file.jpg',
                mimeType: 'image/jpeg',
                size: 1048576, // 1 MB
                path: '/uploads/large-file.jpg',
                url: 'https://example.com/uploads/large-file.jpg',
                attachableType: 'Post',
                attachableId: new mongoose.Types.ObjectId(),
                uploadedBy: new mongoose.Types.ObjectId()
            });

            expect(attachment.humanSize).to.equal('1 MB');
        });
    });

    describe('Validation', () => {
        it('should validate comment content length', async () => {
            const comment = new CommentPolymorphic({
                content: 'x'.repeat(2001), // Too long
                author: {
                    name: 'Long Commenter',
                    email: 'long@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId()
            });

            try {
                await comment.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate commentable type enum', async () => {
            const comment = new CommentPolymorphic({
                content: 'Valid comment',
                author: {
                    name: 'Valid Author',
                    email: 'valid@example.com'
                },
                commentableType: 'InvalidType', // Invalid type
                commentableId: new mongoose.Types.ObjectId()
            });

            try {
                await comment.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate like type enum', async () => {
            const like = new LikePolymorphic({
                user: new mongoose.Types.ObjectId(),
                likeableType: 'Post',
                likeableId: new mongoose.Types.ObjectId(),
                type: 'invalid' // Invalid type
            });

            try {
                await like.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate tag name format', async () => {
            const tag = new TagPolymorphic({
                name: 'Invalid Tag Name!', // Invalid format
                description: 'Invalid tag',
                color: '#ff0000'
            });

            try {
                await tag.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate tag color format', async () => {
            const tag = new TagPolymorphic({
                name: 'invalid-color',
                description: 'Invalid color tag',
                color: 'red' // Invalid hex format
            });

            try {
                await tag.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate attachment file size', async () => {
            const attachment = new AttachmentPolymorphic({
                filename: 'large-file.jpg',
                originalName: 'large-file.jpg',
                mimeType: 'image/jpeg',
                size: -1, // Invalid size
                path: '/uploads/large-file.jpg',
                url: 'https://example.com/uploads/large-file.jpg',
                attachableType: 'Post',
                attachableId: new mongoose.Types.ObjectId(),
                uploadedBy: new mongoose.Types.ObjectId()
            });

            try {
                await attachment.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });
    });

    describe('Pre/Post Middleware', () => {
        it('should set comment level on save', async () => {
            const parent = await CommentPolymorphic.create({
                content: 'Parent comment',
                author: {
                    name: 'Parent Author',
                    email: 'parent@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId()
            });

            const reply = await CommentPolymorphic.create({
                content: 'Reply comment',
                author: {
                    name: 'Reply Author',
                    email: 'reply@example.com'
                },
                commentableType: 'Post',
                commentableId: new mongoose.Types.ObjectId(),
                parent: parent._id
            });

            expect(reply.level).to.equal(1);
        });

        it('should normalize tag name on save', async () => {
            const tag = await TagPolymorphic.create({
                name: '  JavaScript  ', // With spaces and mixed case
                description: 'JavaScript programming',
                color: '#f7df1e'
            });

            expect(tag.name).to.equal('javascript');
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await CommentPolymorphic.deleteMany({});
        await LikePolymorphic.deleteMany({});
        await TagPolymorphic.deleteMany({});
        await TagAssociation.deleteMany({});
        await AttachmentPolymorphic.deleteMany({});
    });
});
