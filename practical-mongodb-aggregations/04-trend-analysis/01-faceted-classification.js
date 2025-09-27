import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

You want to provide faceted search capability on your retail website to enable customers to refine their product search
by selecting specific characteristics against the product results listed on the web page. It is beneficial to classify
the products by different dimensions, where each dimension, or facet, corresponds to a particular field in a product record (e.g., product rating or product price).

Each facet should be broken down into a separate range so that a customer can select a specific sub-range (e.g., 4-5 stars)
for a particular facet (e.g., rating). The aggregation pipeline will analyze the products collection by each facet's
field (rating and price) to determine each facet's spread of values.
*/

const productsCollection = db.collection('products');
await productsCollection.drop();

await seedData();
const result = await productsCollection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

function getPipeline() {
    return [
        // Group products by 2 facets: 1) by price ranges, 2) by rating ranges
        {
            "$facet": {
                // Group by price ranges
                "by_price": [
                    // Group into 3: inexpensive small range to expensive large range
                    {
                        "$bucketAuto": {
                            "groupBy": "$price",
                            "buckets": 3,
                            "granularity": "1-2-5",
                            "output": {
                                "count": {"$sum": 1},
                                "products": {"$push": "$name"},
                            },
                        }
                    },
                    // Tag range info as "price_range"
                    {
                        "$set": {
                            "price_range": "$_id",
                        }
                    },
                    // Omit unwanted fields
                    {
                        "$unset": [
                            "_id",
                        ]
                    },
                ],
                // Group by rating ranges
                "by_rating": [
                    // Group products evenly across 5 rating ranges from low to high
                    {
                        "$bucketAuto": {
                            "groupBy": "$rating",
                            "buckets": 5,
                            "output": {
                                "count": {"$sum": 1},
                                "products": {"$push": "$name"},
                            },
                        }
                    },
                    // Tag range info as "rating_range"
                    {
                        "$set": {
                            "rating_range": "$_id",
                        }
                    },
                    // Omit unwanted fields
                    {
                        "$unset": [
                            "_id",
                        ]
                    },
                ],
            }
        },
    ];
}

async function seedData() {
    await productsCollection.insertMany([
        {
            "name": "Asus Laptop",
            "category": "ELECTRONICS",
            "description": "Good value laptop for students",
            "price": NumberDecimal("431.43"),
            "rating": NumberDecimal("4.2"),
        },
        {
            "name": "The Day Of The Triffids",
            "category": "BOOKS",
            "description": "Classic post-apocalyptic novel",
            "price": NumberDecimal("5.01"),
            "rating": NumberDecimal("4.8"),
        },
        {
            "name": "Morphy Richards Food Mixer",
            "category": "KITCHENWARE",
            "description": "Luxury mixer turning good cakes into great",
            "price": NumberDecimal("63.13"),
            "rating": NumberDecimal("3.8"),
        },
        {
            "name": "Karcher Hose Set",
            "category": "GARDEN",
            "description": "Hose + nozzles + winder for tidy storage",
            "price": NumberDecimal("22.13"),
            "rating": NumberDecimal("4.3"),
        },
        {
            "name": "Oak Coffee Table",
            "category": "HOME",
            "description": "size is 2m x 0.5m x 0.4m",
            "price": NumberDecimal("22.13"),
            "rating": NumberDecimal("3.8"),
        },
        {
            "name": "Lenovo Laptop",
            "category": "ELECTRONICS",
            "description": "High spec good for gaming",
            "price": NumberDecimal("1299.99"),
            "rating": NumberDecimal("4.1"),
        },
        {
            "name": "One Day in the Life of Ivan Denisovich",
            "category": "BOOKS",
            "description": "Brutal life in a labour camp",
            "price": NumberDecimal("4.29"),
            "rating": NumberDecimal("4.9"),
        },
        {
            "name": "Russell Hobbs Chrome Kettle",
            "category": "KITCHENWARE",
            "description": "Nice looking budget kettle",
            "price": NumberDecimal("15.76"),
            "rating": NumberDecimal("3.9"),
        },
        {
            "name": "Tiffany Gold Chain",
            "category": "JEWELERY",
            "description": "Looks great for any age and gender",
            "price": NumberDecimal("582.22"),
            "rating": NumberDecimal("4.0"),
        },
        {
            "name": "Raleigh Racer 21st Century Classic",
            "category": "BICYCLES",
            "description": "Modern update to a classic 70s bike design",
            "price": NumberDecimal("523.00"),
            "rating": NumberDecimal("4.5"),
        },
        {
            "name": "Diesel Flare Jeans",
            "category": "CLOTHES",
            "description": "Top end casual look",
            "price": NumberDecimal("129.89"),
            "rating": NumberDecimal("4.3"),
        },
        {
            "name": "Jazz Silk Scarf",
            "category": "CLOTHES",
            "description": "Style for the winter months",
            "price": NumberDecimal("28.39"),
            "rating": NumberDecimal("3.7"),
        },
        {
            "name": "Dell XPS 13 Laptop",
            "category": "ELECTRONICS",
            "description": "Developer edition",
            "price": NumberDecimal("1399.89"),
            "rating": NumberDecimal("4.4"),
        },
        {
            "name": "NY Baseball Cap",
            "category": "CLOTHES",
            "description": "Blue & white",
            "price": NumberDecimal("18.99"),
            "rating": NumberDecimal("4.0"),
        },
        {
            "name": "Tots Flower Pots",
            "category": "GARDEN",
            "description": "Set of three",
            "price": NumberDecimal("9.78"),
            "rating": NumberDecimal("4.1"),
        },
        {
            "name": "Picky Pencil Sharpener",
            "category": "Stationery",
            "description": "Ultra budget",
            "price": NumberDecimal("0.67"),
            "rating": NumberDecimal("1.2"),
        },
    ]);
}

