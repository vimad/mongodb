import mongoose from 'mongoose';
import { validators, virtuals, indexes, queryOptimization, aggregation, errorHandling } from './utils.js';
const Schema = mongoose.Schema;

// ============================================================================
// MANY-TO-MANY RELATIONSHIPS - JUNCTION COLLECTION APPROACH
// ============================================================================

/**
 * Student Schema
 * Students can enroll in multiple courses
 */
const StudentSchema = new Schema({
    name: { 
        type: String, 
        required: [true, 'Student name is required'],
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
    studentId: {
        type: String,
        unique: true,
        required: [true, 'Student ID is required'],
        match: [/^[A-Z0-9]{6,10}$/, 'Student ID must be 6-10 alphanumeric characters']
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required'],
        validate: {
            validator: function(date) {
                const age = (new Date() - date) / (365.25 * 24 * 60 * 60 * 1000);
                return age >= 16 && age <= 100;
            },
            message: 'Student must be between 16 and 100 years old'
        }
    },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, default: 'USA', trim: true }
    },
    contact: {
        phone: {
            type: String,
            match: [/^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/, 'Please enter a valid phone number']
        },
        emergencyContact: {
            name: { type: String, trim: true },
            phone: { type: String, trim: true },
            relationship: { type: String, trim: true }
        }
    },
    academicInfo: {
        major: { type: String, trim: true },
        year: { 
            type: String, 
            enum: ['freshman', 'sophomore', 'junior', 'senior', 'graduate'],
            default: 'freshman'
        },
        gpa: { 
            type: Number, 
            min: [0, 'GPA cannot be negative'], 
            max: [4, 'GPA cannot exceed 4.0'] 
        }
    },
    enrollmentDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    graduationDate: Date
}, {
    timestamps: true
});

/**
 * Course Schema
 * Courses can have multiple students
 */
