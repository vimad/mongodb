import assert from 'assert';
import { User } from '../src/user.js';
import "./test_helper.js";

describe('Reading users out of the database', () => {
    let joe;

    beforeEach((done) => {
        joe = new User({name: 'Joe'});
        joe.save()
            .then(() => done());
    });

    it('finds all users with a name of joe', (done) => {
        User.find({name: 'Joe'})
            .then((users) => {
                // _id is an mongo ObjectID so to compare we need to convert to string
                assert(users[0]._id.toString() === joe._id.toString());
                done();
            });
    });

    it('find a user with a particular id', (done) => {
        User.findOne({_id: joe._id})
            .then((user) => {
                assert(user.name === 'Joe');
                done();
            });
    });
});
