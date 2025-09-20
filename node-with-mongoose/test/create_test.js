import assert from 'assert';
import {User} from '../src/user.js';
import "./test_helper.js";

describe('Creating records', () => {

    it('saves a user', async () => {
        const joe = new User({name: 'Joe'});

        await joe.save();

        // Has joe been saved successfully?
        assert(!joe.isNew);
    });

});