const CourseSchema = new Schema({
    title: { 
        type: String, 
        required: [true, 'Course title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    code: {
        type: String,
        required: [true, 'Course code is required'],
        unique: true,
        uppercase: true,
        match: [/^[A-Z]{2,4}\d{3,4}$/, 'Course code must be 2-4 letters followed by 3-4 digits']
    },
    description: {
        type: String,
        required: [true, 'Course description is required'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    credits: { 
        type: Number, 
        required: [true, 'Credits are required'],
        min: [1, 'Course must have at least 1 credit'],
        max: [6, 'Course cannot have more than 6 credits']
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Other']
    },
    instructor: {
        name: { 
            type: String, 
            required: [true, 'Instructor name is required'],
            trim: true
        },
        email: { 
            type: String, 
            required: [true, 'Instructor email is required'],
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        },
        office: { type: String, trim: true },
        officeHours: { type: String, trim: true }
    },
    schedule: {
        days: [{
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        }],
        time: {
            start: { type: String, match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'] },
            end: { type: String, match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'] }
        },
        room: { type: String, trim: true }
    },
    prerequisites: [{
        type: String,
        trim: true
    }],
    maxEnrollment: { 
        type: Number, 
        default: 30,
        min: [1, 'Max enrollment must be at least 1']
    },
    isActive: { type: Boolean, default: true },
    semester: {
        term: { 
            type: String, 
            enum: ['Fall', 'Spring', 'Summer'],
            required: true
        },
        year: { 
            type: Number, 
            required: true,
            min: [2020, 'Year must be 2020 or later'],
            max: [2030, 'Year cannot exceed 2030']
        }
    }
}, {
    timestamps: true
});

/**
 * Enrollment Schema (Junction Collection)
 * Links students to courses with additional metadata
 */
const EnrollmentSchema = new Schema({
    student: { 
        type: Schema.Types.ObjectId, 
        ref: 'Student', 
        required: [true, 'Student reference is required']
    },
    course: { 
        type: Schema.Types.ObjectId, 
        ref: 'Course', 
        required: [true, 'Course reference is required']
    },
    enrolledAt: { 
        type: Date, 
        default: Date.now 
    },
    status: { 
        type: String, 
        enum: ['enrolled', 'completed', 'dropped', 'withdrawn', 'failed'],
        default: 'enrolled'
    },
    grade: { 
        type: String, 
        enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'P', 'NP', null],
        default: null
    },
    creditsEarned: { 
        type: Number, 
        default: 0,
        min: [0, 'Credits earned cannot be negative']
    },
    attendance: {
        totalClasses: { type: Number, default: 0 },
        attendedClasses: { type: Number, default: 0 },
        attendancePercentage: { 
            type: Number, 
            default: 0,
            min: [0, 'Attendance percentage cannot be negative'],
            max: [100, 'Attendance percentage cannot exceed 100']
        }
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters'],
        trim: true
    },
    completedAt: Date,
    droppedAt: Date
}, {
    timestamps: true
});

// ============================================================================
// INDEXES FOR PERFORMANCE (using utility functions)
// ============================================================================

// Student indexes
StudentSchema.index({ email: 1 });
StudentSchema.index({ studentId: 1 });

// Compound index for student queries (using utility)
const studentActiveIndex = indexes.compound(['isActive', 'enrollmentDate'], { background: true });
StudentSchema.index(studentActiveIndex.fields, studentActiveIndex.options);

// Compound index for academic info (using utility)
const academicIndex = indexes.compound(['academicInfo.major', 'academicInfo.year'], { background: true });
StudentSchema.index(academicIndex.fields, academicIndex.options);

// Course indexes
CourseSchema.index({ code: 1 });

// Compound index for department and semester (using utility)
const departmentIndex = indexes.compound(['department', 'semester.term', 'semester.year'], { background: true });
CourseSchema.index(departmentIndex.fields, departmentIndex.options);

// Compound index for course status (using utility)
const courseActiveIndex = indexes.compound(['isActive', 'semester.year', 'semester.term'], { background: true });
CourseSchema.index(courseActiveIndex.fields, courseActiveIndex.options);

// Index for instructor email
CourseSchema.index({ 'instructor.email': 1 });

// Enrollment indexes
// Unique compound index to prevent duplicate enrollments (using utility)
const enrollmentUniqueIndex = indexes.uniqueCompound(['student', 'course']);
EnrollmentSchema.index(enrollmentUniqueIndex.fields, enrollmentUniqueIndex.options);

// Compound index for course and status (using utility)
const enrollmentStatusIndex = indexes.compound(['course', 'status'], { background: true });
EnrollmentSchema.index(enrollmentStatusIndex.fields, enrollmentStatusIndex.options);

// Compound index for student and status (using utility)
const studentStatusIndex = indexes.compound(['student', 'status'], { background: true });
EnrollmentSchema.index(studentStatusIndex.fields, studentStatusIndex.options);

// Index for enrollment date
EnrollmentSchema.index({ enrolledAt: -1 });

// Compound index for grade and status (using utility)
const gradeStatusIndex = indexes.compound(['grade', 'status'], { background: true });
EnrollmentSchema.index(gradeStatusIndex.fields, gradeStatusIndex.options);

// ============================================================================
// VIRTUAL FIELDS (using utility functions)
// ============================================================================

/**
 * Virtual field for student's courses (using utility)
 */
const studentCoursesVirtual = virtuals.createReverseRelationship('_id', 'student', 'Enrollment');
StudentSchema.virtual('courses', studentCoursesVirtual);

/**
 * Virtual field for course's students (using utility)
 */
const courseStudentsVirtual = virtuals.createReverseRelationship('_id', 'course', 'Enrollment');
CourseSchema.virtual('students', courseStudentsVirtual);

/**
 * Virtual field for student's GPA calculation
 */
StudentSchema.virtual('calculatedGPA').get(function() {
    // This would be calculated from completed courses
    return this.academicInfo.gpa || 0;
});

/**
 * Virtual field for course enrollment count (using utility)
 */
const enrollmentCountVirtual = virtuals.createCountField('_id', 'course', 'Enrollment');
enrollmentCountVirtual.match = { status: 'enrolled' };
CourseSchema.virtual('enrollmentCount', enrollmentCountVirtual);

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Enroll student in a course
 */
StudentSchema.methods.enrollInCourse = async function(courseId, options = {}) {
    const Enrollment = mongoose.model('Enrollment');
    const Course = mongoose.model('Course');
    
    // Check if course exists and is active
    const course = await Course.findById(courseId);
    if (!course || !course.isActive) {
        throw new Error('Course not found or not active');
    }
    
    // Check enrollment limit
    const currentEnrollments = await Enrollment.countDocuments({
        course: courseId,
        status: 'enrolled'
    });
    
    if (currentEnrollments >= course.maxEnrollment) {
        throw new Error('Course enrollment limit reached');
    }
    
    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
        student: this._id,
        course: courseId
    });
    
    if (existingEnrollment) {
        if (existingEnrollment.status === 'enrolled') {
            throw new Error('Student is already enrolled in this course');
        } else if (existingEnrollment.status === 'dropped') {
            // Re-enroll
            existingEnrollment.status = 'enrolled';
            existingEnrollment.enrolledAt = new Date();
            existingEnrollment.droppedAt = null;
            return existingEnrollment.save();
        }
    }
    
    // Create new enrollment
    const enrollment = new Enrollment({
        student: this._id,
        course: courseId,
        ...options
    });
    
    return enrollment.save();
};

/**
 * Drop a course
 */
StudentSchema.methods.dropCourse = async function(courseId) {
    const Enrollment = mongoose.model('Enrollment');
    
    const enrollment = await Enrollment.findOne({
        student: this._id,
        course: courseId,
        status: 'enrolled'
    });
    
    if (!enrollment) {
        throw new Error('Student is not enrolled in this course');
    }
    
    enrollment.status = 'dropped';
    enrollment.droppedAt = new Date();
    return enrollment.save();
};

/**
 * Get student's current enrollments
 */
StudentSchema.methods.getCurrentEnrollments = function() {
    const Enrollment = mongoose.model('Enrollment');
    return Enrollment.find({
        student: this._id,
        status: 'enrolled'
    }).populate('course');
};

/**
 * Get student's completed courses
 */
StudentSchema.methods.getCompletedCourses = function() {
    const Enrollment = mongoose.model('Enrollment');
    return Enrollment.find({
        student: this._id,
        status: 'completed'
    }).populate('course');
};

/**
 * Get course's enrolled students
 */
CourseSchema.methods.getEnrolledStudents = function() {
    const Enrollment = mongoose.model('Enrollment');
    return Enrollment.find({
        course: this._id,
        status: 'enrolled'
    }).populate('student');
};

/**
 * Get course statistics (using aggregation utility)
 */
CourseSchema.methods.getStats = async function() {
    const Enrollment = mongoose.model('Enrollment');
    
    const stats = await Enrollment.aggregate([
        aggregation.match({ course: this._id }),
        aggregation.group('$course', {
            totalEnrollments: { $sum: 1 },
            currentEnrollments: {
                $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] }
            },
            completedEnrollments: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            averageGrade: {
                $avg: {
                    $switch: {
                        branches: [
                            { case: { $eq: ['$grade', 'A+'] }, then: 4.0 },
                            { case: { $eq: ['$grade', 'A'] }, then: 4.0 },
                            { case: { $eq: ['$grade', 'A-'] }, then: 3.7 },
                            { case: { $eq: ['$grade', 'B+'] }, then: 3.3 },
                            { case: { $eq: ['$grade', 'B'] }, then: 3.0 },
                            { case: { $eq: ['$grade', 'B-'] }, then: 2.7 },
                            { case: { $eq: ['$grade', 'C+'] }, then: 2.3 },
                            { case: { $eq: ['$grade', 'C'] }, then: 2.0 },
                            { case: { $eq: ['$grade', 'C-'] }, then: 1.7 },
                            { case: { $eq: ['$grade', 'D+'] }, then: 1.3 },
                            { case: { $eq: ['$grade', 'D'] }, then: 1.0 },
                            { case: { $eq: ['$grade', 'D-'] }, then: 0.7 },
                            { case: { $eq: ['$grade', 'F'] }, then: 0.0 }
                        ],
                        default: null
                    }
                }
            }
        })
    ]);
    
    return stats[0] || {
        totalEnrollments: 0,
        currentEnrollments: 0,
        completedEnrollments: 0,
        averageGrade: null
    };
};