/*

Pipeline observations

Multiple pipelines: The $facet stage doesn't have to be employed for you to use the $bucketAuto stage. In most faceted
search scenarios, you will want to understand a collection by multiple dimensions simultaneously (price and rating, in this case).
The $facet stage is convenient because it allows you to define various $bucketAuto dimensions in one go in a single pipeline.
Otherwise, a client application must invoke an aggregation multiple times, each using a new $bucketAuto stage to process a
different field. In fact, each section of a $facet stage is just a regular aggregation (sub-) pipeline, able to contain any
type of stage (with a few specific documented exceptions, see https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/#behavior),
and may not even use $bucketAuto or $bucket stages at all.

Single document result: Allowing the result of a $facet-based aggregation to be multiple documents will cause a problem.
The results will contain a mix of records originating from different facets but with no way of ascertaining the facet to which each
result record belongs. Consequently, when using $facet, a single document is always returned, containing top-level fields
identifying each facet. Having only a single result record is not usually a problem. A typical requirement for faceted search
is to return a small amount of grouped summary data about a collection rather than large amounts of raw data from the collection.
Therefore, the 16 MB document size limit should not be an issue.

Spread of ranges: In this example, each of the two employed bucketing facets uses a different granularity number scheme
to spread out the sub-ranges of values. You choose a numbering scheme based on what you know about the nature of the facet.
For instance, most of the ratings values in the sample collection have scores bunched between late 3s and early 4s.
If a chosen numbering scheme reflects an even spread of ratings, most products will appear in the same sub-range bucket,
and some sub-ranges will contain no products (e.g., ratings 2 to 3 in this example). This wouldn't provide website
customers with much selectivity on product ratings.

Faster facet computation: The aggregation in this example has no choice but to perform a full collection scan to construct the faceted results.
For large collections, the amount of time the user has to wait on the website to see these results may be prohibitively long. However,
you can employ an alternative mechanism to generate faceted results faster, using Atlas Search, as highlighted in Chapter 13,
Full-Text Search Examples, specifically the Facets and counts text search section. Therefore, if you can adopt Atlas Search,
you should use its faceted search capability rather than the general-purpose faceted search capability in MongoDB.

 */