import mongoose from 'mongoose';

// The below line is not required because mongoose 6.0.0+
// mongoose.Promise = global.Promise;

before((done) => {
    // authSource=admin required because my docker compose file init mongo with init script point to database named test
    // so mongoose by default connects to a database named test will fail to connect to a database named mongoose-test
    // This will not create the database if it doesn't exist. database + collection will create when do first insert with this session'
    mongoose.connect('mongodb://root:123@localhost:27018/mongoose-test?authSource=admin');
    mongoose.connection
        .once('open', () => {
            done();
        })
        .on('error', (error) => {
            console.warn('Warning', error);
        });
});

beforeEach(() => {
    // callback way
    // If the only users collection is there in the database, it will also be dropped automatically.
    // mongoose.connection.collections.users.drop(() => {
    //     // Ready to run the next test!
    //     done();
    // });

    // async/await way (remove done in it callback and make it async)
    // await mongoose.connection.collections.users.drop();
});
