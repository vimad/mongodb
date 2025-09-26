import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

You want to generate a report to list all the orders made for each product in 2020. To achieve this,
you need to take a shop's products collection and join each product record to all its orders stored in an orders collection.
There is a one-to-many relationship between both collections, based on a match of two fields on each side.
Rather than joining on a single field such as product_id (which doesn't exist in this dataset),
you need to use two common fields to join (product_name and product_variation).
*/

const ordersCollection = db.collection('orders');
await ordersCollection.drop();
await ordersCollection.createIndex({"product_name": 1, "product_variation": 1});

const productsCollection = db.collection('products');
await productsCollection.drop();

await seedData();
const result = await productsCollection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

function getPipeline() {
    return [
        // Join by 2 fields in products collection to 2 fields in orders collection
        {
            "$lookup": {
                "from": "orders",
                "let": {
                    "prdname": "$name",
                    "prdvartn": "$variation",
                },
                // Embedded pipeline to control how the join is matched
                "pipeline": [
                    // Join by two fields in each side
                    {
                        "$match":
                            {
                                "$expr":
                                    {
                                        "$and": [
                                            {"$eq": ["$product_name", "$$prdname"]},
                                            {"$eq": ["$product_variation", "$$prdvartn"]},
                                        ]
                                    },
                            },
                    },
                    // Match only orders made in 2020
                    {
                        "$match": {
                            "orderdate": {
                                "$gte": new Date("2020-01-01T00:00:00Z"),
                                "$lt": new Date("2021-01-01T00:00:00Z"),
                            }
                        }
                    },
                    // Exclude some unwanted fields from the right side of the join
                    {
                        "$unset": [
                            "_id",
                            "product_name",
                            "product_variation",
                        ]
                    },
                ],
                as: "orders",
            }
        },
        // Only show products that have at least one order
        {
            "$match": {
                "orders": {"$ne": []},
            }
        },
        // Omit unwanted fields
        {
            "$unset": [
                "_id",
            ]
        },
    ];
}

async function seedData() {
    await productsCollection.insertMany([
        {
            "name": "Asus Laptop",
            "variation": "Ultra HD",
            "category": "ELECTRONICS",
            "description": "Great for watching movies",
        },
        {
            "name": "Asus Laptop",
            "variation": "Normal Display",
            "category": "ELECTRONICS",
            "description": "Good value laptop for students",
        },
        {
            "name": "The Day Of The Triffids",
            "variation": "1st Edition",
            "category": "BOOKS",
            "description": "Classic post-apocalyptic novel",
        },
        {
            "name": "The Day Of The Triffids",
            "variation": "2nd Edition",
            "category": "BOOKS",
            "description": "Classic post-apocalyptic novel",
        },
        {
            "name": "Morphy Richards Food Mixer",
            "variation": "Deluxe",
            "category": "KITCHENWARE",
            "description": "Luxury mixer turning good cakes into great",
        },
        {
            "name": "Karcher Hose Set",
            "variation": "Full Monty",
            "category": "GARDEN",
            "description": "Hose + nosels + winder for tidy storage",
        },
    ]);

    // Insert 4 records into the orders collection
    await ordersCollection.insertMany([
        {
            "customer_id": "elise_smith@myemail.com",
            "orderdate": new Date("2020-05-30T08:35:52Z"),
            "product_name": "Asus Laptop",
            "product_variation": "Normal Display",
            "value": NumberDecimal("431.43"),
        },
        {
            "customer_id": "tj@wheresmyemail.com",
            "orderdate": new Date("2019-05-28T19:13:32Z"),
            "product_name": "The Day Of The Triffids",
            "product_variation": "2nd Edition",
            "value": NumberDecimal("5.01"),
        },
        {
            "customer_id": "oranieri@warmmail.com",
            "orderdate": new Date("2020-01-01T08:25:37Z"),
            "product_name": "Morphy Richards Food Mixer",
            "product_variation": "Deluxe",
            "value": NumberDecimal("63.13"),
        },
        {
            "customer_id": "jjones@tepidmail.com",
            "orderdate": new Date("2020-12-26T08:55:46Z"),
            "product_name": "Asus Laptop",
            "product_variation": "Normal Display",
            "value": NumberDecimal("429.65"),
        },
    ]);
}

/*

Pipeline observations

Multiple join fields: To join two or more fields between the two collections,
you must use a let parameter rather than specifying the localField and foreignField parameters used in a single field join.
With a let parameter, you bind multiple fields from the first collection into variables ready to be used in the joining process.
You use an embedded pipeline inside the $lookup stage to match the bind variables with fields in the second collection's records.
In this instance, because the $expr operator performs an equality comparison specifically (as opposed to a range comparison),
the aggregation runtime can employ an appropriate index for this match even if the underlying MongoDB version is older than 5.0.

Reducing array content: The presence of an embedded pipeline in the $lookup stage provides an opportunity to filter out three unwanted fields
brought in from the second collection. Instead, you could use an $unset stage later in the top-level pipeline to project out these unwanted
array elements. Suppose you need to perform more complex array content filtering rules.
In that case, you can use the approach described in Chapter 3, Optimizing Pipelines for Performance,
specifically the Avoid unwinding and regrouping documents just to process each array's elements section.

 */