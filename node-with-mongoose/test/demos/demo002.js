import "../test_helper.js";
import mongoose from "mongoose";
import { expect } from "chai";

/**
 * Mongoose Concepts Demonstration - Week 2 (demo002)
 * --------------------------------------------------
 * Focus areas (each example is minimal & focused):
 *  1. Validation basics (required, format, custom)
 *  2. Indexes (unique) & duplicate key error handling
 *  3. Field selection (select: false) & opting-in with +
 *  4. Query helpers for composable filters
 *  5. Populate: reference another model
 */

// ✅ Clear DB before each test
beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

/**
 * Base User schema for this demo
 */
const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            match: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, // minimal email shape
            unique: true, // unique index
            // validate: {
            //     validator: v => v.endsWith('@example.com'),
            //     message: props => `${props.value} is not from example.com`,
            // }
        },
        password: { type: String, required: true, select: false }, // hidden by default
        role: { type: String, enum: ["user", "admin"], default: "user" },
        deleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// 1️⃣ ---- Custom validator (minimal): block disposable domains ----
const BLOCKED_DOMAINS = new Set(["mailinator.com", "tempmail.com"]);
userSchema.path("email").validate(function (value) {
    const domain = value.split("@")[1];
    return !BLOCKED_DOMAINS.has(domain);
}, "Email domain is not allowed");

//
// 2️⃣ ---- Query helpers: chainable, minimal surface ----
userSchema.query.notDeleted = function () {
    return this.where({ deleted: false });
};
// userSchema.pre('aggregate', function () {
//     // Example: always filter soft-deleted docs unless explicitly opted out
//     const hasMatch = this.pipeline().some(p => p.$match && Object.prototype.hasOwnProperty.call(p.$match, 'deleted'));
//     if (!hasMatch) {
//         this.pipeline().unshift({ $match: { deleted: false } });
//     }
// });

userSchema.query.byEmailDomain = function (domain) {
    // Case-insensitive domain match
    return this.where({ email: new RegExp(`@${domain}$`, "i") });
};

// (Optional) Small static to quickly create a user in tests
userSchema.statics.make = function (overrides = {}) {
    const base = {
        email: `user_${Math.random().toString(36).slice(2)}@example.com`,
        password: "secret",
    };
    return this.create({ ...base, ...overrides });
};

const User = mongoose.model("Demo2User", userSchema);

/**
 * Post schema to demonstrate populate
 */
const postSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "Demo2User", required: true },
    },
    { timestamps: true }
);

const Post = mongoose.model("Demo2Post", postSchema);

// ------------------ TESTS ------------------

describe("🧪 Mongoose - demo002", () => {
    it("1) should enforce required & format validation (minimal)", async () => {
        // missing email
        const u1 = new User({ password: "pw" });
        try {
            await u1.validate();
            throw new Error("expected validation error");
        } catch (err) {
            expect(err).to.have.property("errors");
            expect(err.errors).to.have.property("email");
        }

        // bad format
        const u2 = new User({ email: "bad-email", password: "pw" });
        try {
            await u2.validate();
            throw new Error("expected validation error");
        } catch (err) {
            expect(err.errors).to.have.property("email");
        }

        // blocked domain by custom validator
        const u3 = new User({ email: "a@tempmail.com", password: "pw" });
        try {
            await u3.validate();
            throw new Error("expected validation error");
        } catch (err) {
            expect(String(err)).to.contain("Email domain is not allowed");
        }

        // valid
        const ok = new User({ email: "ok@example.com", password: "pw" });
        await ok.validate();
        expect(ok.isNew).to.equal(true);
    });

    it("2) should enforce unique index on email (and show duplicate key)", async () => {
        await User.create({ email: "dup@example.com", password: "pw" });

        try {
            await User.create({ email: "dup@example.com", password: "pw2" });
            throw new Error("expected duplicate key error");
        } catch (err) {
            // NOTE: Mongo duplicate key is code 11000
            expect(err).to.have.property("code", 11000);
        }
    });

    it("3) should demonstrate select:false and opting-in with +password", async () => {
        await User.create({ email: "see@example.com", password: "topsecret" });

        const docDefault = await User.findOne({ email: "see@example.com" });
        expect(docDefault).to.exist;
        // password is excluded by default
        expect(docDefault.toObject()).to.not.have.property("password");

        const docWithPw = await User.findOne({ email: "see@example.com" }).select("+password email");
        expect(docWithPw.toObject()).to.have.property("password", "topsecret");
    });

    it("4) should use query helpers: .notDeleted().byEmailDomain()", async () => {
        await User.make({ email: "a@example.com" });
        await User.make({ email: "b@sample.org" });
        await User.make({ email: "c@example.com", deleted: true });

        // const users = await User.find()
        //     .notDeleted()
        //     .byEmailDomain('example.com')
        //     .paginate(1, 20)
        //     .sort('-createdAt')
        //     .select('email role')
        //     .lean();
        const result = await User.find().notDeleted().byEmailDomain("example.com");
        expect(result).to.have.length(1);
        expect(result[0].email).to.equal("a@example.com");
    });

    it("5) should populate a referenced author on Post (minimal)", async () => {
        const author = await User.create({ email: "author@example.com", password: "pw" });
        const post = await Post.create({ title: "Hello", author: author._id });

        const populated = await Post.findById(post._id).populate("author", "email role");
        expect(populated).to.exist;
        expect(populated.author).to.have.property("email", "author@example.com");
        // Only selected fields are present
        expect(populated.author.password).to.undefined;
    });
});
