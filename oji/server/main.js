import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base'
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles


const SEED_ADMIN = {
    username: 'testAdmin',
    password: 'password',
    email: 'testAdmin@memphis.edu',
    firstName: 'Johnny',
    lastName: 'Test',
    org : 'IIS',
    supervisorID: "0",
    role: 'admin'
};
const SEED_SUPERVISOR = {
    username: 'testSupervisor',
    password: 'password',
    email: 'testSupervisor@memphis.edu',
    firstName: 'Supervisor',
    lastName: 'Test',
    org : 'IIS',
    supervisorID: "0",
    role: 'supervisor'
};
const SEED_USER = {
    username: 'testUser',
    password: 'password',
    email: 'testUser@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : 'IIS',
    supervisorID: "0",
    role: 'user'
};
const SEED_USER2 = {
    username: 'testUserNotInIIS',
    password: 'password',
    email: 'testUserNotInIIS@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : 'UUS',
    supervisorID: "0",
    role: 'user'
};
const SEED_USERS = [SEED_ADMIN, SEED_SUPERVISOR, SEED_USER, SEED_USER2];
const SEED_ROLES = ['user', 'supervisor', 'admin']

Meteor.startup(() => {
    //create seed roles
    for(let role of SEED_ROLES){
        if(!Meteor.roles.findOne({ '_id' : role })){
            Roles.createRole(role);
        }
    }
    //create seed user
    for(let user of SEED_USERS){
        if (!Accounts.findUserByUsername(user.username)) {
            const uid = Accounts.createUser({
                username: user.username,
                password: user.password,
                email: user.email,
            });
            Meteor.users.update({ _id: uid }, 
                {   $set: 
                    {
                        firstname: user.firstName,
                        lastname: user.lastName,
                        organization: user.org,
                        supervisor: user.supervisorID
                    }
                });
            addUserToRoles(uid, user.role);
            console.log(user.username + ' is in role ' + user.role);
        }
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
                        supervisor: null
                    }
                });
            addUserToRoles(uid, 'user');
            return true;
        }
    },
    editSupervisor: function(supervisorID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){

        }
    }, 
    destroyUser: function(userID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){
            Meteor.users.remove(userID);
        }
    },
    elevateUser: function(userEmail) {
        //elevate user with user role to supervisor
        if(Roles.userIsInRole(this.userId, 'admin')){
            const user = Meteor.users.findOne( {"emails.address": userEmail} );
            addUserToRoles(user._id, 'supervisor');
            removeUserFromRoles(user._id, 'user');
        }
    },
    removeSupervisor: function(userId){
        //removes a user from supervisors list if added by mistake. 
        if(Roles.userIsInRole(this.userId, 'admin')){
            addUserToRoles(userId, 'user');
            removeUserFromRoles(userId, 'supervisor');
        }
    }
})

//Server Methods
function addUserToRoles(uid, roles){
    Roles.addUsersToRoles(uid, roles);
    Meteor.users.update({ _id: uid }, { $set: { role: Roles.getRolesForUser(uid) }});
}

function removeUserFromRoles(uid, roles){
    Roles.removeUsersFromRoles(uid, roles);
    Meteor.users.update({ _id: uid }, { $set: { role: Roles.getRolesForUser(uid) }});
}

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

//Show current user data for current user
Meteor.publish('userFirstname', function() {
    return Meteor.users.find({_id: this.userId});
});

//allow admins to see all users of org, Can only see emails of users. Can See full data of supervisors
Meteor.publish('getUsersInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user' }, { fields: {'emails': 1, 'role': 1}});
    }
    if(Roles.userIsInRole(this.userId, 'supervisor')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user' });
    }
});

Meteor.publish('getSupervisorsInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'supervisor' });
    }
});

//allow the use of Roles.userIsInRole() accorss client
Meteor.publish(null, function () {
    if (this.userId) {
        return Meteor.roleAssignment.find({ 'user._id': this.userId });
    } 
    else {
        this.ready()
    }
});