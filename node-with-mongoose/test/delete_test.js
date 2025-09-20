import assert from 'assert';
import {User} from '../src/user.js';
import "./test_helper.js";

describe('Deleting a user', () => {
    let joe;

    beforeEach(async () => {
        await User.deleteMany({});
        joe = new User({name: 'Joe'});
        await joe.save();
    });

    it('model instance remove', (done) => {
        joe
            .deleteOne()
            .then(() => User.findOne({name: 'Joe'}))
            .then((user) => {
                assert(user === null);
                done();
            });
    });

    it('class method remove', (done) => {
        // Remove a bunch of records with some given criteria
        User.deleteMany({name: 'Joe'})
            .then(() => User.findOne({name: 'Joe'}))
            .then((user) => {
                assert(user === null);
                done();
            });
    });

    it('class method findOneAndRemove', (done) => {
        User.findOneAndDelete({name: 'Joe'})
            .then(() => User.findOne({name: 'Joe'}))
            .then((user) => {
                assert(user === null);
                done();
            });
    });

    it('class method findByIdAndRemove', (done) => {
        User.findByIdAndDelete(joe._id)
            .then(() => User.findOne({name: 'Joe'}))
            .then((user) => {
                assert(user === null);
                done();
            });
    });
});
