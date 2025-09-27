import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

A third party has imported a set of retail orders into a MongoDB collection but with all data typing lost (they have stored all field values as strings).
You want to reestablish correct typing for all the documents and copy them into a new cleaned collection.
You can incorporate such transformation logic in the aggregation pipeline because you know each field's type in the original record structure.
*/

const ordersCollection = db.collection('orders');
await ordersCollection.drop();

await db.collection('orders_typed').drop();

await seedData();
const result = await ordersCollection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));
const typedResult = await db.collection('orders_typed').find().toArray();
console.log(typedResult);

function getPipeline() {
    return [
        // Convert strings to required types
        {
            "$set": {
                "order_date": {"$toDate": "$order_date"},
                "value": {"$toDecimal": "$value"},
                "further_info.item_qty": {"$toInt": "$further_info.item_qty"},
                "further_info.reported": {
                    "$switch": {
                        "branches": [
                            {
                                "case":
                                    {"$eq": [{"$toLower": "$further_info.reported"}, "true"]},
                                "then": true
                            },
                            {
                                "case":
                                    {"$eq": [{"$toLower": "$further_info.reported"}, "false"]},
                                "then": false
                            },
                        ],
                        "default":
                            {"$ifNull": ["$further_info.reported", "$$REMOVE"]},
                    }
                },
            }
        },

        // Output to an unsharded or sharded collection
        {
            "$merge": {
                "into": "orders_typed",
            }
        },
    ];
}

async function seedData() {
    await ordersCollection.insertMany([
        {
            "customer_id": "elise_smith@myemail.com",
            "order_date": "2020-05-30T08:35:52",
            "value": "231.43",
            "further_info": {
                "item_qty": "3",
                "reported": "false",
            },
        },
        {
            "customer_id": "oranieri@warmmail.com",
            "order_date": "2020-01-01T08:25:37",
            "value": "63.13",
            "further_info": {
                "item_qty": "2",
            },
        },
        {
            "customer_id": "tj@wheresmyemail.com",
            "order_date": "2019-05-28T19:13:32",
            "value": "2.01",
            "further_info": {
                "item_qty": "1",
                "reported": "true",
            },
        },
    ]);
}

/*

Pipeline observations

Boolean conversion: The pipeline's conversion for integers, decimals, and dates are straightforward using the corresponding operator expressions,
$toInt, $toDecimal, and $toDate. However, the $toBool operator expression is not used for the boolean conversion. This is because $toBool will
convert any non-empty string to true regardless of its value. As a result, the pipeline uses a $switch operator to compare the lowercase version
of strings with the text 'true' and 'false', returning the matching boolean.

Preserving non-existent fields: The further_info.reported field is an optional field in this scenario.
The field may not always appear in a document, as illustrated by one of the three documents in the example.
If a field is absent from a document, this potentially significant fact should never be lost.
The pipeline includes additional logic for the further_info.reported field to preserve this information.
The pipeline ensures the field is not included in the output document if it didn't exist in the source document.
An $ifNull conditional operator is used, which returns the $$REMOVE marker flag if the field is missing, instructing the aggregation engine to omit it.

Output to a collection: The pipeline uses a $merge stage to instruct the aggregation engine to write the output to a collection rather
than returning a stream of results. For this example, the default settings for $merge are sufficient.
Each transformed record coming out of the aggregation pipeline becomes a new record in the target collection.
The pipeline could have used an $out stage rather than a $merge stage. However, because $merge supports both unsharded and sharded collections,
whereas $out only supports the former, $merge provides a more universally applicable solution.
If your aggregation needs to create a brand new unsharded collection, $out may be a little faster because the aggregation will
completely replace the existing collection if it exists. Using $merge, the system has to perform more checks for every record
the aggregation inserts (even though, in this case, it will be to a new collection).

Trickier date conversions: In this example, the date strings contain all the date parts required by the
$toDate operator to perform a conversion correctly. In some situations, this may not be the case,
and a date string may be missing some valuable information (e.g., which century a two-character year string is for, such as 19 or 21).
To understand how to deal with these cases, see the next example.

 */