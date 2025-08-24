import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;

// Scenario
// You want to generate a retail report to list the total value and quantity of expensive products sold (valued over 15 dollars).
// The source data is a list of shop orders, where each order contains the set of products purchased as part of the order.

const collection = db.collection('orders');
await collection.drop();
await collection.createIndex({"orderdate": -1});

await seedData();
const result = await collection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

function getPipeline() {
    return [
        // Unpack each product from each order's product as a new separate record
        {
            "$unwind": {
                "path": "$products",
            }
        },

        // Match only products valued greater than 15.00
        {
            "$match": {
                "products.price": {
                    "$gt": NumberDecimal("15.00"),
                },
            }
        },

        // Group by product type, capturing each product's total value + quantity
        {
            "$group": {
                "_id": "$products.prod_id",
                "product": {"$first": "$products.name"},
                "total_value": {"$sum": "$products.price"},
                "quantity": {"$sum": 1},
            }
        },
        // Set product id to be the value of the field that was grouped on
        {
            "$set": {
                "product_id": "$_id",
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
    let data = [
        {
            "order_id": 6363763262239,
            "products": [
                {
                    "prod_id": "abc12345",
                    "name": "Asus Laptop",
                    "price": NumberDecimal("431.43"),
                },
                {
                    "prod_id": "def45678",
                    "name": "Karcher Hose Set",
                    "price": NumberDecimal("22.13"),
                },
            ],
        },
        {
            "order_id": 1197372932325,
            "products": [
                {
                    "prod_id": "abc12345",
                    "name": "Asus Laptop",
                    "price": NumberDecimal("429.99"),
                },
            ],
        },
        {
            "order_id": 9812343774839,
            "products": [
                {
                    "prod_id": "pqr88223",
                    "name": "Morphy Richards Food Mixer",
                    "price": NumberDecimal("431.43"),
                },
                {
                    "prod_id": "def45678",
                    "name": "Karcher Hose Set",
                    "price": NumberDecimal("21.78"),
                },
            ],
        },
        {
            "order_id": 4433997244387,
            "products": [
                {
                    "prod_id": "def45678",
                    "name": "Karcher Hose Set",
                    "price": NumberDecimal("23.43"),
                },
                {
                    "prod_id": "jkl77336",
                    "name": "Picky Pencil Sharpener",
                    "price": NumberDecimal("0.67"),
                },
                {
                    "prod_id": "xyz11228",
                    "name": "Russell Hobbs Chrome Kettle",
                    "price": NumberDecimal("15.76"),
                },
            ],
        },
    ];
    await collection.insertMany(data);
}

/*

Pipeline observations

Unwinding arrays: The $unwind stage is a powerful concept, although often unfamiliar to many developers initially.
Distilled down, it does one simple thing: it generates a new record for each element in an array field of every input document.
If a source collection has 3 documents and each document contains an array of 4 elements,
then performing an $unwind stage on that array field for all the records produces 12 records (3 x 4).

Introducing a partial match: The current example pipeline scans all documents in the collection and then filters out unpacked0
products where price > 15.00. If the pipeline executed this filter as the first stage, it would incorrectly produce some result
product records with a value of 15 dollars or less. This would be the case for an order composed of both inexpensive
and expensive products. However, you can still improve the pipeline by including an additional partial match filter
at the start of the pipeline for products valued at over 15 dollars. The aggregation could leverage an index (on products.price),
resulting in a partial rather than full collection scan. This extra filter stage is beneficial if the input dataset is
large, and many customer orders are for inexpensive items only. This approach is described in Chapter 3, Optimizing Pipelines for Performance.

 */