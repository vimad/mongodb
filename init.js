// Init replica set
rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017" }]
});

// Wait for primary election
sleep(5000);

db = db.getSiblingDB("admin");

// Create root user
db.createUser({
    user: "root",
    pwd: "123",
    roles: [{ role: "root", db: "admin" }]
});
