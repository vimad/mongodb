import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

You are monitoring various air-conditioning units running in two buildings on an industrial campus. Every 30 minutes,
a device in each unit sends the unit's current power consumption reading back to base, which is persisted in a central database.
You want to analyze this data to see how much energy in kilowatt-hours (kWh) each air-conditioning unit has consumed over
the last hour for each reading received. Further, you want to compute the total energy consumed by all the air-conditioning
units combined in each building for every hour.
*/
const deviceReadingsCollection = db.collection('device_readings');
await deviceReadingsCollection.drop();

await db.createCollection("device_readings", {
    "timeseries": {
        "timeField": "timestamp",
        "metaField": "deviceID",
        "granularity": "minutes"
    }
});
await deviceReadingsCollection.createIndex({"deviceID": 1, "timestamp": 1});

await seedData();
const result = await deviceReadingsCollection.aggregate(getRawReadingPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

console.log("*********************************************************")
const summary = await deviceReadingsCollection.aggregate(getReadingSummaryPipeline()).toArray();
console.log(util.inspect(summary, {depth: null, colors: true}));

function getRawReadingPipeline() {
    return [
        // Calc each unit energy consumed in last hour for each reading
        {
            "$setWindowFields": {
                "partitionBy": "$deviceID",
                "sortBy": {"timestamp": 1},
                "output": {
                    "consumedKilowattHours": {
                        "$integral": {
                            "input": "$powerKilowatts",
                            "unit": "hour",
                        },
                        "window": {
                            "range": [-1, "current"],
                            "unit": "hour",
                        },
                    },
                },
            }
        },
    ];
}

function getReadingSummaryPipeline() {
    return [
        // Calc each unit energy consumed in last hour for each reading
        {
            "$setWindowFields": {
                "partitionBy": "$deviceID",
                "sortBy": {"timestamp": 1},
                "output": {
                    "consumedKilowattHours": {
                        "$integral": {
                            "input": "$powerKilowatts",
                            "unit": "hour",
                        },
                        "window": {
                            "range": [-1, "current"],
                            "unit": "hour",
                        },
                    },
                },
            }
        },

        // Sort each reading by unit/device and then by timestamp
        {
            "$sort": {
                "deviceID": 1,
                "timestamp": 1,
            }
        },

        // Group readings together for each hour for each device using
        // the last calculated energy consumption field for each hour
        {
            "$group": {
                "_id": {
                    "deviceID": "$deviceID",
                    "date": {
                        "$dateTrunc": {
                            "date": "$timestamp",
                            "unit": "hour",
                        }
                    },
                },
                "buildingID": {"$last": "$buildingID"},
                "consumedKilowattHours": {"$last": "$consumedKilowattHours"},
            }
        },
        // Sum together the energy consumption for the whole building
        // for each hour across all the units in the building
        {
            "$group": {
                "_id": {
                    "buildingID": "$buildingID",
                    "dayHour": {
                        "$dateToString": {
                            "format": "%Y-%m-%d  %H",
                            "date": "$_id.date"
                        }
                    },
                },
                "consumedKilowattHours": {"$sum": "$consumedKilowattHours"},
            }
        },
        // Sort the results by each building and then by each hourly summary
        {
            "$sort": {
                "_id.buildingID": 1,
                "_id.dayHour": 1,
            }
        },
        // Make the results more presentable with meaningful field names
        {
            "$set": {
                "buildingID": "$_id.buildingID",
                "dayHour": "$_id.dayHour",
                "_id": "$$REMOVE",
            }
        },
    ];
}

async function seedData() {
    await deviceReadingsCollection.insertMany([
        // 11:29am device readings
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-111",
            "timestamp": new Date("2021-07-03T11:29:59Z"),
            "powerKilowatts": 8,
        },
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-222",
            "timestamp": new Date("2021-07-03T11:29:59Z"),
            "powerKilowatts": 7,
        },
        {
            "buildingID": "Building-XYZ",
            "deviceID": "UltraAirCon-666",
            "timestamp": new Date("2021-07-03T11:29:59Z"),
            "powerKilowatts": 10,
        },
        // 11:59am device readings
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-222",
            "timestamp": new Date("2021-07-03T11:59:59Z"),
            "powerKilowatts": 9,
        },
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-111",
            "timestamp": new Date("2021-07-03T11:59:59Z"),
            "powerKilowatts": 8,
        },
        {
            "buildingID": "Building-XYZ",
            "deviceID": "UltraAirCon-666",
            "timestamp": new Date("2021-07-03T11:59:59Z"),
            "powerKilowatts": 11,
        },
        // 12:29pm device readings
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-222",
            "timestamp": new Date("2021-07-03T12:29:59Z"),
            "powerKilowatts": 9,
        },
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-111",
            "timestamp": new Date("2021-07-03T12:29:59Z"),
            "powerKilowatts": 9,
        },
        {
            "buildingID": "Building-XYZ",
            "deviceID": "UltraAirCon-666",
            "timestamp": new Date("2021-07-03T12:29:59Z"),
            "powerKilowatts": 10,
        },
        // 12:59pm device readings
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-222",
            "timestamp": new Date("2021-07-03T12:59:59Z"),
            "powerKilowatts": 8,
        },
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-111",
            "timestamp": new Date("2021-07-03T12:59:59Z"),
            "powerKilowatts": 8,
        },
        {
            "buildingID": "Building-XYZ",
            "deviceID": "UltraAirCon-666",
            "timestamp": new Date("2021-07-03T12:59:59Z"),
            "powerKilowatts": 11,
        },
        // 13:29pm device readings
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-222",
            "timestamp": new Date("2021-07-03T13:29:59Z"),
            "powerKilowatts": 9,
        },
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-111",
            "timestamp": new Date("2021-07-03T13:29:59Z"),
            "powerKilowatts": 9,
        },
        {
            "buildingID": "Building-XYZ",
            "deviceID": "UltraAirCon-666",
            "timestamp": new Date("2021-07-03T13:29:59Z"),
            "powerKilowatts": 10,
        },
        // 13:59pm device readings
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-222",
            "timestamp": new Date("2021-07-03T13:59:59Z"),
            "powerKilowatts": 8,
        },
        {
            "buildingID": "Building-ABC",
            "deviceID": "UltraAirCon-111",
            "timestamp": new Date("2021-07-03T13:59:59Z"),
            "powerKilowatts": 8,
        },
        {
            "buildingID": "Building-XYZ",
            "deviceID": "UltraAirCon-666",
            "timestamp": new Date("2021-07-03T13:59:59Z"),
            "powerKilowatts": 11,
        },
    ]);
}

