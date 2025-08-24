import { db } from '../client.js'

// Scenario
// You need to query a collection of people to find the three youngest individuals who have a job in engineering, sorted by the youngest person first.

const collection = db.collection('persons');
await collection.drop();
await collection.createIndex({"vocation": 1, "dateofbirth": 1});

await seedData();
const result = await collection.aggregate(getPipeline()).toArray();
console.log(result);

function getPipeline() {
    return [
        // Match engineers only
        {
            "$match": {
                "vocation": "ENGINEER",
            }
        },

        // Sort by youngest person first
        {
            "$sort": {
                "dateofbirth": -1,
            }
        },

        // Only include the first 3 youngest people
        {"$limit": 3},

        // Exclude unrequired fields from each person record
        {
            "$unset": [
                "_id",
                "vocation",
                "address",
            ]
        },
    ];
}

async function seedData() {
    let data = [
        {
            "person_id": "6392529400",
            "firstname": "Elise",
            "lastname": "Smith",
            "dateofbirth": new Date("1972-01-13T09:32:07Z"),
            "vocation": "ENGINEER",
            "address": {
                "number": 5625,
                "street": "Tipa Circle",
                "city": "Wojzinmoj",
            },
        },
        {
            "person_id": "1723338115",
            "firstname": "Olive",
            "lastname": "Ranieri",
            "dateofbirth": new Date("1985-05-12T23:14:30Z"),
            "gender": "FEMALE",
            "vocation": "ENGINEER",
            "address": {
                "number": 9303,
                "street": "Mele Circle",
                "city": "Tobihbo",
            },
        },
        {
            "person_id": "8732762874",
            "firstname": "Toni",
            "lastname": "Jones",
            "dateofbirth": new Date("1991-11-23T16:53:56Z"),
            "vocation": "POLITICIAN",
            "address": {
                "number": 1,
                "street": "High Street",
                "city": "Upper Abbeywoodington",
            },
        },
        {
            "person_id": "7363629563",
            "firstname": "Bert",
            "lastname": "Gooding",
            "dateofbirth": new Date("1941-04-07T22:11:52Z"),
            "vocation": "FLORIST",
            "address": {
                "number": 13,
                "street": "Upper Bold Road",
                "city": "Redringtonville",
            },
        },
        {
            "person_id": "1029648329",
            "firstname": "Sophie",
            "lastname": "Celements",
            "dateofbirth": new Date("1959-07-06T17:35:45Z"),
            "vocation": "ENGINEER",
            "address": {
                "number": 5,
                "street": "Innings Close",
                "city": "Basilbridge",
            },
        },
        {
            "person_id": "7363626383",
            "firstname": "Carl",
            "lastname": "Simmons",
            "dateofbirth": new Date("1998-12-26T13:13:55Z"),
            "vocation": "ENGINEER",
            "address": {
                "number": 187,
                "street": "Hillside Road",
                "city": "Kenningford",
            },
        },
    ];
    await collection.insertMany(data);
}

// Pipeline observations

// Use index: In this basic aggregation pipeline, because multiple records belong to the collection,
// a compound index for vocation + dateofbirth should exist to enable the database to fully optimize the execution of the pipeline,
// combining the filter of the $match stage with the sort from the sort stage and the limit of the limit stage.

// Use unset: An $unset stage is used rather than a $project stage. This enables the pipeline to avoid being verbose.
// More importantly, it means the pipeline does not have to be modified if a new field appears in documents added in the future
// (for example, see the gender field that appears in only Olive's record).

// MongoDB Query Language similarity: For reference, the MongoDB Query
// Language equivalent for you to achieve the same result is shown here (you can try this in the MongoDB Shell):
/*
db.persons.find(
    {"vocation": "ENGINEER"},
    {"_id": 0, "vocation": 0, "address": 0},
).sort(
    {"dateofbirth": -1}
).limit(3);
*/
