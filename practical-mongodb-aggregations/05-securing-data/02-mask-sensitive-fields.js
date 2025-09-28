import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

You want to perform irreversible masking on the sensitive fields in a collection of credit card payments, ready to provide
the output dataset to a third party for analysis, without exposing sensitive information to that third party.

The specific changes that you need to make to the payment fields include the following:
    Partially obfuscate the cardholder's name
    Obfuscate the first 12 digits of the card's number, retaining only the final 4 digits
    Adjust the card's expiry date-time by adding or subtracting a random amount up to a maximum of 30 days (~1 month)
    Replace the card's three-digit security code with a random set of three digits
    Adjust transaction amounts by adding or subtracting a random amount, up to a maximum of 10% of the original amount
    Change the reported field's boolean value to the opposite value for roughly 20% of the records
    If the embedded customer_info sub-document's category field is set to RESTRICTED, exclude the whole customer_info sub-document
*/

const paymentsCollection = db.collection('payments');
await paymentsCollection.drop();

await seedData();
const result = await paymentsCollection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

function getPipeline() {
    return [
        // Replace a subset of fields with new values
        {
            "$set": {
                // Extract last word from the name , eg: 'Doe' from 'Mrs. Jane A. Doe'
                "card_name": {"$regexFind": {"input": "$card_name", "regex": /(\S+)$/}},

                // Mask card num 1st part retaining last 4 chars,
                // eg: '1234567890123456' -> 'XXXXXXXXXXXX3456'
                "card_num": {
                    "$concat": [
                        "XXXXXXXXXXXX",
                        {"$substrCP": ["$card_num", 12, 4]},
                    ]
                },
                // Add/subtract random time amount of max 30 days (~1 month) each-way
                "card_expiry": {
                    "$add": [
                        "$card_expiry",
                        {
                            "$floor": {
                                "$multiply": [
                                    {"$subtract": [{"$rand": {}}, 0.5]},
                                    2 * 30 * 24 * 60 * 60 * 1000
                                ]
                            }
                        },
                    ]
                },
                // Replace each digit with random digit, eg: '133' -> '472'
                "card_sec_code": {
                    "$concat": [
                        {
                            "$toString": {
                                "$floor": {"$multiply": [{"$rand": {}}, 10]}
                            }
                        },
                        {
                            "$toString": {
                                "$floor": {"$multiply": [{"$rand": {}}, 10]}
                            }
                        },
                        {
                            "$toString": {
                                "$floor": {"$multiply": [{"$rand": {}}, 10]}
                            }
                        },
                    ]
                },

                // Add/subtract random percent of amount's value up to 10% max each-way
                "transaction_amount": {
                    "$add": [
                        "$transaction_amount",
                        {
                            "$multiply": [
                                {"$subtract": [{"$rand": {}}, 0.5]},
                                0.2,
                                "$transaction_amount"
                            ]
                        },
                    ]
                },

                // Retain field's bool value 80% of time on average, setting to the
                // opposite value 20% of time
                "reported": {
                    "$cond": {
                        "if": {"$lte": [{"$rand": {}}, 0.8]},
                        "then": "$reported",
                        "else": {"$not": ["$reported"]},
                    }
                },
                // Exclude sub-doc if sub-doc's category field's value is 'RESTRICTED'
                "customer_info": {
                    "$cond": {
                        "if": {
                            "$eq": ["$customer_info.category", "RESTRICTED"]
                        },
                        "then": "$$REMOVE",
                        "else": "$customer_info",
                    }
                },

                // Mark _id field to excluded from results
                "_id": "$$REMOVE",
            }
        },

        // Take regex matched last word from the card name
        // and prefix it with hardcoded value
        {
            "$set": {
                "card_name": {
                    "$concat": [
                        "Mx. Xxx ",
                        {"$ifNull": ["$card_name.match", "Anonymous"]}
                    ]
                },
            }
        },
    ];
}

async function seedData() {
    await paymentsCollection.insertMany([
        {
            "card_name": "Mrs. Jane A. Doe",
            "card_num": "1234567890123456",
            "card_expiry": new Date("2023-08-31T23:59:59Z"),
            "card_sec_code": "123",
            "card_type": "CREDIT",
            "transaction_id": "eb1bd77836e8713656d9bf2debba8900",
            "transaction_date": new Date("2021-01-13T09:32:07Z"),
            "transaction_amount": NumberDecimal("501.98"),
            "reported": false,
            "customer_info": {
                "category": "RESTRICTED",
                "rating": 89,
                "risk": 3,
            },
        },
        {
            "card_name": "Jim Smith",
            "card_num": "9876543210987654",
            "card_expiry": new Date("2022-12-31T23:59:59Z"),
            "card_sec_code": "987",
            "card_type": "DEBIT",
            "transaction_id": "634c416a6fbcf060bb0ba90c4ad94f60",
            "transaction_date": new Date("2020-11-24T19:25:57Z"),
            "transaction_amount": NumberDecimal("64.01"),
            "reported": true,
            "customer_info": {
                "category": "NORMAL",
                "rating": 78,
                "risk": 55,
            },
        },
    ]);
}

/*

Pipeline observations

Targeted redaction: The pipeline uses a $cond operator to return the $$REMOVE marker variable if the category field equals
RESTRICTED. This informs the aggregation engine to exclude the whole customer_info sub-document from the stage's output for the document.
Alternatively, the pipeline could have used a $redact stage to achieve the same. However,
$redact typically has to perform more processing work as it checks every field in the document. Hence,
if a pipeline is only to redact one specific sub-document, use the approach outlined in this example.

Regular expression: For masking the card_name field, a regular expression operator is used to extract the last word of
the field's original value. $regexFind returns metadata into the stage's output records, indicating if the match succeeded
and what the matched value is. Therefore, an additional $set stage is required later in the pipeline to extract the actual
matched word from this metadata and prefix it with some hard-coded text. MongoDB version 5.0 introduced a new $getField operator,
which you can instead use to directly extract the regex result field (match). Consequently, if you are using MongoDB 5.0 or greater,
you can eliminate the second $set stage from the end of your pipeline and then replace the line of code that sets the masked
value of the card_name field to the following:
    // Prefix with a hard-coded value followed by the regex extracted last word of the card name
    "card_name": {"$concat": ["Mx. Xxx ", {"$ifNull": [{"$getField": {"field": "match",
     "input": {"$regexFind": {"input": "$card_name", "regex": /(\S+)$/}}}}, "Anonymous"]}]},

Meaningful insights: Even though the pipeline is irreversibly obfuscating fields, it doesn't mean that the masked data
is useless for performing analytics to gain insights. The pipeline masks some fields by fluctuating the original values by
a small but limited random percentage (e.g., card_expiry, transaction_amount), rather than replacing them with completely
random values (e.g., card_sec_code). In such cases, if the input dataset is sufficiently large, then minor variances will
be equaled out. For the fields that are only varied slightly, users can derive similar trends and patterns from analyzing
the masked data as they would the original data.
 */