// ============================================================================
// STATIC METHODS (using utility functions)
// ============================================================================

/**
 * Find students with most enrollments (using aggregation utility)
 */
StudentSchema.statics.findMostEnrolled = function(limit = 10) {
    return this.aggregate([
        aggregation.lookup('enrollments', '_id', 'student', 'enrollments'),
        {
            $addFields: {
                enrollmentCount: { $size: '$enrollments' },
                currentEnrollments: {
                    $size: {
                        $filter: {
                            input: '$enrollments',
                            cond: { $eq: ['$$this.status', 'enrolled'] }
                        }
                    }
                }
            }
        },
        aggregation.sort({ enrollmentCount: -1 }),
        aggregation.limit(limit),
        aggregation.project({ enrollments: 0 })
    ]);
};

/**
 * Find courses with most enrollments (using aggregation utility)
 */
CourseSchema.statics.findMostPopular = function(limit = 10) {
    return this.aggregate([
        aggregation.lookup('enrollments', '_id', 'course', 'enrollments'),
        {
            $addFields: {
                enrollmentCount: { $size: '$enrollments' },
                currentEnrollments: {
                    $size: {
                        $filter: {
                            input: '$enrollments',
                            cond: { $eq: ['$$this.status', 'enrolled'] }
                        }
                    }
                }
            }
        },
        aggregation.sort({ enrollmentCount: -1 }),
        aggregation.limit(limit),
        aggregation.project({ enrollments: 0 })
    ]);
};

