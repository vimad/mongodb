import "../test_helper.js";
import mongoose from "mongoose";
import { expect } from "chai";

/**
 * Associations in Mongoose — One-to-Many (Week 4) — demo004
 * ---------------------------------------------------------
 * Focus: One User → Many Posts
 * What we show (each test is minimal & focused):
 *  1) Without populate: raw ObjectId on the many-side
 *  2) With populate (basic): Post → author fields
 *  3) Reverse populate via virtual: User → posts[]
 *  4) Populate + lean + projection: performance-friendly reads
 *  5) Quirks: selecting out localField prevents populate; match/sort/limit in populate
 */

beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

// ------------------ SCHEMAS ------------------

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, lowercase: true, trim: true, unique: true },
        name: { type: String, required: true },
    },
    { timestamps: true }
);

const postSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "AssocUser", required: true }, // many → one
    },
    { timestamps: true }
);

// Reverse populate (virtual): from one (User) to many (Posts)
userSchema.virtual("posts", {
    ref: "AssocPost",
    localField: "_id",
    foreignField: "author",
    justOne: false,
});

const User = mongoose.model("AssocUser", userSchema);
const Post = mongoose.model("AssocPost", postSchema);

// Small helper to seed data
async function seed() {
    const alice = await User.create({ email: "alice@example.com", name: "Alice" });
    const bob = await User.create({ email: "bob@example.com", name: "Bob" });

    const p1 = await Post.create({ title: "Hello", author: alice._id });
    const p2 = await Post.create({ title: "World", author: alice._id });
    const p3 = await Post.create({ title: "Bob's Post", author: bob._id });

    return { alice, bob, p1, p2, p3 };
}

// ------------------ TESTS ------------------

describe("🧩 Associations — One-to-Many (demo004)", () => {
    it("1) Without populate: many-side holds an ObjectId", async () => {
        const { alice, p1 } = await seed();

        const raw = await Post.findById(p1._id).lean();
        expect(raw.author.toString()).to.equal(alice._id.toString()); // plain ObjectId
        expect(raw).to.not.have.property("author", { email: alice.email }); // not populated
    });

    it("2) With populate: Post → author (basic)", async () => {
        const { p1 } = await seed();

        const populated = await Post.findById(p1._id)
            .populate("author", "email name") // only fetch needed fields
            .exec();

        expect(populated.author).to.exist;
        expect(populated.author).to.have.property("email", "alice@example.com");
        expect(populated.author).to.have.property("name", "Alice");
    });

    it("3) Reverse populate via virtual: User → posts[]", async () => {
        const { alice } = await seed();

        const userWithPosts = await User.findById(alice._id).populate({
            path: "posts",
            select: "title createdAt",
            options: { sort: { createdAt: -1 } },
        });

        expect(userWithPosts.posts).to.be.an("array").with.length(2);
        expect(userWithPosts.posts[0]).to.have.property("title");
    });

    it("4) Populate with lean + projection: fast read pattern", async () => {
        const { alice } = await seed();

        // Get Alice's posts with author summarized (lean objects, no mongoose doc methods)
        const posts = await Post.find({ author: alice._id })
            .select("title author")
            .populate({ path: "author", select: "name" })
            .lean();

        expect(Array.isArray(posts)).to.equal(true);
        expect(posts[0]).to.not.have.property("toJSON"); // lean removes mongoose methods
        expect(posts[0].author).to.have.property("name", "Alice");
    });

    it("5) Quirk: populate still works when localField is excluded (because query filters by it)", async () => {
        const { alice } = await seed();

        const q = await Post.findOne({ author: alice._id, title: "Hello" }).select("-author");
        expect(q.author).to.undefined;

        // populate still works via inferred author
        const doc = await Post.findOne({ author: alice._id, title: "Hello" })
            .select("-author")                  // exclude localField only (valid projection)
            .populate("author", "name")        // populate still works via inferred author
            .lean();

        expect(doc).to.exist;
        expect(doc.title).to.equal("Hello");
        expect(doc.author).to.exist;
        expect(doc.author.name).to.equal("Alice");
    });

    it("6) Aggregation: count posts per user with $lookup (single server-side query)", async () => {
        await seed(); // creates Alice(2 posts) and Bob(1 post)

        const result = await User.aggregate([
            {
                $lookup: {
                    from: Post.collection.name,     // e.g., "assocposts"
                    localField: "_id",
                    foreignField: "author",
                    as: "posts",
                },
            },
            {
                $project: {
                    name: 1,
                    postsCount: { $size: "$posts" },
                },
            },
            { $sort: { name: 1 } },
        ]);

        const aliceRow = result.find(r => r.name === "Alice");
        const bobRow = result.find(r => r.name === "Bob");

        expect(aliceRow).to.exist;
        expect(bobRow).to.exist;
        expect(aliceRow.postsCount).to.equal(2);
        expect(bobRow.postsCount).to.equal(1);
    });
});
