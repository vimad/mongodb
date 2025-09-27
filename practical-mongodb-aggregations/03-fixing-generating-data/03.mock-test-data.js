import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;

//For this example, you require MongoDB version 6.0 or above.
// This is because you'll be using the $densify and $fill stages introduced in version 6.0.

/*
Scenario

You want to generate a load of sample data into a MongoDB collection so you can subsequently educate yourself by
experimenting with MongoDB Query Language and defining indexes to determine how to improve the response time of your test queries.
You don't have much time, so you want to use a low-effort way to quickly produce a collection of half a million documents using an
aggregation pipeline. The specific fields you want each sample document to have include the following:

    A monotonically increasing datetime field
    A key with one of four values to logically relate a quarter of the documents together as part of the same partition
    A monotonically increasing progress numerical field
    A score field which that takes an entirely random float value between 0 and 1
    A preference field with one of three possible values (the primary colors) picked at random
*/

const sourceCollection = db.collection('source');
await sourceCollection.drop();

const destinationCollection = db.collection('destination');
await destinationCollection.drop();


await seedData();
const result = await sourceCollection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));
const count = await destinationCollection.countDocuments();
console.log(`Count: ${count}`);
const generated = await destinationCollection.find().limit(2).toArray();
console.log(util.inspect(generated, {depth: null, colors: true}));

function getPipeline() {
    return [
        // Add new records every hour between the current first datetime
        // to current last datetime for each existing key value
        {
            "$densify": {
                "field": "datetime",
                "partitionByFields": ["key"],
                "range": {"bounds": "full", "step": 1, "unit": "hour"},
            }
        },
        // For the existing records, where 'progress' field is not set add a field
        // with a value that progressively increases for each existing key
        {
            "$fill": {
                "sortBy": {"datetime": 1},
                "partitionBy": {"key": "$key"},
                "output": {
                    "progress": {"method": "linear"}
                },
            }
        },
        {
            "$set": {
                // Set score field to be a random number
                "score": {"$rand": {}},
                // Set preference field to one of 3 values randomly
                "preference": {
                    "$let": {
                        "vars": {
                            "values": ["RED", "YELLOW", "BLUE"],
                        },
                        "in": {
                            "$arrayElemAt": [
                                "$$values",
                                {"$floor": {"$multiply": [{"$size": "$$values"}, {"$rand": {}}]}},
                            ]
                        }
                    }
                },
            }
        },
        {
            "$merge": {
                "into": "destination",
            }
        },
    ];
}

async function seedData() {
    await sourceCollection.insertMany([
        {
            "key": "A",
            "datetime": new Date("2009-04-27T00:00:00.000Z"),
            "progress": 1
        },
        {
            "key": "B",
            "datetime": new Date("2009-04-27T00:00:00.000Z"),
            "progress": 1
        },
        {
            "key": "C",
            "datetime": new Date("2009-04-27T00:00:00.000Z"),
            "progress": 1
        },
        {
            "key": "D",
            "datetime": new Date("2009-04-27T00:00:00.000Z"),
            "progress": 1
        },
        {
            "key": "A",
            "datetime": new Date("2023-07-31T06:59:59.000Z"),
            "progress": 9
        },
        {
            "key": "B",
            "datetime": new Date("2023-07-31T06:59:59.000Z"),
            "progress": 9
        },
        {
            "key": "C",
            "datetime": new Date("2023-07-31T06:59:59.000Z"),
            "progress": 9
        },
        {
            "key": "D",
            "datetime": new Date("2023-07-31T06:59:59.000Z"),
            "progress": 9
        },
    ]);
}

/*

Pipeline observations

Densification of records: You will have noticed that only eight records are included in the source collection to seed the
subsequent generation of half a million records. Four of these inserted records act as the start boundary for subsequently
generated records with the keys A, B, C and D. The other four records act as the end boundary for new records with those keys.
The pipeline then uses the $densify operator to fill in missing documents between these two boundaries for each key, setting
the datetime field for each new record with the next incremental hour between the datetime of the start and end boundary records.
This first pipeline stage ($densify) essentially creates the missing 499,992 records in the gap.

Filling missing fields: The pipeline's second stage ($fill) plays a different role. Rather than fill in missing records,
it fills in some missing fields in the sequence of now-existing records. The stage defines that the thousands of records
with the same key are given a linearly increasing floating value between the two boundary records with values 0 and 1 for
the generated progress field.

Random value generation: The pipeline uses the $rand operator to generate random numbers at two places by the pipeline.
The pipeline uses $rand directly to assign a random value between 0 and 1 to a new field called score in each record
(including the preexisting eight records). The pipeline also indirectly uses $rand to randomly choose one of three values, RED, YELLOW, and BLUE,
to set the value of a new field called preference in each existing and newly generated record.

Output to a collection: The pipeline uses a $merge stage to instruct the aggregation engine to write the output to a
collection rather than returning a stream of results. The pipeline could have used an $out rather than a $merge stage.
However, because $merge supports both unsharded and sharded collections, whereas $out only supports the former, $merge
provides a more universally applicable example. If your aggregation needs to create a brand new unsharded collection,
$out may be a little faster because the aggregation will completely replace the existing collection if it exists. Using
$merge, the system has to perform more checks for every record the aggregation inserts (even though, in this case, it will be to a new collection).

Limit to the amount of documents generated by densify: The $densify stage limits the number of documents a pipeline can
generate to 500,000. There is a workaround, which involves inserting multiple $densify stages in the same pipeline.
If you want to generate one million records, you need to include two stages. If employing this workaround,
you must change the definition of the bounds field in each $densify stage. Rather than defining "bounds": "full",
you define an explicit bounds range instead

 */