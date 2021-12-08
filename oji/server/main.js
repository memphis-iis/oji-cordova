import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base'
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles

const SEED_USERNAME = 'testUser';
const SEED_PASSWORD = 'password';
const SEED_EMAIL = 'testUser@memphis.edu';
const SEED_FIRSTNAME = 'Johnny';
const SEED_LASTNAME = 'Test';
const SEED_ORGANIZATION  = 'IIS';
const SEED_SUPERVISORID = "0"
const SEED_ROLES = ['user', 'supervisor', 'admin']

Meteor.startup(() => {
    //create seed roles
    for(let role of SEED_ROLES){
        if(!Meteor.roles.findOne({ '_id' : role })){
            Roles.createRole(role);
        }
    }
    //create seed user
    if (!Accounts.findUserByUsername(SEED_USERNAME)) {
        const uid = Accounts.createUser({
            username: SEED_USERNAME,
            password: SEED_PASSWORD,
            email: SEED_EMAIL,
        });
        Meteor.users.update({ _id: uid }, 
            {   $set: 
                {
                    firstname: SEED_FIRSTNAME,
                    lastname: SEED_LASTNAME,
                    organization: SEED_ORGANIZATION,
                    supervisor: SEED_SUPERVISORID,
                }
            });
        Roles.addUsersToRoles(uid, 'supervisor');
        console.log(SEED_USERNAME + ' is in role supervisor? ' + Roles.userIsInRole(uid, 'supervisor'));
    }


});

//Global Methods
Meteor.methods({
    createNewUser: function(user, pass, emailAddr, firstName, lastName){
        serverConsole('createNewUser', user);
        if (!Accounts.findUserByUsername(user)) {
            const uid = Accounts.createUser({
                username: user,
                password: pass,
                email: emailAddr,
            });
            Meteor.users.update({ _id: uid }, 
                {   $set: 
                    {
                        firstname: firstName,
                        lastname: lastName,
                        organization: null,
                        supervisor: null,
                    }
                });
            Roles.addUsersToRoles(uid, 'user');
            return true;
        }
    }
})

//Server Methods
function serverConsole(...args) {
    const disp = [(new Date()).toString()];
    for (let i = 0; i < args.length; ++i) {
      disp.push(args[i]);
    }
    // eslint-disable-next-line no-invalid-this
    console.log.apply(this, disp);
}

//Publications and Mongo Access Control
Meteor.users.deny({
    update() { return true; }
});

Meteor.users.allow({

});

Meteor.publish('userFirstname', function() {
    return Meteor.users.find({_id: this.userId},
        { fields: {'firstname': 1}});
})