/*

Pipeline observations

Integral trapezoidal rule: As documented in the MongoDB Manual
(see https://www.mongodb.com/docs/manual/reference/operator/aggregation/integral/),
the $integral operator returns an approximation for the mathematical integral value, which is calculated using the
trapezoidal rule. For non-mathematicians, this explanation may be hard to understand. You may find it easier to
comprehend the behavior of the $integral operator by studying Figure 11.1 and the explanation that follows: (see img.png)
Essentially, the trapezoidal rule determines the area of a region between two points under a graph by matching the region
with a trapezoid shape that approximately fits this region and then calculates the area of this trapezoid.
You can see a set of points in Figure 11.1 with the matched trapezoid shape underneath each pair of points.
For this IoT power consumption example, the points on the graph represent an air-conditioning unit's power
readings captured every 30 minutes. The y axis is the energy rate (i.e., power rate) in kilowatts, and the
x axis is the time in hours to indicate when the device captured each reading. Consequently, for this example,
the energy consumed by the air-conditioning unit for a given hour's span is the area of the hour's specific section under
the graph. This section's area is approximately the area of the two trapezoids shown.
Using the $integral operator for the window of time you define in the $setWindowFields stage, you are asking for
this approximate area to be calculated, which is the kWh consumed by the air-conditioning unit in one hour.

Window range definition: For every captured document representing a device reading, this example's pipeline identifies
a window of one hour of previous documents relative to this current document. The pipeline uses this set of documents as
the input for the $integral operator. It defines this window range in the range: [-1, "current"], unit: "hour" setting.
The pipeline assigns the output of the $integral calculation to a new field called consumedKilowattHours.

One-hour range versus hours output: The fact that the $setWindowFields stage in the pipeline defines unit: "hour" in two
places may appear redundant at face value. However, this is not the case, and each serves a different purpose.
As described in the previous observation, unit: "hour" for the "window" option helps dictate the window size
of the previous number of documents to analyze. However, unit: "hour" for the $integral operator defines that the output
should be in hours (kWh in this example), yielding the result consumedKilowattHours: 8.5 for one of the processed device readings.
However, if the pipeline defined this $integral parameter to be "unit": "minute" instead, which is perfectly valid,
the output value would be 510 kilowatt-minutes (i.e., 8.5 x 60 minutes).

Optional time-series collection: This example uses a time-series collection to efficiently store sequences of
device measurements over time. Employing a time-series collection is optional, as shown in the NOTE JavaScript
comment in the example code. The aggregation pipeline does not need to be changed and achieves the same output if you use
a regular collection instead. However, when dealing with large datasets, the aggregation will complete quicker by
employing a time-series collection.

Index for partition by and sort by: In this example, you define the index {deviceID: 1, timestamp: 1} to optimize the use
of the combination of the partitionBy and sortBy parameters in the $setWindowFields stage. This means that the aggregation
runtime does not have to perform a slow in-memory sort based on these two fields, and it also avoids the pipeline stage memory
limit of 100 MB. It is beneficial to use this index regardless of whether you employ a regular collection or adopt a time-series collection.

 */