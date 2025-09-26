import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

You want to generate a report to list all shop purchases for 2020, showing the product's name and category for each order,
rather than the product's ID. To achieve this, you need to take the customer orders collection and join each order record
to the corresponding product record in the products collection. There is a many-to-one relationship between both collections,
resulting in a one-to-one join when matching an order to a product.
The join will use a single field comparison between both sides, based on the product's ID.
*/

const ordersCollection = db.collection('orders');
await ordersCollection.drop();
await ordersCollection.createIndex({"orderdate": -1});

const productsCollection = db.collection('products');
await productsCollection.drop();

await seedData();
const result = await ordersCollection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

function getPipeline() {
    return [
        // Match only orders made in 2020
        {
            "$match": {
                "orderdate": {
                    "$gte": new Date("2020-01-01T00:00:00Z"),
                    "$lt": new Date("2021-01-01T00:00:00Z"),
                }
            }
        },
        // Join "product_id" in orders collection to "id" in products" collection
        {
            "$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "id",
                "as": "product_mapping",
            }
        },
        // For this data model, will always be 1 record in right-side
        // of join, so take 1st joined array element
        {
            "$set": {
                "product_mapping": {"$first": "$product_mapping"},
            }
        },
        // Extract the joined embeded fields into top level fields
        {
            "$set": {
                "product_name": "$product_mapping.name",
                "product_category": "$product_mapping.category",
            }
        },
        // Omit unwanted fields
        {
            "$unset": [
                "_id",
                "product_id",
                "product_mapping",
            ]
        },
    ];
}

async function seedData() {
    await productsCollection.insertMany([
        {
            "id": "a1b2c3d4",
            "name": "Asus Laptop",
            "category": "ELECTRONICS",
            "description": "Good value laptop for students",
        },
        {
            "id": "z9y8x7w6",
            "name": "The Day Of The Triffids",
            "category": "BOOKS",
            "description": "Classic post-apocalyptic novel",
        },
        {
            "id": "ff11gg22hh33",
            "name": "Morphy Richards Food Mixer",
            "category": "KITCHENWARE",
            "description": "Luxury mixer turning good cakes into great",
        },
        {
            "id": "pqr678st",
            "name": "Karcher Hose Set",
            "category": "GARDEN",
            "description": "Hose + nosels + winder for tidy storage",
        },
    ]);
    // Create index for a orders collection

    // Insert 4 records into the orders collection
    await ordersCollection.insertMany([
        {
            "customer_id": "elise_smith@myemail.com",
            "orderdate": new Date("2020-05-30T08:35:52Z"),
            "product_id": "a1b2c3d4",
            "value": NumberDecimal("431.43"),
        },
        {
            "customer_id": "tj@wheresmyemail.com",
            "orderdate": new Date("2019-05-28T19:13:32Z"),
            "product_id": "z9y8x7w6",
            "value": NumberDecimal("5.01"),
        },
        {
            "customer_id": "oranieri@warmmail.com",
            "orderdate": new Date("2020-01-01T08:25:37Z"),
            "product_id": "ff11gg22hh33",
            "value": NumberDecimal("63.13"),
        },
        {
            "customer_id": "jjones@tepidmail.com",
            "orderdate": new Date("2020-12-26T08:55:46Z"),
            "product_id": "a1b2c3d4",
            "value": NumberDecimal("429.65"),
        },
    ]);
}

/*

Pipeline observations

Single field match: This pipeline includes a $lookup join between a single field from each collection.
To see how a join based on two or more matching fields is performed, see the next section, Multi-field join and one-to-many.

First element assumption: In this particular data model example, the join between the two collections is one-to-one.
Therefore, the returned array of joined elements coming out of the $lookup stage always contains precisely one array element.
As a result, the pipeline extracts the data from this first array element only, using the $first operator. To see how a one-to-many join is performed,
see the next section, Multi-field join and one-to-many.

First element for earlier MongoDB versions: MongoDB only introduced the $first array operator expression in version 4.4. However,
it is straightforward for you to replace its use in the pipeline with an equivalent solution, using the $arrayElemAt operator,
to then allow the pipeline to work in MongoDB versions preceding version 4.4:

 */