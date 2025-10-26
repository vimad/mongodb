import "../../test_helper.js";
import mongoose from "mongoose";
import { expect } from "chai";

/**
 *
 * --------------------------------------------------
 * Goal: Showcase a pragmatic way to keep a *cheap, approximate* aggregate on a parent
 * document (e.g., product.ratingAvgApprox) instead of running heavy $group pipelines
 * on every request.
 *
 * Scenario:
 *  - We have many Rating events (child docs) for a Product.
 *  - True average rating requires scanning many Rating docs (slow at scale).
 *  - Instead, we maintain an *approximate* running average on Product using
 *    an Exponential Moving Average (EMA) that updates cheaply per event.
 *  - Occasionally (e.g., daily/weekly/threshold-based), we "correct" the drift by
 *    recomputing the true average with an aggregation and resetting the approx.
 *
 * What this tests shows (each test is focused):
 *  1) Baseline: cheap per-event update using EMA gets close to the true average
 *  2) First-event edge case: EMA initializes cleanly
 *  3) Periodic correction: one aggregation recalibrates drift
 *
 *
 */

beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

// ------------------ SCHEMAS ------------------

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        // Maintained by the Approximation Pattern
        ratingAvgApprox: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 },
        // Optional: store when we last ran a true correction (observability only)
        lastCorrectedAt: { type: Date },
    },
    { timestamps: true }
);

const ratingSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "ApproxProduct", required: true },
        score: { type: Number, min: 1, max: 5, required: true },
    },
    { timestamps: true }
);

const Product = mongoose.model("ApproxProduct", productSchema);
const Rating = mongoose.model("ApproxRating", ratingSchema);

// ------------------ HELPERS (the pattern) ------------------

/**
 * addRatingApprox(productId, score)
 * ---------------------------------
 * Cheap, per-event *approximate* updater using an Exponential Moving Average (EMA).
 * - O(1) cost per rating.
 * - One simple write to the parent; no $group, no child scan.
 *
 * EMA formula: new = old + alpha * (value - old)
 * - alpha in (0,1]. Higher alpha trusts the newest rating more (faster to react, more noise).
 * - Pick alpha based on your domain. Here we use 0.1 for demo.
 */
async function addRatingApprox(productId, score, alpha = 0.1) {
    // Persist the rating event as usual (append-only log of truth)
    await Rating.create({ productId, score });

    // Read current approx snapshot
    const p = await Product.findById(productId).select("ratingAvgApprox ratingCount");
    const prevAvg = p.ratingAvgApprox || 0;
    const nextAvg = p.ratingCount === 0 ? score : prevAvg + alpha * (score - prevAvg);

    p.ratingAvgApprox = nextAvg;
    p.ratingCount += 1; // we still track count exactly, cheap to maintain
    await p.save();
    return p.ratingAvgApprox;
}

/**
 * correctApproximation(productId)
 * -------------------------------
 * Periodically (cron or threshold-based) run a *true* aggregation to eliminate drift.
 * - This is the expensive step we avoid per request, but run occasionally.
 */
async function correctApproximation(productId) {
    const agg = await Rating.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(productId) } },
        { $group: { _id: "$productId", trueAvg: { $avg: "$score" }, cnt: { $sum: 1 } } },
    ]);

    const { trueAvg = 0, cnt = 0 } = agg[0] || {};
    await Product.updateOne(
        { _id: productId },
        { $set: { ratingAvgApprox: trueAvg, ratingCount: cnt, lastCorrectedAt: new Date() } }
    );
    return { trueAvg, cnt };
}

// ------------------ TESTS ------------------

describe("📈 Approximation Pattern", () => {
    it("1) EMA stays close to true average with cheap per-event updates", async () => {
        // Setup: one product, many ratings with some bias toward higher scores
        const prod = await Product.create({ name: "Noise-Cancelling Headphones" });

        // Generate 200 ratings: majority 4-5, some noise 1-3
        const scores = Array.from({ length: 200 }, () => {
            const r = Math.random();
            if (r < 0.1) return 2;    // 10%
            if (r < 0.2) return 3;    // 10%
            if (r < 0.6) return 4;    // 40%
            return 5;                 // 40%
        });

        for (const s of scores) {
            await addRatingApprox(prod._id, s, 0.1); // cheap O(1) update
        }

        // True average via aggregation (expensive; we do it here just for asserting)
        const truth = await Rating.aggregate([
            { $match: { productId: prod._id } },
            { $group: { _id: null, avg: { $avg: "$score" } } },
        ]);
        const trueAvg = truth[0]?.avg || 0;

        const fresh = await Product.findById(prod._id).lean();

        // Expect EMA to be reasonably close. Tolerance depends on alpha and distribution.
        const err = Math.abs(fresh.ratingAvgApprox - trueAvg);
        expect(err).to.be.lessThan(0.5); // demo tolerance
    });

    it("2) First-event edge case initializes EMA correctly", async () => {
        const prod = await Product.create({ name: "Mechanical Keyboard" });

        await addRatingApprox(prod._id, 5, 0.2);
        const p = await Product.findById(prod._id).lean();

        // First rating should set approx directly (no previous signal)
        expect(p.ratingCount).to.equal(1);
        expect(p.ratingAvgApprox).to.equal(5);
    });

    it("3) Periodic correction resets drift to true average", async () => {
        const prod = await Product.create({ name: "4K Monitor" });

        // Add a bunch of ratings with alpha that might lag behind rapid shifts
        for (const s of [5,5,5,5, 1,1,1,1, 5,5,5,5, 1,1,1,1, 5,5,5,5]) {
            await addRatingApprox(prod._id, s, 0.05);
        }

        // Capture current approx
        const before = await Product.findById(prod._id).lean();

        // Run the expensive but infrequent correction job
        const { trueAvg } = await correctApproximation(prod._id);
        const after = await Product.findById(prod._id).lean();

        expect(after.ratingAvgApprox).to.be.closeTo(trueAvg, 1e-9);
        expect(after.ratingCount).to.be.greaterThan(0);
        expect(after.lastCorrectedAt).to.be.instanceOf(Date);
        // And it should reduce any prior drift
        expect(Math.abs(after.ratingAvgApprox - trueAvg)).to.be.at.most(Math.abs((before.ratingAvgApprox || 0) - trueAvg));
    });
});