/**
 * Get enrollment statistics (using aggregation utility)
 */
EnrollmentSchema.statics.getEnrollmentStats = function() {
    return this.aggregate([
        aggregation.group('$status', {
            count: { $sum: 1 }
        }),
        aggregation.group('null', {
            statusCounts: {
                $push: {
                    status: '$_id',
                    count: '$count'
                }
            },
            totalEnrollments: { $sum: '$count' }
        })
    ]);
};

/**
 * Find students by grade
 */
EnrollmentSchema.statics.findByGrade = function(grade) {
    return this.find({ grade }).populate('student course');
};

/**
 * Find enrollments by semester
 */
EnrollmentSchema.statics.findBySemester = function(term, year) {
    return this.aggregate([
        aggregation.lookup('courses', 'course', '_id', 'courseInfo'),
        aggregation.match({
            'courseInfo.semester.term': term,
            'courseInfo.semester.year': year
        }),
        aggregation.lookup('students', 'student', '_id', 'studentInfo')
    ]);
};

/**
 * Find students with pagination (using utility functions)
 */
StudentSchema.statics.findWithPagination = function(page = 1, limit = 10, filters = {}) {
    const { skip, limit: queryLimit } = queryOptimization.pagination(page, limit);
    return this.find(filters)
        .skip(skip)
        .limit(queryLimit);
};

/**
 * Find courses with projection (using utility functions)
 */
CourseSchema.statics.findWithProjection = function(filters = {}, fields = ['title', 'code', 'credits', 'department']) {
    const projection = queryOptimization.projection(fields);
    return this.find(filters, projection);
};

// ============================================================================
// PRE/POST MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware for Enrollment - calculate attendance percentage
 */
EnrollmentSchema.pre('save', function(next) {
    if (this.isModified('attendance.totalClasses') || this.isModified('attendance.attendedClasses')) {
        if (this.attendance.totalClasses > 0) {
            this.attendance.attendancePercentage = 
                (this.attendance.attendedClasses / this.attendance.totalClasses) * 100;
        }
    }
    
    // Set completion date when status changes to completed
    if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
        this.completedAt = new Date();
    }
    
    next();
});

/**
 * Post-save middleware for Student
 */
StudentSchema.post('save', function(doc) {
    console.log(`Student ${doc.name} (${doc.studentId}) saved`);
});

/**
 * Post-save middleware for Course
 */
CourseSchema.post('save', function(doc) {
    console.log(`Course ${doc.code} - ${doc.title} saved`);
});

/**
 * Post-save middleware for Enrollment
 */
EnrollmentSchema.post('save', function(doc) {
    console.log(`Enrollment saved: Student ${doc.student} in Course ${doc.course}`);
});

// ============================================================================
// EXPORT MODELS
// ============================================================================

export const Student = mongoose.model('Student', StudentSchema);
export const Course = mongoose.model('Course', CourseSchema);
export const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
