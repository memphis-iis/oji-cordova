import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base'

const SEED_USERNAME = 'testUser';
const SEED_PASSWORD = 'password';
const SEED_EMAIL = 'testUser@memphis.edu';
const SEED_FIRSTNAME = 'Johnny';
const SEED_LASTNAME = 'Test';
const SEED_ORGANIZATION  = 'IIS';
const SEED_SUPERVISORID = "0"

Meteor.startup(() => {
    //create seed user
    if (!Accounts.findUserByUsername(SEED_USERNAME)) {
        Accounts.createUser({
            username: SEED_USERNAME,
            password: SEED_PASSWORD,
            email: SEED_EMAIL,
            firstname: SEED_FIRSTNAME,
            lastname: SEED_LASTNAME,
            organization: SEED_ORGANIZATION,
            supervisor: SEED_SUPERVISORID,
        });
    }
});
