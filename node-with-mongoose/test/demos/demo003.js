import "../test_helper.js";
import mongoose from "mongoose";
import {expect} from "chai";

/**
 * Mongoose Advanced Validations & Middleware — Week 3 (demo003)
 * -------------------------------------------------------------
 * Each test is minimal and focused on a single idea:
 *  1. Async validator (username uniqueness)
 *  2. Cross-field validation (password vs passwordConfirm)
 *  3. Middleware-based rule (admin must provide adminCode)
 *  4. runValidators on updates (catch invalid updates)
 */

// ✅ Clear DB before each test
beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

// ------------------ SCHEMAS ------------------

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            minlength: 3,
        },
        password: {type: String, required: true, minlength: 8, select: false},
        passwordConfirm: {type: String, required: true, select: false},
        role: {type: String, enum: ["user", "admin"], default: "user"},
        adminCode: {type: String, select: false},
    },
    {timestamps: true}
);

// 1️⃣ Async validator: ensure username uniqueness without a unique index
userSchema.path("username").validate(
    async function (value) {
        const Model = mongoose.models.AdvUser || mongoose.model("AdvUser", userSchema);
        const count = await Model.countDocuments({username: value, _id: {$ne: this._id}});
        return count === 0;
    },
    "Username already taken"
);

// 2️⃣ Cross-field validation: passwordConfirm must match password (works for create + updates)
userSchema.path("passwordConfirm").validate(function (v) {
    // Case A: Document validation (create/save)
    if (this instanceof mongoose.Model) {
        if (this.isNew || this.isModified("password") || this.isModified("passwordConfirm")) {
            return v === this.get("password");
        }
        return true;
    }


    // Case B: Query validation (update with runValidators)
    const getUpdate = typeof this.getUpdate === "function" ? this.getUpdate() : {};
    const $set = getUpdate?.$set || getUpdate || {};


    // Only validate if either password or passwordConfirm is being updated
    if (Object.prototype.hasOwnProperty.call($set, "password") || Object.prototype.hasOwnProperty.call($set, "passwordConfirm")) {
        return $set.password === $set.passwordConfirm;
    }


    return true;
}, "Passwords do not match");

// 3️⃣ Middleware rule: admins must provide adminCode
userSchema.pre("validate", function (next) {
    if (this.role === "admin" && !this.adminCode) {
        throw new Error("adminCode is required for admin role")
        // return next(new Error("adminCode is required for admin role"));
    }
    next();
});

// Helper to get/create the model exactly once
function getUserModel() {
    return mongoose.models.AdvUser || mongoose.model("AdvUser", userSchema);
}

// ------------------ TESTS ------------------

describe("🔒 Mongoose Advanced Validations - demo003", () => {
    it("1) async validator: username must be unique (minimal)", async () => {
        const User = getUserModel();

        await User.create({username: "alice", password: "password123", passwordConfirm: "password123"});

        try {
            await User.create({username: "alice", password: "password456", passwordConfirm: "password456"});
            throw new Error("expected async validator to block duplicate username");
        } catch (err) {
            expect(String(err)).to.contain("Username already taken");
        }
    });

    it("2) cross-field: passwordConfirm must match password", async () => {
        const User = getUserModel();

        // mismatch
        const u = new User({username: "bob", password: "password123", passwordConfirm: "nope"});
        try {
            await u.validate();
            throw new Error("expected cross-field validation error");
        } catch (err) {
            expect(String(err)).to.contain("Passwords do not match");
        }

        // match
        const ok = new User({username: "bob", password: "password123", passwordConfirm: "password123"});
        await ok.validate();
        expect(ok.isNew).to.equal(true);
    });

    it("3) middleware rule: admin requires adminCode (pre('validate'))", async () => {
        const User = getUserModel();

        // missing adminCode
        const admin = new User({
            username: "root",
            password: "password123",
            passwordConfirm: "password123",
            role: "admin"
        });
        try {
            await admin.validate();
            throw new Error("expected adminCode requirement to fail");
        } catch (err) {
            expect(String(err)).to.contain("adminCode is required for admin role");
        }

        // with adminCode
        const adminOk = new User({
            username: "root",
            password: "password123",
            passwordConfirm: "password123",
            role: "admin",
            adminCode: "XYZ-123",
        });
        await adminOk.validate();
        expect(adminOk.isNew).to.equal(true);
    });

    it("4) runValidators on update: catch invalid updates (minlength, cross-field)", async () => {
        const User = getUserModel();

        const doc = await User.create({username: "charlie", password: "password123", passwordConfirm: "password123"});

        // (a) Without runValidators: too-short username is accepted by Mongo update
        await User.updateOne({_id: doc._id}, {$set: {username: "ab"}});
        const fetched1 = await User.findById(doc._id).lean();
        expect(fetched1.username).to.equal("ab"); // no validators ran here

        // (b) With runValidators: attempt another invalid update -> should fail
        try {
            await User.updateOne({_id: doc._id}, {$set: {username: "a"}}, {runValidators: true});
            throw new Error("expected update to fail minlength validator");
        } catch (err) {
            expect(String(err)).to.match(/is shorter than the minimum/);
        }

        // (c) With runValidators: password + confirm must still match when changed
        try {
            await User.updateOne(
                {_id: doc._id},
                {$set: {password: "newpassword", passwordConfirm: "mismatch"}},
                {runValidators: true}
            );
            throw new Error("expected cross-field validator to fail on update");
        } catch (err) {
            expect(String(err)).to.contain("Passwords do not match");
        }
    });
});
