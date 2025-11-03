import "../test_helper.js";
import mongoose from "mongoose";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
export const expect = chai.expect;

/**
 * Week 9 — Mongoose Discriminators (demo009)
 * -----------------------------------------
 * Goal: Show clean polymorphism in ONE collection using discriminators.
 * Keep it simple and focused on the pattern.
 *
 * Domain: Vehicle base model → Car, Truck (and a nested ElectricCar from Car)
 * - All documents live in the *vehicles* collection
 * - We use `kind` as the discriminator key (default is `__t`)
 *
 * What we demo (each test is minimal):
 *  1) Define base + discriminators; create docs; single collection; kind set
 *  2) Query via base model returns multiple kinds; inspect subtype via `kind`
 *  3) Discriminator-specific validation (Car.seats, Truck.capacityTons)
 *  4) Methods: base instance method applies to all; subtype method only to that kind
 *  5) Querying by subtype: `Car.find(...)` vs `Vehicle.find({kind:'Car'})`
 *  6) Nested discriminator not supported directly
 */

beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

// ------------------ SCHEMAS ------------------

// Base schema shared by all vehicles
const vehicleBaseSchema = new mongoose.Schema(
    {
        make: { type: String, required: true },
        model: { type: String, required: true },
        year: { type: Number, min: 1886, required: true },
    },
    {
        timestamps: true,
        discriminatorKey: "kind", // will store 'Car', 'Truck', 'ElectricCar' in the same collection
        collection: "vehicles",
    }
);

// A tiny base instance method (available on ALL kinds)
vehicleBaseSchema.methods.label = function () {
    return `${this.year} ${this.make} ${this.model}`;
};

// Base model (the parent)
const Vehicle = mongoose.model("Vehicle", vehicleBaseSchema);

// --- Discriminator: Car ---
const carSchema = new mongoose.Schema({
    seats: { type: Number, min: 1, required: true },
});
// Car-only method
carSchema.methods.isFamilyFriendly = function () {
    return this.seats >= 5;
};
const Car = Vehicle.discriminator("Car", carSchema);

// --- Discriminator: Truck ---
const truckSchema = new mongoose.Schema({
    capacityTons: { type: Number, min: 0.1, required: true },
});
// Truck-only method
truckSchema.methods.isHeavyDuty = function () {
    return this.capacityTons >= 5;
};
const Truck = Vehicle.discriminator("Truck", truckSchema);

// --- Nested discriminator: ElectricCar (note: discriminators-of-discriminators are NOT supported)
// You cannot do Car.discriminator('ElectricCar', ...). ElectricCar must also attach to the ROOT model.
// So ElectricCar repeats any fields it needs that Car had (e.g., 'seats').
const ecarSchema = new mongoose.Schema({
    seats: { type: Number, min: 1, required: true }, // repeat from Car
    batteryKWh: { type: Number, min: 1, required: true },
    fastCharge: { type: Boolean, default: true },
});
const ElectricCar = Vehicle.discriminator("ElectricCar", ecarSchema);

// ------------------ TESTS ------------------

describe("🚗 Discriminators — demo005", () => {
    it("1) Create Car & Truck in one collection; `kind` set automatically", async () => {
        const c = await Car.create({ make: "Toyota", model: "Corolla", year: 2020, seats: 5 });
        const t = await Truck.create({ make: "Volvo", model: "FH16", year: 2022, capacityTons: 10 });

        expect(c).to.have.property("kind", "Car");
        expect(t).to.have.property("kind", "Truck");

        // Both are stored in the same collection
        const raw = await mongoose.connection.db.collection("vehicles").find({}).toArray();
        expect(raw).to.have.length(2);
    });

    it("2) Query via base model returns all kinds; inspect by kind", async () => {
        await Car.create({ make: "Honda", model: "Civic", year: 2019, seats: 5 });
        await Truck.create({ make: "Ford", model: "F-150", year: 2021, capacityTons: 1 });

        const all = await Vehicle.find().sort({ make: 1 });
        const kinds = all.map((d) => d.kind).sort();
        expect(kinds).to.deep.equal(["Car", "Truck"]);

        // Base method works on all
        expect(all[0].label()).to.be.a("string");
    });

    it("3) Discriminator-specific validation triggers per kind", async () => {
        // Car missing seats → validation error
        const badCar = new Car({ make: "Test", model: "Bad", year: 2023 });
        await expect(badCar.validate()).to.be.rejected; // seats required

        // Truck with non-positive capacity → validation error
        const badTruck = new Truck({ make: "Test", model: "Tiny", year: 2020, capacityTons: 0 });
        await expect(badTruck.validate()).to.be.rejected;
    });

    it("4) Methods: base method applies to all; subtype method only on that kind", async () => {
        const c = await Car.create({ make: "Toyota", model: "Sienna", year: 2018, seats: 7 });
        const t = await Truck.create({ make: "MAN", model: "TGX", year: 2019, capacityTons: 12 });

        // Base method on both
        expect(c.label()).to.equal("2018 Toyota Sienna");
        expect(t.label()).to.equal("2019 MAN TGX");

        // Subtype method exists only on that subtype
        expect(c.isFamilyFriendly()).to.equal(true);
        expect(() => t.isFamilyFriendly()).to.throw();
        expect(t.isHeavyDuty()).to.equal(true);
    });

    it("5) Querying by subtype: Car.find vs Vehicle.find({kind:'Car'})", async () => {
        await Car.create({ make: "VW", model: "Golf", year: 2017, seats: 5 });
        await Truck.create({ make: "Isuzu", model: "N-Series", year: 2020, capacityTons: 2 });

        const carsA = await Car.find(); // automatically filters kind='Car'
        const carsB = await Vehicle.find({ kind: "Car" }); // explicit filter

        expect(carsA).to.have.length(1);
        expect(carsB).to.have.length(1);
        console.log(carsA[0].isFamilyFriendly());
        console.log(carsB[0].isFamilyFriendly());
        // console.log(carsB[0].isHeavyDuty()); // cannot call
        expect(carsA[0].kind).to.equal("Car");
    });

    it("6) Nested discriminator: ElectricCar as a separate subtype on the root (same collection)", async () => {
        const e = await ElectricCar.create({
            make: "Tesla",
            model: "Model 3",
            year: 2023,
            seats: 5,
            batteryKWh: 75,
        });

        expect(e.kind).to.equal("ElectricCar");

        // Car.find() will NOT include ElectricCar because discriminators-of-discriminators are unsupported.
        const onlyCars = await Car.find().lean();
        const onlyKinds = [...new Set(onlyCars.map((x) => x.kind))];
        expect(onlyKinds).to.deep.equal([]);

        // If you want "Car family" (Car + ElectricCar), query via the base model with an $in on kinds.
        const carFamily = await Vehicle.find({ kind: { $in: ["Car", "ElectricCar"] } }).lean();
        const familyKinds = [...new Set(carFamily.map((x) => x.kind))].sort();
        expect(familyKinds).to.deep.equal(["ElectricCar"]);

        // All are still stored in one collection
        const count2 = await mongoose.connection.db.collection("vehicles").countDocuments({});
        expect(count2).to.be.greaterThan(0);

        // Discriminator key holds the *final* kind value
        expect(e.kind).to.equal("ElectricCar");

        // Querying through Car includes ElectricCar too (since ElectricCar extends Car)
        const cars = await Car.find().lean();
        const kinds = cars.map((x) => x.kind).sort();
        expect(kinds).to.deep.equal([]);

        // All still in one collection
        const count = await mongoose.connection.db.collection("vehicles").countDocuments({});
        expect(count).to.be.greaterThan(0);
    });
});
