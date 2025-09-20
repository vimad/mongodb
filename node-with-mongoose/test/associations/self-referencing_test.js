import { Category, Comment, Employee } from '../../src/associations/self-referencing.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('Self-Referencing Relationships (with Utilities)', () => {
    
    beforeEach(async () => {
        // Clean up collections
        await Category.deleteMany({});
        await Comment.deleteMany({});
        await Employee.deleteMany({});
    });

    describe('Category Tree Structure', () => {
        it('should create category hierarchy', async () => {
            const rootCategory = await Category.create({
                name: 'Technology',
                slug: 'technology',
                description: 'Technology related categories'
            });

            const subCategory = await Category.create({
                name: 'Programming',
                slug: 'programming',
                description: 'Programming languages and frameworks',
                parent: rootCategory._id
            });

            const subSubCategory = await Category.create({
                name: 'JavaScript',
                slug: 'javascript',
                description: 'JavaScript programming',
                parent: subCategory._id
            });

            expect(subCategory.parent.toString()).to.equal(rootCategory._id.toString());
            expect(subSubCategory.parent.toString()).to.equal(subCategory._id.toString());
        });

        it('should populate category with children', async () => {
            const parent = await Category.create({
                name: 'Parent Category',
                slug: 'parent',
                description: 'Parent category'
            });

            await Category.create({
                name: 'Child 1',
                slug: 'child-1',
                description: 'First child',
                parent: parent._id
            });

            await Category.create({
                name: 'Child 2',
                slug: 'child-2',
                description: 'Second child',
                parent: parent._id
            });

            const parentWithChildren = await Category.findById(parent._id).populate('children');
            expect(parentWithChildren.children).to.have.length(2);
        });

        it('should get category hierarchy path', async () => {
            const root = await Category.create({
                name: 'Root',
                slug: 'root',
                description: 'Root category'
            });

            const level1 = await Category.create({
                name: 'Level 1',
                slug: 'level-1',
                description: 'Level 1 category',
                parent: root._id
            });

            const level2 = await Category.create({
                name: 'Level 2',
                slug: 'level-2',
                description: 'Level 2 category',
                parent: level1._id
            });

            const hierarchyPath = await level2.getHierarchyPath();
            expect(hierarchyPath).to.deep.equal(['Root', 'Level 1', 'Level 2']);
        });

        it('should get all descendants of a category', async () => {
            const root = await Category.create({
                name: 'Root',
                slug: 'root',
                description: 'Root category'
            });

            const child1 = await Category.create({
                name: 'Child 1',
                slug: 'child-1',
                description: 'First child',
                parent: root._id
            });

            const child2 = await Category.create({
                name: 'Child 2',
                slug: 'child-2',
                description: 'Second child',
                parent: root._id
            });

            const grandchild = await Category.create({
                name: 'Grandchild',
                slug: 'grandchild',
                description: 'Grandchild category',
                parent: child1._id
            });

            const descendants = await root.getDescendants();
            expect(descendants).to.have.length(3);
            expect(descendants.map(d => d.name)).to.include.members(['Child 1', 'Child 2', 'Grandchild']);
        });

        it('should get all ancestors of a category', async () => {
            const root = await Category.create({
                name: 'Root',
                slug: 'root',
                description: 'Root category'
            });

            const level1 = await Category.create({
                name: 'Level 1',
                slug: 'level-1',
                description: 'Level 1 category',
                parent: root._id
            });

            const level2 = await Category.create({
                name: 'Level 2',
                slug: 'level-2',
                description: 'Level 2 category',
                parent: level1._id
            });

            const ancestors = await level2.getAncestors();
            expect(ancestors).to.have.length(2);
            expect(ancestors[0].name).to.equal('Root');
            expect(ancestors[1].name).to.equal('Level 1');
        });

        it('should move category to new parent', async () => {
            const root1 = await Category.create({
                name: 'Root 1',
                slug: 'root-1',
                description: 'First root'
            });

            const root2 = await Category.create({
                name: 'Root 2',
                slug: 'root-2',
                description: 'Second root'
            });

            const child = await Category.create({
                name: 'Child',
                slug: 'child',
                description: 'Child category',
                parent: root1._id
            });

            await child.moveToParent(root2._id);

            const updatedChild = await Category.findById(child._id);
            expect(updatedChild.parent.toString()).to.equal(root2._id.toString());
        });

        it('should prevent moving category to itself', async () => {
            const category = await Category.create({
                name: 'Self Move',
                slug: 'self-move',
                description: 'Category for self move test'
            });

            try {
                await category.moveToParent(category._id);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Cannot move category to itself');
            }
        });

        it('should prevent moving category to its descendant', async () => {
            const root = await Category.create({
                name: 'Root',
                slug: 'root',
                description: 'Root category'
            });

            const child = await Category.create({
                name: 'Child',
                slug: 'child',
                description: 'Child category',
                parent: root._id
            });

            try {
                await root.moveToParent(child._id);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Cannot move category to its descendant');
            }
        });

        it('should get category tree structure (using aggregation utility)', async () => {
            const root = await Category.create({
                name: 'Root',
                slug: 'root',
                description: 'Root category'
            });

            const child = await Category.create({
                name: 'Child',
                slug: 'child',
                description: 'Child category',
                parent: root._id
            });

            const tree = await Category.getTree();
            expect(tree).to.have.length(1);
            expect(tree[0].name).to.equal('Root');
            expect(tree[0].children).to.have.length(1);
        });
    });

    describe('Comment Thread Structure', () => {
        it('should create nested comment thread', async () => {
            const parentComment = await Comment.create({
                content: 'This is a parent comment',
                author: {
                    name: 'Parent Author',
                    email: 'parent@example.com'
                }
            });

            const reply1 = await Comment.create({
                content: 'This is a reply to parent',
                author: {
                    name: 'Reply Author 1',
                    email: 'reply1@example.com'
                },
                parent: parentComment._id
            });

            const reply2 = await Comment.create({
                content: 'This is another reply to parent',
                author: {
                    name: 'Reply Author 2',
                    email: 'reply2@example.com'
                },
                parent: parentComment._id
            });

            const nestedReply = await Comment.create({
                content: 'This is a reply to reply',
                author: {
                    name: 'Nested Author',
                    email: 'nested@example.com'
                },
                parent: reply1._id
            });

            expect(reply1.parent.toString()).to.equal(parentComment._id.toString());
            expect(reply2.parent.toString()).to.equal(parentComment._id.toString());
            expect(nestedReply.parent.toString()).to.equal(reply1._id.toString());
        });


        it('should get comment thread path', async () => {
            const level1 = await Comment.create({
                content: 'Level 1 comment',
                author: {
                    name: 'Level 1 Author',
                    email: 'level1@example.com'
                }
            });

            const level2 = await Comment.create({
                content: 'Level 2 comment',
                author: {
                    name: 'Level 2 Author',
                    email: 'level2@example.com'
                },
                parent: level1._id
            });

            const level3 = await Comment.create({
                content: 'Level 3 comment',
                author: {
                    name: 'Level 3 Author',
                    email: 'level3@example.com'
                },
                parent: level2._id
            });

            const threadPath = await level3.getThreadPath();
            expect(threadPath).to.have.length(3);
            expect(threadPath[0]).to.equal(level1._id.toString());
            expect(threadPath[1]).to.equal(level2._id.toString());
            expect(threadPath[2]).to.equal(level3._id.toString());
        });

        it('should like a comment', async () => {
            const comment = await Comment.create({
                content: 'Comment to like',
                author: {
                    name: 'Like Author',
                    email: 'like@example.com'
                },
                likes: 0
            });

            await comment.like();

            expect(comment.likes).to.equal(1);
        });

        it('should dislike a comment', async () => {
            const comment = await Comment.create({
                content: 'Comment to dislike',
                author: {
                    name: 'Dislike Author',
                    email: 'dislike@example.com'
                },
                dislikes: 0
            });

            await comment.dislike();

            expect(comment.dislikes).to.equal(1);
        });

        it('should get comments in thread format', async () => {
            const parent = await Comment.create({
                content: 'Parent comment',
                author: {
                    name: 'Parent Author',
                    email: 'parent@example.com'
                },
                isApproved: true
            });

            await Comment.create({
                content: 'Reply 1',
                author: {
                    name: 'Reply Author 1',
                    email: 'reply1@example.com'
                },
                parent: parent._id,
                isApproved: true
            });

            const thread = await Comment.getThread();
            expect(thread).to.have.length(1);
            expect(thread[0].content).to.equal('Parent comment');
        });
    });

    describe('Employee Hierarchy', () => {
        it('should create employee hierarchy', async () => {
            const ceo = await Employee.create({
                employeeId: 'EMP000001',
                personalInfo: {
                    firstName: 'John',
                    lastName: 'CEO',
                    email: 'ceo@company.com'
                },
                workInfo: {
                    title: 'Chief Executive Officer',
                    department: 'Executive',
                    level: 1,
                    salary: 200000
                }
            });

            const manager = await Employee.create({
                employeeId: 'EMP000002',
                personalInfo: {
                    firstName: 'Jane',
                    lastName: 'Manager',
                    email: 'manager@company.com'
                },
                workInfo: {
                    title: 'Engineering Manager',
                    department: 'Engineering',
                    level: 2,
                    salary: 150000
                },
                manager: ceo._id
            });

            const developer = await Employee.create({
                employeeId: 'EMP000003',
                personalInfo: {
                    firstName: 'Bob',
                    lastName: 'Developer',
                    email: 'developer@company.com'
                },
                workInfo: {
                    title: 'Senior Developer',
                    department: 'Engineering',
                    level: 3,
                    salary: 100000
                },
                manager: manager._id
            });

            expect(manager.manager.toString()).to.equal(ceo._id.toString());
            expect(developer.manager.toString()).to.equal(manager._id.toString());
        });

        it('should get employee management chain', async () => {
            const ceo = await Employee.create({
                employeeId: 'EMP000007',
                personalInfo: {
                    firstName: 'CEO',
                    lastName: 'Name',
                    email: 'ceo@company.com'
                },
                workInfo: {
                    title: 'CEO',
                    department: 'Executive',
                    level: 1,
                    salary: 200000
                }
            });

            const vp = await Employee.create({
                employeeId: 'EMP000008',
                personalInfo: {
                    firstName: 'VP',
                    lastName: 'Name',
                    email: 'vp@company.com'
                },
                workInfo: {
                    title: 'VP Engineering',
                    department: 'Engineering',
                    level: 2,
                    salary: 180000
                },
                manager: ceo._id
            });

            const manager = await Employee.create({
                employeeId: 'EMP000009',
                personalInfo: {
                    firstName: 'Manager',
                    lastName: 'Name',
                    email: 'manager@company.com'
                },
                workInfo: {
                    title: 'Engineering Manager',
                    department: 'Engineering',
                    level: 3,
                    salary: 150000
                },
                manager: vp._id
            });

            const chain = await manager.getManagementChain();
            expect(chain).to.have.length(2);
            expect(chain[0].personalInfo.firstName).to.equal('CEO');
            expect(chain[1].personalInfo.firstName).to.equal('VP');
        });

        it('should get all subordinates recursively', async () => {
            const ceo = await Employee.create({
                employeeId: 'EMP000010',
                personalInfo: {
                    firstName: 'CEO',
                    lastName: 'Name',
                    email: 'ceo@company.com'
                },
                workInfo: {
                    title: 'CEO',
                    department: 'Executive',
                    level: 1,
                    salary: 200000
                }
            });

            const vp = await Employee.create({
                employeeId: 'EMP000011',
                personalInfo: {
                    firstName: 'VP',
                    lastName: 'Name',
                    email: 'vp@company.com'
                },
                workInfo: {
                    title: 'VP Engineering',
                    department: 'Engineering',
                    level: 2,
                    salary: 180000
                },
                manager: ceo._id
            });

            const manager = await Employee.create({
                employeeId: 'EMP000012',
                personalInfo: {
                    firstName: 'Manager',
                    lastName: 'Name',
                    email: 'manager@company.com'
                },
                workInfo: {
                    title: 'Engineering Manager',
                    department: 'Engineering',
                    level: 3,
                    salary: 150000
                },
                manager: vp._id
            });

            const developer = await Employee.create({
                employeeId: 'EMP000013',
                personalInfo: {
                    firstName: 'Developer',
                    lastName: 'Name',
                    email: 'developer@company.com'
                },
                workInfo: {
                    title: 'Developer',
                    department: 'Engineering',
                    level: 4,
                    salary: 100000
                },
                manager: manager._id
            });

            const allSubordinates = await ceo.getAllSubordinates();
            expect(allSubordinates).to.have.length(3);
            expect(allSubordinates.map(e => e.personalInfo.firstName)).to.include.members(['VP', 'Manager', 'Developer']);
        });

        it('should get organizational chart (using aggregation utility)', async () => {
            const ceo = await Employee.create({
                employeeId: 'EMP000014',
                personalInfo: {
                    firstName: 'CEO',
                    lastName: 'Name',
                    email: 'ceo@company.com'
                },
                workInfo: {
                    title: 'CEO',
                    department: 'Executive',
                    level: 1,
                    salary: 200000
                }
            });

            const vp = await Employee.create({
                employeeId: 'EMP000015',
                personalInfo: {
                    firstName: 'VP',
                    lastName: 'Name',
                    email: 'vp@company.com'
                },
                workInfo: {
                    title: 'VP Engineering',
                    department: 'Engineering',
                    level: 2,
                    salary: 180000
                },
                manager: ceo._id
            });

            const orgChart = await Employee.getOrgChart();
            expect(orgChart).to.have.length(1);
            expect(orgChart[0].personalInfo.firstName).to.equal('CEO');
        });

        it('should find employees by department', async () => {
            const engineeringEmployee = await Employee.create({
                employeeId: 'EMP000016',
                personalInfo: {
                    firstName: 'Engineering',
                    lastName: 'Employee',
                    email: 'eng@company.com'
                },
                workInfo: {
                    title: 'Developer',
                    department: 'Engineering',
                    level: 3,
                    salary: 100000
                }
            });

            const salesEmployee = await Employee.create({
                employeeId: 'EMP000017',
                personalInfo: {
                    firstName: 'Sales',
                    lastName: 'Employee',
                    email: 'sales@company.com'
                },
                workInfo: {
                    title: 'Sales Rep',
                    department: 'Sales',
                    level: 3,
                    salary: 80000
                }
            });

            const engineeringEmployees = await Employee.findByDepartment('Engineering');
            expect(engineeringEmployees).to.have.length(1);
            expect(engineeringEmployees[0].personalInfo.firstName).to.equal('Engineering');
        });
    });

    describe('Static Methods (using utility functions)', () => {

        it('should find categories with pagination (using utility functions)', async () => {
            await Category.create([
                {
                    name: 'Category 1',
                    slug: 'category-1',
                    description: 'First category'
                },
                {
                    name: 'Category 2',
                    slug: 'category-2',
                    description: 'Second category'
                },
                {
                    name: 'Category 3',
                    slug: 'category-3',
                    description: 'Third category'
                }
            ]);

            const page1 = await Category.findWithPagination(1, 2);
            expect(page1).to.have.length(2);

            const page2 = await Category.findWithPagination(2, 2);
            expect(page2).to.have.length(1);
        });

        it('should find comments with projection (using utility functions)', async () => {
            await Comment.create([
                {
                    content: 'Comment 1',
                    author: {
                        name: 'Author 1',
                        email: 'author1@example.com'
                    }
                },
                {
                    content: 'Comment 2',
                    author: {
                        name: 'Author 2',
                        email: 'author2@example.com'
                    }
                }
            ]);

            const comments = await Comment.findWithProjection({}, ['content', 'author', 'createdAt']);
            expect(comments).to.have.length(2);
            expect(comments[0].content).to.exist;
            expect(comments[0].author).to.exist;
            expect(comments[0].createdAt).to.exist;
            expect(comments[0].likes).to.be.undefined; // Not in projection
        });
    });

    describe('Validation', () => {

        it('should validate employee age', async () => {
            const employee = new Employee({
                employeeId: 'EMP019',
                personalInfo: {
                    firstName: 'Young',
                    lastName: 'Employee',
                    email: 'young@company.com',
                    dateOfBirth: new Date('2010-01-01') // Too young
                },
                workInfo: {
                    title: 'Intern',
                    department: 'Engineering',
                    level: 5,
                    salary: 30000
                }
            });

            try {
                await employee.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate employee ID format', async () => {
            const employee = new Employee({
                employeeId: 'INVALID', // Invalid format
                personalInfo: {
                    firstName: 'Invalid',
                    lastName: 'Employee',
                    email: 'invalid@company.com'
                },
                workInfo: {
                    title: 'Developer',
                    department: 'Engineering',
                    level: 3,
                    salary: 100000
                }
            });

            try {
                await employee.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await Category.deleteMany({});
        await Comment.deleteMany({});
        await Employee.deleteMany({});
    });
});
