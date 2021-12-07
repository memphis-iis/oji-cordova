import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base'

const SEED_USERNAME = 'testUser';
const SEED_PASSWORD = 'password';

Meteor.startup(() => {
    //create seed user
    if (!Accounts.findUserByUsername(SEED_USERNAME)) {
        Accounts.createUser({
            username: SEED_USERNAME,
            password: SEED_PASSWORD,
        });
    }
});
