import {db, adminDb, dbName} from '../client.js'
import {Decimal128, MongoClient} from 'mongodb'
import util from "util";

const NumberDecimal = Decimal128.fromString;
/*
Scenario

At a medical establishment, the central IT system holds patient data that you need to share with different applications
(and their users) according to the application's user role: receptionist, nurse, or doctor. Consequently,
you will provide a read-only view of patient data, but the view will filter out specific sensitive fields depending
on the application user's role. For example, the receptionist's application should not be able to access the
patient's current weight and medication. However, the doctor's application needs this information to enable them to perform their job.

Note
Essentially, this example illustrates how you can apply both record-level (a.k.a. row-level) and field-level
(a.k.a. column-level) access control in MongoDB. The pipeline will apply programmatic RBAC rules rather
than declarative ones to enforce what data users can access within a view. In a real-world situation,
you would additionally use a declarative role to limit the client application with access only to the view and not the underlying collection.
*/

async function tryOperation(op) {
    try {
        await op()
    } catch (e) {
        console.error(e.message);
    }
}

const patientsCollection = db.collection('patients');
await patientsCollection.drop();

await tryOperation(async () => {
    await db.command({
        createRole: "Receptionist",
        privileges: [
            {
                resource: { db: dbName, collection: "" },
                actions: ["find", "insert", "update", "remove"]
            }
        ],
        roles: []
    });
});


await tryOperation(async () => {
    await db.command({
        createRole: "Nurse",
        privileges: [
            {
                resource: { db: dbName, collection: "" },
                actions: ["find", "insert", "update", "remove"]
            }
        ],
        roles: []
    });
});

await tryOperation(async () => {
    await db.command({
        createRole: "Doctor",
        privileges: [
            {
                resource: { db: dbName, collection: "" },
                actions: ["find", "insert", "update", "remove"]
            }
        ],
        roles: []
    });
});

await tryOperation(async () => {
    await db.command({
        createUser: "front-desk",
        pwd: "abc123",
        roles: [
            { role: "Receptionist", db: dbName }
        ]
    });
});

await tryOperation(async () => {
    await db.command({
        createUser: "nurse-station",
        pwd: "xyz789",
        roles: [
            { role: "Nurse", db: dbName }
        ]
    });
});

await tryOperation(async () => {
    await db.command({
        createUser: "exam-room",
        pwd: "mno456",
        roles: [
            { role: "Doctor", db: dbName }
        ]
    });
});

await db.createCollection("patients_view", {
    viewOn: "patients",
    pipeline: getPipeline(),
})
const view = db.collection("patients_view");

await seedData();

console.log("Front desk user *************************************************")
await connectWithUserAndSeeResults("front-desk", "abc123");

console.log("Doctor user *************************************************")
await connectWithUserAndSeeResults("exam-room", "mno456");

console.log("Nurse user *************************************************")
await connectWithUserAndSeeResults("nurse-station", "xyz789");

async function connectWithUserAndSeeResults(userName, password) {
    try {
        const uri = `mongodb://${userName}:${password}@localhost:27017/aggregation-test?authSource=${dbName}&replicaSet=rs0`;
        const client = new MongoClient(uri);

        await client.connect();

        const db = client.db(dbName);
        const patients = await db.collection("patients_view").find().toArray();
        console.log(patients);
        await client.close();
    } catch (error) {
        console.log(error.message);
    }
}

function getPipeline() {
    return [
        {"$set": {
                // Exclude weight if user does not have right role
                "weight": {
                    "$cond": {
                        "if": {
                            "$eq": [
                                {"$setIntersection": [
                                        "$$USER_ROLES.role",
                                        ["Doctor", "Nurse"]
                                    ]},
                                []
                            ]
                        },
                        "then": "$$REMOVE",
                        "else": "$weight"
                    }
                },

                // Exclude weight if user does not have right role
                "medication": {
                    "$cond": {
                        "if": {
                            "$eq": [
                                {"$setIntersection":
                                        ["$$USER_ROLES.role",
                                            ["Doctor"]
                                        ]},
                                []
                            ]
                        },
                        "then": "$$REMOVE",
                        "else": "$medication"
                    }
                },
                // Always exclude _id
                "_id": "$$REMOVE",
            }},
    ]
}

