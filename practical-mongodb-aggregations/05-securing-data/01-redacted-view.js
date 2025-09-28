import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

You have a user management system containing data about various people in a database, and you need to ensure a
particular client application cannot view the sensitive parts of the data relating to each person.

Consequently, you will provide a read-only view of each person's data. You will use the view, named adults,
to redact personal data and expose this view to the client application as the only way it can access personal information.
The view will apply the following two rules to restrict data access:
    Only show people aged 18 and above (by checking each person's dateofbirth field)
    Exclude each person's social_security_num field from the results

Note
In a real-world situation, you would combine this approach with applying the MongoDB role-based access control (RBAC)
rules to limit the client application to only access the view and not have access to the original collection.
*/

const peopleCollection = db.collection('persons');
await peopleCollection.drop();

await peopleCollection.createIndex({"dateofbirth": -1});

// Create index for non-$expr part of filter in MongoDB version < 5.0
await peopleCollection.createIndex({"gender": 1});

// Create index for combo of $expr & non-$expr filter in MDB version >= 5.0
await peopleCollection.createIndex({"gender": 1, "dateofbirth": -1});

await seedData();
const result = await peopleCollection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

await db.createCollection("adults", {
    viewOn: "persons",  // base collection
    pipeline: getPipeline(),
});

console.log("*****************************************************");
const resultFromView = await db.collection('adults').find({"gender": "FEMALE"}).toArray();
console.log(util.inspect(resultFromView, {depth: null, colors: true}));

function getPipeline() {
    return [
        // Filter out any persons aged 18 ($expr required to reference '$$NOW')
        {
            "$match":
                {
                    "$expr": {
                        "$lt": [
                            "$dateofbirth",
                            {"$subtract": ["$$NOW", 18 * 365.25 * 24 * 60 * 60 * 1000]}
                        ]
                    }
                },
        },
        // Exclude fields to be filtered out by the view
        {
            "$unset": [
                "_id",
                "social_security_num",
            ]
        },
    ];
}

async function seedData() {
    await peopleCollection.insertMany([
        {
            "person_id": "6392529400",
            "firstname": "Elise",
            "lastname": "Smith",
            "dateofbirth": new Date("1972-01-13T09:32:07Z"),
            "gender": "FEMALE",
            "email": "elise_smith@myemail.com",
            "social_security_num": "507-28-9805",
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
            "email": "oranieri@warmmail.com",
            "social_security_num": "618-71-2912",
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
            "dateofbirth": new Date("2014-11-23T16:53:56Z"),
            "gender": "FEMALE",
            "email": "tj@wheresmyemail.com",
            "social_security_num": "001-10-3488",
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
            "gender": "MALE",
            "email": "bgooding@tepidmail.com",
            "social_security_num": "230-43-7633",
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
            "dateofbirth": new Date("2013-07-06T17:35:45Z"),
            "gender": "FEMALE",
            "email": "sophe@celements.net",
            "social_security_num": "377-30-5364",
            "address": {
                "number": 5,
                "street": "Innings Close",
                "city": "Basilbridge",
            },
        },
    ]);
}

/*

Pipeline observations

$expr and indexes: The NOW system variable used here returns the current system date-time. However, you can only access
this system variable via an aggregation expression and not directly via the regular MongoDB query syntax used by MongoDB
Query Language and $match. You must wrap an expression using $$NOW inside an $expr operator, as described in Chapter 4,
Harnessing the Power of Expressions, specifically the Restrictions when using expressions within $match section. If you
use an $expr query operator to perform a range comparison, you can't make use of an index in versions of MongoDB earlier
than version 5.0. Therefore, in this example, unless you use MongoDB 5.0 or greater, the aggregation will not take advantage
of an index on dateofbirth. For a view, because you specify the pipeline earlier than it is ever run, you cannot obtain the
current date-time at runtime by other means.

View finds and indexes: Even for earlier versions before MongoDB 5.0, the explain plan for the gender query run against
the view shows an index has been used (the index defined for the gender field). At runtime, a view is essentially just an
aggregation pipeline you define ahead of time. When db.adults.find({"gender": "FEMALE"}) is executed, the database engine
dynamically appends a new $match stage to the end of the pipeline for the gender match. It then optimizes the pipeline by
moving the content of the new $match stage to the pipeline's start, where possible. Finally, it adds the filter extracted
from the extended $match stage to the aggregation's initial query, and hence it can leverage an index containing the gender
field. The following two excerpts, from an explain plan from a version earlier than MongoDB 5.0, illustrate how the filter
on gender and the filter on dateofbirth combine at runtime and how the index for gender is used to avoid a full collection scan:

        '$cursor': {
          queryPlanner: {
            plannerVersion: 1,
            namespace: 'book-redacted-view.persons',
            indexFilterSet: false,
            parsedQuery: {
              '$and': [
                { gender: { '$eq': 'FEMALE' } },
                {
                  '$expr': {
                    '$lt': [
                      '$dateofbirth',
                      {
                        '$subtract': [ '$$NOW', { '$const': 568036800000 } ]
                        ...
        inputStage: {
          stage: 'IXSCAN',
          keyPattern: { gender: 1 },
          indexName: 'gender_1',
          direction: 'forward',
          indexBounds: { gender: [ '["FEMALE", "FEMALE"]' ] }
        }

In MongoDB 5.0 and greater, the explain plan will show the aggregation runtime executing the pipeline more optimally by
entirely using the compound index based on both the fields (gender and dateofbirth).

Note
Just because the aggregation runtime moves the content of the $match stage from the base of the pipeline to the top of
this pipeline, it doesn't imply this optimization can happen in all pipelines. For example, if the middle part of the pipeline
includes a $group stage, then the runtime can't move the $match stage ahead of the $group stage because this would change the
functional behavior and outcome of the pipeline. See the Aggregation Pipeline Optimization documentation
(see https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/) for the runtime optimizations the
MongoDB database engine can apply.

 */