import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

You have accumulated shop orders over many years, with the retail channel continuously adding new order records to the
orders collection throughout each trading day. You want to frequently generate a summary report so management can
understand the state of the business and react to changing business trends. Over the years, it has taken increasingly
longer to generate the report of all daily sums and averages because there has been increasingly more data to process each day.

From now on, to address this problem, you will only generate each new day's summary analysis at the end of the day and
store it in a different collection, which accumulates the daily summary records over time.

Note
Unlike most examples in this book, the aggregation pipeline writes its output to a collection rather than streaming the
results back to the calling application. This approach is sometimes referred to as an on-demand materialized view.
*/

const ordersSummaryCollection = db.collection('daily_orders_summary');
await ordersSummaryCollection.drop();
await ordersSummaryCollection.createIndex({"day": 1}, {"unique": true});

const ordersCollections = db.collection('orders');
await ordersCollections.drop();
await ordersSummaryCollection.createIndex({"orderdate": 1});


await seedData();
await ordersCollections.aggregate(getPipeline()).toArray();
const result = await ordersSummaryCollection.find().toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

function getPipeline() {
    const startDay = "2021-02-01T00:00:00Z";
    const endDay = "2021-02-02T00:00:00Z"
    return [
        // Match orders for one day only
        {
            "$match": {
                "orderdate": {
                    "$gte": new Date(startDay),
                    "$lt": new Date(endDay),
                }
            }
        },
        // Group all orders together into one summary record for the day
        {
            "$group": {
                "_id": null,
                "date_parts": {"$first": {"$dateToParts": {"date": "$orderdate"}}},
                "total_value": {"$sum": "$value"},
                "total_orders": {"$sum": 1},
            }
        },
        // Get date parts from 1 order (need year+month+day, for UTC)
        {
            "$set": {
                "day": {
                    "$dateFromParts": {
                        "year": "$date_parts.year",
                        "month": "$date_parts.month",
                        "day": "$date_parts.day"
                    }
                },
            }
        },
        // Omit unwanted field
        {
            "$unset": [
                "_id",
                "date_parts",
            ]
        },
        // Add day summary to summary collection (overwrite if already exists)
        {
            "$merge": {
                "into": "daily_orders_summary",
                "on": "day",
                "whenMatched": "replace",
                "whenNotMatched": "insert"
            }
        },
    ];
}

async function seedData() {
    await ordersCollections.insertMany([
        {
            "orderdate": new Date("2021-02-01T08:35:52Z"),
            "value": NumberDecimal("231.43"),
        },
        {
            "orderdate": new Date("2021-02-01T09:32:07Z"),
            "value": NumberDecimal("99.99"),
        },
        {
            "orderdate": new Date("2021-02-01T08:25:37Z"),
            "value": NumberDecimal("63.13"),
        },
        {
            "orderdate": new Date("2021-02-01T19:13:32Z"),
            "value": NumberDecimal("2.01"),
        },
        {
            "orderdate": new Date("2021-02-01T22:56:53Z"),
            "value": NumberDecimal("187.99"),
        },
        {
            "orderdate": new Date("2021-02-02T23:04:48Z"),
            "value": NumberDecimal("4.59"),
        },
        {
            "orderdate": new Date("2021-02-02T08:55:46Z"),
            "value": NumberDecimal("48.50"),
        },
        {
            "orderdate": new Date("2021-02-02T07:49:32Z"),
            "value": NumberDecimal("1024.89"),
        },
        {
            "orderdate": new Date("2021-02-02T13:49:44Z"),
            "value": NumberDecimal("102.24"),
        },
    ]);
}

/*

Pipeline observations

Merging results: The pipeline uses a $merge stage to instruct the aggregation engine to write the output to a collection
rather than returning a stream of results. In this example, with the options you provide to $merge, the aggregation
inserts a new record in the destination collection if a matching one doesn't already exist. If a matching record
already exists, it replaces the previous version.

Incremental updates: The example illustrates just two days of shop orders, albeit with only a few orders,
to keep the example simple. At the end of each new trading day, you run the aggregation pipeline to generate the current
day's summary only. Even after the source collection has increased in size over many years, the time it takes you to bring
the summary collection up to date again stays constant. In a real-world scenario, the business might expose a graphical
chart showing the changing daily orders trend over the last rolling year. This charting dashboard is not burdened by the
cost of periodically regenerating values for all days in the year. There could be hundreds of thousands of orders
received per day for real-world retailers, especially large ones. A day's summary may take many seconds to generate
in that situation. Without an incremental analytics approach, if you need to generate a year's worth of daily
summaries every time, it would take hours to refresh the business dashboard.

Idempotency: If a retailer is aggregating tens of thousands of orders per day, then during end-of-day processing, it may choose
to generate 24 hourly summary records rather than a single daily record. This provides the business with finer granularity
to understand trends better. As with any software process, when generating hourly results into the summary collection,
there is the risk of not fully completing if a system failure occurs. If an in-flight aggregation terminates abnormally,
it may not have written all 24 summary collection records. The failure leaves the summary collection in an indeterminate
and incomplete state for one of its days. However, this isn't a problem because of the way the aggregation pipeline
uses the $merge stage. When an aggregation fails to complete, it can just be rerun. When the aggregation is rerun,
it will regenerate all the results for the day, replacing existing summary records and filling in the missing ones.
The aggregation pipeline is idempotent, and you can run it repeatedly without damaging the summary collection.
The overall solution is self-healing and naturally tolerant of inadvertently aborted aggregation jobs.

Retrospective changes: Sometimes, an organization may need to go back and correct records from the past, as illustrated in
this example. For instance, a bank may need to fix a past payment record due to a settlement issue that only
comes to light weeks later. With the approach used in this example, it is straightforward to re-execute the aggregation
pipeline for a prior date, using the updated historical data. This will correctly update the specific day's summary data
only, to reflect the business's current state.

 */