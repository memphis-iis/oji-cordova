import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base'
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles

const SEED_USERNAME = 'testUser';
const SEED_PASSWORD = 'password';
const SEED_ROLES = ['user', 'supervisor', 'admin']

Meteor.startup(() => {
    //create seed roles
    for(let role of SEED_ROLES){
        if(!Meteor.roles.findOne({ '_id' : role })._id){
            Roles.createRole(role);
        }
    }

    //create seed user
    if (!Accounts.findUserByUsername(SEED_USERNAME)) {
        Accounts.createUser({
            username: SEED_USERNAME,
            password: SEED_PASSWORD,
        });
        const uid = Accounts.findUserByUsername(SEED_USERNAME)._id;
        Roles.addUsersToRoles(uid, 'supervisor')
        console.log(SEED_USERNAME + ' is in role supervisor? ' + Roles.userIsInRole(uid, 'supervisor'))
    }
});
