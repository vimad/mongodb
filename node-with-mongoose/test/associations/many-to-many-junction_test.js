import { Student, Course, Enrollment } from '../../src/associations/many-to-many-junction.js';
import { expect } from 'chai';
import '../test_helper.js'

describe('Many-to-Many Relationships - Junction Collection (with Utilities)', () => {
    
    beforeEach(async () => {
        // Clean up collections
        await Student.deleteMany({});
        await Course.deleteMany({});
        await Enrollment.deleteMany({});
    });

    describe('Basic CRUD Operations', () => {
        it('should create student-course relationships through enrollment', async () => {
            const student = await Student.create({
                name: 'Alice Johnson',
                email: 'alice@university.edu',
                studentId: 'STU001',
                dateOfBirth: new Date('2000-01-01')
            });

            const course1 = await Course.create({
                title: 'Database Systems',
                code: 'CS301',
                description: 'Learn database design and implementation',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Dr. Smith',
                    email: 'smith@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            const course2 = await Course.create({
                title: 'Web Development',
                code: 'CS302',
                description: 'Full-stack web development',
                credits: 4,
                department: 'Computer Science',
                instructor: {
                    name: 'Prof. Brown',
                    email: 'brown@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            const enrollment1 = await Enrollment.create({
                student: student._id,
                course: course1._id,
                grade: 'A'
            });

            const enrollment2 = await Enrollment.create({
                student: student._id,
                course: course2._id,
                grade: 'B'
            });

            expect(enrollment1.student.toString()).to.equal(student._id.toString());
            expect(enrollment1.course.toString()).to.equal(course1._id.toString());
            expect(enrollment2.student.toString()).to.equal(student._id.toString());
            expect(enrollment2.course.toString()).to.equal(course2._id.toString());
        });

        it('should find all courses for a student', async () => {
            const student = await Student.create({
                name: 'Bob Wilson',
                email: 'bob@university.edu',
                studentId: 'STU002',
                dateOfBirth: new Date('1999-05-15')
            });

            const course1 = await Course.create({
                title: 'Data Structures',
                code: 'CS201',
                description: 'Advanced data structures and algorithms',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Dr. Davis',
                    email: 'davis@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            const course2 = await Course.create({
                title: 'Software Engineering',
                code: 'CS401',
                description: 'Software development methodologies',
                credits: 4,
                department: 'Computer Science',
                instructor: {
                    name: 'Prof. Wilson',
                    email: 'wilson@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            await Enrollment.create({ student: student._id, course: course1._id });
            await Enrollment.create({ student: student._id, course: course2._id });

            const studentCourses = await Enrollment.find({ student: student._id })
                .populate('course');

            expect(studentCourses).to.have.length(2);
            expect(studentCourses[0].course.title).to.be.oneOf(['Data Structures', 'Software Engineering']);
        });

        it('should find all students in a course', async () => {
            const student1 = await Student.create({
                name: 'Charlie Brown',
                email: 'charlie@university.edu',
                studentId: 'STU003',
                dateOfBirth: new Date('2001-03-20')
            });

            const student2 = await Student.create({
                name: 'Diana Prince',
                email: 'diana@university.edu',
                studentId: 'STU004',
                dateOfBirth: new Date('2000-08-10')
            });

            const course = await Course.create({
                title: 'Machine Learning',
                code: 'CS501',
                description: 'Introduction to machine learning algorithms',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Dr. AI',
                    email: 'ai@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            await Enrollment.create({ student: student1._id, course: course._id });
            await Enrollment.create({ student: student2._id, course: course._id });

            const courseStudents = await Enrollment.find({ course: course._id })
                .populate('student');

            expect(courseStudents).to.have.length(2);
            expect(courseStudents[0].student.name).to.be.oneOf(['Charlie Brown', 'Diana Prince']);
        });
    });

    describe('Instance Methods', () => {
        it('should enroll student in a course', async () => {
            const student = await Student.create({
                name: 'Enroll Student',
                email: 'enroll@university.edu',
                studentId: 'STU005',
                dateOfBirth: new Date('2000-01-01')
            });

            const course = await Course.create({
                title: 'Test Course',
                code: 'TEST101',
                description: 'A test course for enrollment',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Test Instructor',
                    email: 'test@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                },
                maxEnrollment: 30
            });

            await student.enrollInCourse(course._id);

            const enrollment = await Enrollment.findOne({
                student: student._id,
                course: course._id
            });

            expect(enrollment).to.not.be.null;
            expect(enrollment.status).to.equal('enrolled');
        });

        it('should drop a course', async () => {
            const student = await Student.create({
                name: 'Drop Student',
                email: 'drop@university.edu',
                studentId: 'STU006',
                dateOfBirth: new Date('2000-01-01')
            });

            const course = await Course.create({
                title: 'Drop Course',
                code: 'DROP101',
                description: 'A course to be dropped',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Drop Instructor',
                    email: 'drop@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            await student.enrollInCourse(course._id);
            await student.dropCourse(course._id);

            const enrollment = await Enrollment.findOne({
                student: student._id,
                course: course._id
            });

            expect(enrollment.status).to.equal('dropped');
            expect(enrollment.droppedAt).to.be.instanceOf(Date);
        });

        it('should get current enrollments', async () => {
            const student = await Student.create({
                name: 'Current Student',
                email: 'current@university.edu',
                studentId: 'STU007',
                dateOfBirth: new Date('2000-01-01')
            });

            const course1 = await Course.create({
                title: 'Current Course 1',
                code: 'CURR101',
                description: 'First current course',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Current Instructor',
                    email: 'current@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            const course2 = await Course.create({
                title: 'Current Course 2',
                code: 'CURR102',
                description: 'Second current course',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Current Instructor',
                    email: 'current@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            await student.enrollInCourse(course1._id);
            await student.enrollInCourse(course2._id);

            const currentEnrollments = await student.getCurrentEnrollments();
            expect(currentEnrollments).to.have.length(2);
        });

        it('should get course statistics (using aggregation utility)', async () => {
            const course = await Course.create({
                title: 'Stats Course',
                code: 'STAT101',
                description: 'A course for statistics testing',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Stats Instructor',
                    email: 'stats@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            const student1 = await Student.create({
                name: 'Stats Student 1',
                email: 'stats1@university.edu',
                studentId: 'STU008',
                dateOfBirth: new Date('2000-01-01')
            });

            const student2 = await Student.create({
                name: 'Stats Student 2',
                email: 'stats2@university.edu',
                studentId: 'STU009',
                dateOfBirth: new Date('2000-01-01')
            });

            await Enrollment.create({
                student: student1._id,
                course: course._id,
                status: 'completed',
                grade: 'A'
            });

            await Enrollment.create({
                student: student2._id,
                course: course._id,
                status: 'enrolled'
            });

            const stats = await course.getStats();
            expect(stats.totalEnrollments).to.equal(2);
            expect(stats.currentEnrollments).to.equal(1);
            expect(stats.completedEnrollments).to.equal(1);
        });
    });

    describe('Static Methods (using utility functions)', () => {
        beforeEach(async () => {
            // Create test data
            const students = await Student.create([
                {
                    name: 'Student 1',
                    email: 'student1@university.edu',
                    studentId: 'STU010',
                    dateOfBirth: new Date('2000-01-01')
                },
                {
                    name: 'Student 2',
                    email: 'student2@university.edu',
                    studentId: 'STU011',
                    dateOfBirth: new Date('2000-01-01')
                }
            ]);

            const courses = await Course.create([
                {
                    title: 'Course 1',
                    code: 'COURSE101',
                    description: 'First test course',
                    credits: 3,
                    department: 'Computer Science',
                    instructor: {
                        name: 'Instructor 1',
                        email: 'instructor1@university.edu'
                    },
                    semester: {
                        term: 'Fall',
                        year: 2023
                    }
                },
                {
                    title: 'Course 2',
                    code: 'COURSE102',
                    description: 'Second test course',
                    credits: 4,
                    department: 'Computer Science',
                    instructor: {
                        name: 'Instructor 2',
                        email: 'instructor2@university.edu'
                    },
                    semester: {
                        term: 'Fall',
                        year: 2023
                    }
                }
            ]);

            // Create enrollments
            await Enrollment.create([
                { student: students[0]._id, course: courses[0]._id, grade: 'A' },
                { student: students[0]._id, course: courses[1]._id, grade: 'B' },
                { student: students[1]._id, course: courses[0]._id, grade: 'A' }
            ]);
        });

        it('should find students with most enrollments (using aggregation utility)', async () => {
            const mostEnrolled = await Student.findMostEnrolled(10);
            expect(mostEnrolled).to.have.length(2);
            expect(mostEnrolled[0].enrollmentCount).to.equal(2); // Student 1
            expect(mostEnrolled[1].enrollmentCount).to.equal(1); // Student 2
        });

        it('should find courses with most enrollments (using aggregation utility)', async () => {
            const mostPopular = await Course.findMostPopular(10);
            expect(mostPopular).to.have.length(2);
            expect(mostPopular[0].enrollmentCount).to.equal(2); // Course 1
            expect(mostPopular[1].enrollmentCount).to.equal(1); // Course 2
        });

        it('should get enrollment statistics (using aggregation utility)', async () => {
            const stats = await Enrollment.getEnrollmentStats();
            expect(stats).to.have.length(1);
            expect(stats[0].totalEnrollments).to.equal(3);
        });

        it('should find enrollments by grade', async () => {
            const aGradeEnrollments = await Enrollment.findByGrade('A');
            expect(aGradeEnrollments).to.have.length(2);
        });

        it('should find enrollments by semester', async () => {
            const fallEnrollments = await Enrollment.findBySemester('Fall', 2023);
            expect(fallEnrollments).to.have.length(3);
        });

        it('should find students with pagination (using utility functions)', async () => {
            const page1 = await Student.findWithPagination(1, 1);
            expect(page1).to.have.length(1);
            
            const page2 = await Student.findWithPagination(2, 1);
            expect(page2).to.have.length(1);
        });

        it('should find courses with projection (using utility functions)', async () => {
            const courses = await Course.findWithProjection({}, ['title', 'code', 'credits']);
            expect(courses).to.have.length(2);
            expect(courses[0].title).to.exist;
            expect(courses[0].code).to.exist;
            expect(courses[0].credits).to.exist;
            expect(courses[0].description).to.be.undefined; // Not in projection
        });
    });

    describe('Validation and Constraints', () => {
        it('should prevent duplicate enrollments', async () => {
            const student = await Student.create({
                name: 'Duplicate Student',
                email: 'duplicate@university.edu',
                studentId: 'STU012',
                dateOfBirth: new Date('2000-01-01')
            });

            const course = await Course.create({
                title: 'Duplicate Course',
                code: 'DUP101',
                description: 'A course for duplicate testing',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Duplicate Instructor',
                    email: 'duplicate@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            await Enrollment.create({
                student: student._id,
                course: course._id
            });

            // This should fail due to unique index
            try {
                await Enrollment.create({
                    student: student._id,
                    course: course._id
                });
                expect.fail('Should have thrown duplicate key error');
            } catch (error) {
                expect(error.code).to.equal(11000); // Duplicate key error
            }
        });

        it('should validate student age', async () => {
            const student = new Student({
                name: 'Young Student',
                email: 'young@university.edu',
                studentId: 'STU013',
                dateOfBirth: new Date('2010-01-01') // Too young
            });

            try {
                await student.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should validate course code format', async () => {
            const course = new Course({
                title: 'Invalid Code Course',
                code: 'INVALID', // Invalid format
                description: 'A course with invalid code',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Invalid Instructor',
                    email: 'invalid@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            try {
                await course.save();
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });
    });

    describe('Virtual Fields', () => {
        it('should return student full name', async () => {
            const student = await Student.create({
                name: 'John Doe',
                email: 'john@university.edu',
                studentId: 'STU014',
                dateOfBirth: new Date('2000-01-01')
            });

            expect(student.fullName).to.equal('John Doe');
        });

        it('should return category full path', async () => {
            const course = await Course.create({
                title: 'Test Course',
                code: 'TEST101',
                description: 'A test course',
                credits: 3,
                department: 'Computer Science',
                instructor: {
                    name: 'Test Instructor',
                    email: 'test@university.edu'
                },
                semester: {
                    term: 'Fall',
                    year: 2023
                }
            });

            // This would be populated when querying
            const courseWithEnrollments = await Course.findById(course._id).populate('enrollmentCount');
            expect(courseWithEnrollments).to.not.be.null;
        });
    });

    afterEach(async () => {
        // Clean up after each test
        await Student.deleteMany({});
        await Course.deleteMany({});
        await Enrollment.deleteMany({});
    });
});
