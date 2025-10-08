import "../test_helper.js";
import mongoose from "mongoose";
import {expect} from "chai";

/**
 * Mongoose Concepts Demonstration
 * --------------------------------
 * Covers:
 *  1. Schema, Model, and Documents
 *  2. Virtuals (computed fields)
 *  3. toObject() vs toJSON() vs lean()
 *  4. Pre hooks and instance methods for soft delete
 */

// ✅ Clear DB before each test
beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

/**
 * Base schema: A simple User model
 */
const userSchema = new mongoose.Schema({
        firstName: String,
        lastName: String,
        password: String,
        deleted: {type: Boolean, default: false},
    },
    {
        timestamps: true
    }
);

// 1️⃣ ---- VIRTUALS: Computed fields ----
userSchema.virtual("fullName")
    .get(function () {
        return `${this.firstName} ${this.lastName}`;
    })
    .set(function (name) {
        const [first, last] = name.split(" ");
        this.firstName = first;
        this.lastName = last || "";
    });

// 2️⃣ ---- toJSON vs toObject ----
// Hide password when sending as JSON
userSchema.set("toJSON", {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret.password; // hide password
        ret.mode = "toJSON"; // mark to show difference
        return ret;
    },
});

// Add debug flag when converting toObject
userSchema.set("toObject", {
    virtuals: true,
    transform: (doc, ret) => {
        ret.debug = true;
        ret.mode = "toObject";
        return ret;
    },
});

userSchema.set('strict', true);

// 3️⃣ ---- INSTANCE METHOD: softDelete ----
userSchema.methods.softDelete = async function () {
    this.deleted = true;
    await this.save();
};

userSchema.statics.findByFullName = async function (fullName) {
    const [first, last] = fullName.split(" ");
    return this.findOne({firstName: first, lastName: last});
};

// 4️⃣ ---- PRE HOOK: filter out deleted users automatically ----
userSchema.pre(/^find/, function (next) {
    this.where({deleted: false});
    next();
});

userSchema.post('save', function(doc) {
    console.log('User saved successfully:', doc.toJSON());
    console.log('JSON.stringify:', JSON.stringify(doc));
});

const User = mongoose.model("User", userSchema);

describe("🧠 Mongoose Concepts - demo001", () => {

    it("should demonstrate static method usage", async () => {
        await User.create({
            firstName: "Static",
            lastName: "Method",
            password: "1234",
        });

        const found = await User.findByFullName("Static Method");

        expect(found).to.exist;
        expect(found.fullName).to.equal("Static Method");
    });

    it("should demonstrate virtual fields", async () => {
        const user = await User.create({
            firstName: "Vinod",
            lastName: "Madubashana",
            password: "secret",
        });

        expect(user.fullName).to.equal("Vinod Madubashana");

        const user2 = new User();
        user2.fullName = "John Madubashana"; // uses virtual setter
        user2.password = "secret";
        await user2.save();

        const savedUser = await User.findById(user2._id);

        expect(savedUser.firstName).to.equal("John");
        expect(savedUser.lastName).to.equal("Madubashana");
        expect(savedUser.fullName).to.equal("John Madubashana"); // uses virtual getter
    });

    it("should hide password when converting to JSON", async () => {
        const user = await User.create({
            firstName: "Vinod",
            lastName: "M",
            password: "topsecret",
        });

        const json = user.toJSON();
        const obj = user.toObject();

        expect(json).to.have.property("fullName", "Vinod M");
        expect(json).to.not.have.property("password");
        expect(json.mode).to.equal("toJSON");

        expect(obj).to.have.property("password"); // internal use still has it
        expect(obj.debug).to.be.true;
        expect(obj.mode).to.equal("toObject");
    });

    it("should demonstrate the difference between lean() and document methods", async () => {
        await User.create({
            firstName: "Lean",
            lastName: "User",
            password: "pass",
        });

        const normalDoc = await User.findOne({firstName: "Lean"});
        const leanDoc = await User.findOne({firstName: "Lean"}).lean();

        // Normal Mongoose Document
        expect(normalDoc).to.be.instanceOf(mongoose.Document);
        expect(normalDoc.fullName).to.equal("Lean User"); // virtual works
        expect(normalDoc.toJSON).to.be.a("function"); // has mongoose methods

        // Lean object is plain JS
        expect(leanDoc).to.not.have.property("toJSON");
        expect(leanDoc.fullName).to.be.undefined; // virtuals not applied by default
    });

    it("should demonstrate soft delete with pre find hook", async () => {
        const user = await User.create({
            firstName: "Soft",
            lastName: "Delete",
            password: "hidden",
        });

        // Soft delete
        await user.softDelete();

        const allUsers = await User.find();
        expect(allUsers).to.have.lengthOf(0); // hook filters out deleted users

        // const rawUser = await User.findById(user._id).lean();
        // expect(rawUser).to.exist;
    });
});
