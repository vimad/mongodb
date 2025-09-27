import {db} from '../client.js'
import {Decimal128} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

An application is ingesting payment documents into a MongoDB collection where each document's payment date field contains a
string looking vaguely like a date-time, such as "01-JAN-20 01.01.01.123000000".
When aggregating the payments, you want to convert each payment date into a valid BSON
(BSON is a binary encoding for JSON data types, making it easier and more performant for MongoDB to
process and enabling support for more data types than the JSON standard) date type.
However, the payment date fields contain only some of the information required to determine the exact date-time accurately.
Therefore, you cannot use the date operator expressions (for example, $dateFromString and $dateToParts)
in MongoDB directly to perform the text-to-date conversion. Each of these text fields is missing the following information:
    The specific century (1900s? 2000s?)
    The specific time zone (GMT? IST? PST?)
    The specific language the three-letter month abbreviation represents (is "JAN" in French? In English?)

You subsequently learn that all the payment records are for the 21st century only,
the time zone used when ingesting the data is UTC, and the language used is English.
Armed with this information, you build an aggregation pipeline to transform these text fields into date fields.
*/

const paymentsCollection = db.collection('payments');
await paymentsCollection.drop();

await seedData();
const result = await paymentsCollection.aggregate(getPipeline()).toArray();
console.log(util.inspect(result, {depth: null, colors: true}));

function getPipeline() {
    return [
        // Change field from a string to a date, filling in the gaps
        {
            "$set": {
                "paymentDate": {
                    "$let": {
                        "vars": {
                            "txt": "$paymentDate",  // Assign "paymentDate" field to variable
                            "month": {"$substrCP": ["$paymentDate", 3, 3]},  // Extract month
                        },
                        "in": {
                            "$dateFromString": {
                                "format": "%d-%m-%Y %H.%M.%S.%L", "dateString":
                                    {
                                        "$concat": [
                                            {"$substrCP": ["$$txt", 0, 3]},  // Use 1st 3 chars in string
                                            {
                                                "$switch": {
                                                    "branches": [  // Replace 3 chars with month num
                                                        {"case": {"$eq": ["$$month", "JAN"]}, "then": "01"},
                                                        {"case": {"$eq": ["$$month", "FEB"]}, "then": "02"},
                                                        {"case": {"$eq": ["$$month", "MAR"]}, "then": "03"},
                                                        {"case": {"$eq": ["$$month", "APR"]}, "then": "04"},
                                                        {"case": {"$eq": ["$$month", "MAY"]}, "then": "05"},
                                                        {"case": {"$eq": ["$$month", "JUN"]}, "then": "06"},
                                                        {"case": {"$eq": ["$$month", "JUL"]}, "then": "07"},
                                                        {"case": {"$eq": ["$$month", "AUG"]}, "then": "08"},
                                                        {"case": {"$eq": ["$$month", "SEP"]}, "then": "09"},
                                                        {"case": {"$eq": ["$$month", "OCT"]}, "then": "10"},
                                                        {"case": {"$eq": ["$$month", "NOV"]}, "then": "11"},
                                                        {"case": {"$eq": ["$$month", "DEC"]}, "then": "12"},
                                                    ], "default": "ERROR"
                                                }
                                            },
                                            "-20",  // Add hyphen + hardcoded century 2 digits
                                            {"$substrCP": ["$$txt", 7, 15]}  // Ignore last 6 nanosecs
                                        ]
                                    }
                            }
                        }
                    }
                },
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
    await paymentsCollection.insertMany([
        {
            "account": "010101",
            "paymentDate": "01-JAN-20 01.01.01.123000000",
            "amount": 1.01
        },
        {
            "account": "020202",
            "paymentDate": "02-FEB-20 02.02.02.456000000",
            "amount": 2.02
        },
        {
            "account": "030303",
            "paymentDate": "03-MAR-20 03.03.03.789000000",
            "amount": 3.03
        },
        {
            "account": "040404",
            "paymentDate": "04-APR-20 04.04.04.012000000",
            "amount": 4.04
        },
        {
            "account": "050505",
            "paymentDate": "05-MAY-20 05.05.05.345000000",
            "amount": 5.05
        },
        {
            "account": "060606",
            "paymentDate": "06-JUN-20 06.06.06.678000000",
            "amount": 6.06
        },
        {
            "account": "070707",
            "paymentDate": "07-JUL-20 07.07.07.901000000",
            "amount": 7.07
        },
        {
            "account": "080808",
            "paymentDate": "08-AUG-20 08.08.08.234000000",
            "amount": 8.08
        },
        {
            "account": "090909",
            "paymentDate": "09-SEP-20 09.09.09.567000000",
            "amount": 9.09
        },
        {
            "account": "101010",
            "paymentDate": "10-OCT-20 10.10.10.890000000",
            "amount": 10.10
        },
        {
            "account": "111111",
            "paymentDate": "11-NOV-20 11.11.11.111000000",
            "amount": 11.11
        },
        {
            "account": "121212",
            "paymentDate": "12-DEC-20 12.12.12.999000000",
            "amount": 12.12
        }
    ]);
}

/*

Pipeline observations

Concatenation explanation: In this pipeline, the text fields (e.g., '12-DEC-20 12.12.12.999000000') are each converted to date fields
(e.g., 2020-12- 12T12:12:12.999Z). The pipeline achieves this by concatenating the following four example elements before passing them
to the $dateFromString operator to convert to a date type:
    '12-' (day of the month from the input string plus the hyphen suffix already present in the text)
    '12' (replacing "DEC")
    '-20' (hard-coded hyphen plus hard-coded century)
    '20 12.12.12.999' (the rest of the input string apart from the last 6 nanosecond digits)

Temporary reusable variables: The pipeline includes a $let operator to define two variables ready to be reused
in multiple places in the central part of the data conversion logic belonging to the $dateFromString operator.
The txt variable provides a minor convenience to ensure the main part of the expression logic works regardless of whether
the referenced field path is currently named $paymentDate or changes in a future version of the source collection (e.g., to $transactionDate).
The month variable is more valuable, ensuring the pipeline does not have to repeat the same substring logic in multiple places.

 */