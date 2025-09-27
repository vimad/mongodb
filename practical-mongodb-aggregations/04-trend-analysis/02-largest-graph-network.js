import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

Your organization wants to know the best targets for a new marketing campaign based on a social network database such as Twitter.

You want to search the collection of social network users, each holding a user's name and the names of others who follow them.
You want to traverse each user record's followed_by array to determine which user has the most extensive network reach.

Note
This example uses a simple data model for brevity. However, this is unlikely to be an optimum data model for using
$graphLookup at scale for social network users with many followers or running in a sharded environment.
For more guidance modeling large networks of relationships at scale, see this reference application: Socialite (see https://github.com/mongodb-labs/socialite).
*/

const usersCollection = db.collection('users');
await usersCollection.drop();
await usersCollection.createIndex({"name": 1});

await seedData();
const result = await usersCollection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

function getPipeline() {
    return [
        // For each social network user, traverse their 'followed_by' people list
        {
            "$graphLookup": {
                "from": "users",
                "startWith": "$followed_by",
                "connectFromField": "followed_by",
                "connectToField": "name",
                "depthField": "depth",
                "as": "extended_network",
            }
        },
        // Add new accumulating fields
        {
            "$set": {
                // Count the extended connection reach
                "network_reach": {
                    "$size": "$extended_network"
                },
                // Gather the list of the extended connections' names
                "extended_connections": {
                    "$map": {
                        "input": "$extended_network",
                        "as": "connection",
                        "in": "$$connection.name", // Get name field from each element
                    }
                },
            }
        },
        // Omit unwanted fields
        {
            "$unset": [
                "_id",
                "followed_by",
                "extended_network",
            ]
        },
        // Sort by person with greatest network reach first, in descending order
        {
            "$sort": {
                "network_reach": -1,
            }
        },
    ];
}

async function seedData() {
    await usersCollection.insertMany([
        {"name": "Paul", "followed_by": []},
        {"name": "Toni", "followed_by": ["Paul"]},
        {"name": "Janet", "followed_by": ["Paul", "Toni"]},
        {"name": "David", "followed_by": ["Janet", "Paul", "Toni"]},
        {"name": "Fiona", "followed_by": ["David", "Paul"]},
        {"name": "Bob", "followed_by": ["Janet"]},
        {"name": "Carl", "followed_by": ["Fiona"]},
        {"name": "Sarah", "followed_by": ["Carl", "Paul"]},
        {"name": "Carol", "followed_by": ["Helen", "Sarah"]},
        {"name": "Helen", "followed_by": ["Paul"]},
    ]);
}

/*

Pipeline observations

Following graphs: The $graphLookup stage helps you traverse relationships between records, looking for patterns that aren't
necessarily evident from looking at each record in isolation. In this example, by looking at Paul's record in isolation,
it is evident that Paul has no friends and thus has the lowest network reach. However, it is not obvious that Carol has the
greatest network reach just by looking at the number of people Carol is directly followed by, which is two. David, for example,
is followed by three people (one more than Carol). However, the executed aggregation pipeline can deduce that Carol has the most extensive network reach.

Index use: The $graphLookup stage can leverage the index on the name field for each of its connectToField hops. Without this,
the aggregation would take an eternity to navigate an extensive network.

Extracting one field from each array element: The pipeline uses the $map array operator to only take one field from each
user element matched by the $graphLookup stage. The $map logic loops through each matched user, adding the value of the
user's name field to the $map's array of results and ignoring the other field ( followed_by). For more information about
using the $map operator, see Chapter 4, Harnessing the Power of Expressions.

 */