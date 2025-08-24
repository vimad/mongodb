import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;

// Scenario
// You need to generate a report to show what each shop customer purchased in 2020.
// You will group the individual order records by customer, capturing each customer's first purchase date, the number of orders they made,
// the total value of all their orders, and a list of their order items sorted by date.

const collection = db.collection('orders');
await collection.drop();
await collection.createIndex({"orderdate": -1});

await seedData();
const result = await collection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, { depth: null, colors: true }));

function getPipeline() {
    return [
        // Match only orders made in 2020
        {
            "$match": {
                "orderdate": {
                    "$gte": new Date("2020-01-01T00:00:00Z"),
                    "$lt": new Date("2021-01-01T00:00:00Z"),
                },
            }
        },

        // Sort by order date ascending (to pick out 'first_purchase_date' below)
        {
            "$sort": {
                "orderdate": 1,
            }
        },

        // Group by customer
        {
            "$group": {
                "_id": "$customer_id",
                "first_purchase_date": {"$first": "$orderdate"},
                "total_value": {"$sum": "$value"},
                "total_orders": {"$sum": 1},
                "orders": {"$push": {"orderdate": "$orderdate", "value": "$value"}},
            }
        },

        // Sort by each customer's first purchase date
        {
            "$sort": {
                "first_purchase_date": 1,
            }
        },

        // Set customer's ID to be value of the field that was grouped on
        {
            "$set": {
                "customer_id": "$_id",
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
            "customer_id": "elise_smith@myemail.com",
            "orderdate": new Date("2020-05-30T08:35:52Z"),
            "value": NumberDecimal("231.43"),
        },
        {
            "customer_id": "elise_smith@myemail.com",
            "orderdate": new Date("2020-01-13T09:32:07Z"),
            "value": NumberDecimal("99.99"),
        },
        {
            "customer_id": "oranieri@warmmail.com",
            "orderdate": new Date("2020-01-01T08:25:37Z"),
            "value": NumberDecimal("63.13"),
        },
        {
            "customer_id": "tj@wheresmyemail.com",
            "orderdate": new Date("2019-05-28T19:13:32Z"),
            "value": NumberDecimal("2.01"),
        },
        {
            "customer_id": "tj@wheresmyemail.com",
            "orderdate": new Date("2020-11-23T22:56:53Z"),
            "value": NumberDecimal("187.99"),
        },
        {
            "customer_id": "tj@wheresmyemail.com",
            "orderdate": new Date("2020-08-18T23:04:48Z"),
            "value": NumberDecimal("4.59"),
        },
        {
            "customer_id": "elise_smith@myemail.com",
            "orderdate": new Date("2020-12-26T08:55:46Z"),
            "value": NumberDecimal("48.50"),
        },
        {
            "customer_id": "tj@wheresmyemail.com",
            "orderdate": new Date("2021-02-29T07:49:32Z"),
            "value": NumberDecimal("1024.89"),
        },
        {
            "customer_id": "elise_smith@myemail.com",
            "orderdate": new Date("2020-10-03T13:49:44Z"),
            "value": NumberDecimal("102.24"),
        },
    ];
    await collection.insertMany(data);
}

// Pipeline observations

// Use of double sort: It is necessary to perform $sort on the order date both before and after the $group stage.
// The $sort stage before the $group stage is required because the $group stage uses a $first group accumulator to capture
// just the first order's orderdate value for each grouped customer. The $sort after the $group stage is required because
// the act of having just grouped on customer ID will mean that the records are no longer sorted by purchase date for the records coming out of the $group stage.

// Renaming the group: Toward the end of the pipeline, you will see what a typical pattern for pipelines that use $group is,
// consisting of a combination of $set and $unset stages, to essentially take the group's key (which is always called _id)
// and substitute it with a more meaningful name (customer_id).


// High-precision decimals: You may notice that the pipeline uses a NumberDecimal() function to ensure the order amounts
// in the inserted records are using a high-precision decimal type, IEEE 754 decimal128. In this example,
// if you use a JSON float or double type instead, the order totals will significantly lose precision.
// For instance, for the customer elise_smith@myemail.com, if you use a double type, the total_value result will have
// the value shown in the second line of the following example, rather than the first line:
/*
    // Desired result achieved by using decimal128 types
    total_value: NumberDecimal('482.16')
    // Result that occurs if using float or double types instead
    total_value: 482.15999999999997
 */