async function seedData() {
    await patientsCollection.insertMany([
        {
            "id": "D40230",
            "first_name": "Chelsea",
            "last_Name": "Chow",
            "birth_date": new Date("1984-11-07T10:12:00Z"),
            "weight": 145,
            "medication": ["Insulin", "Methotrexate"],
        },
        {
            "id": "R83165",
            "first_name": "Pharrell",
            "last_Name": "Phillips",
            "birth_date": new Date("1993-05-30T19:44:00Z"),
            "weight": 137,
            "medication": ["Fluoxetine"],
        },
        {
            "id": "X24046",
            "first_name": "Billy",
            "last_Name": "Boaty",
            "birth_date": new Date("1976-02-07T23:58:00Z"),
            "weight": 223,
            "medication": [],
        },
        {
            "id": "P53212",
            "first_name": "Yazz",
            "last_Name": "Yodeler",
            "birth_date": new Date("1999-12-25T12:51:00Z"),
            "weight": 156,
            "medication": ["Tylenol", "Naproxen"],
        },
    ]);
}

/*

Pipeline observations

Programmatic versus declarative RBAC: MongoDB provides RBAC to enable an administrator to govern access to database resources.
The administrator achieves this by declaratively granting system users to one or more roles (e.g., readWrite, find) against
one or more resources (e.g., collectionABC, viewXYZ). However, this chapter's example goes further by allowing you to
include business logic to enforce programmatic access rules based on the connecting system user's role. In the example,
these rules are captured in aggregation expressions, which use the $$USER_ROLES system variable to look up the roles
associated with the current requesting system user. The pipeline's logic for both weight and medication uses a condition
expression ($cond) to see whether the connected user is a member of a named role, and if not, it removes the field.
Given the entire set of MongoDB aggregation operators at your disposal, you can implement whatever custom access control logic you want.

Avoid proliferation of views: An alternative solution for this example is enabling a purely declarative RBAC approach by
defining three different hard-coded views rather than mandating that you code programmatic rules in one view. You would
specify one view per role (e.g., receptionist_patients_view, nurse_patients_view, doctor_patients_view). Each view would
contain an almost identical aggregation pipeline, varying only in the specific fields it omits. However, such an approach
introduces duplication; whenever developers change the view's core aggregation pipeline, they must apply the changes in three places.
This proliferation of views will be exasperated when there are hundreds of roles involved in a non-trivial application.
Thus, adding a programmatic RBAC approach to fine-tune access rules reduces maintenance costs and friction to increase agility.

Filtering on a view with index pushdowns: As you saw in the Redacted view example in this chapter, the view's aggregation pipeline
can leverage an index. In some situations, the aggregation runtime can move the view's filter to the start of the pipeline,
pushing the filter down to leverage an index more optimally.

Field-level versus record-level access control: The example view's pipeline applies field-level access control rules
(e.g., the nurse role cannot access a document's medication field). However, adding logic to the pipeline to filter
out specific documents is also straightforward, using the approach highlighted in the Redacted view example in this
chapter to enforce record-level access control. You achieve this by optionally applying a $match operator in the
pipeline if the user has a specific role (e.g., receptionist) rather than just filtering based on the value of some
fields in each document (e.g., if a document's date field is less than a specific point in time).

Factor out logic to dynamic metadata: The examples in this chapter use hard-coded logic to enforce access control rules.
Every time the business needs to change a rule (e.g., adjust what fields Nurse can see), a developer must modify and retest the code.
When such business rules frequently change in dynamic applications, it may be undesirable to mandate a code change and
application rerelease for each change. Instead, you could factor out metadata into a new collection,
capturing the mappings of the names of fields each role can access. A business administrator could dynamically modify
the mappings in this special collection via an administrative user interface. At runtime, the view's pipeline would use a
$lookup stage to map the current user's role (using USER_ROLES) to the fields the role can access. The pipeline would
then use this list to conditionally show or omit values of each field in its result.
 */