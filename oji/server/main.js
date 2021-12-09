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
const SEED_USERS = [SEED_ADMIN, SEED_SUPERVISOR, SEED_USER];
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
                        supervisor: user.supervisorID,
                    }
                });
            Roles.addUsersToRoles(uid, user.role);
            console.log(user.username + ' is in role admin? ' + Roles.userIsInRole(uid, 'admin'));
            console.log(user.username + ' is in role supervisor? ' + Roles.userIsInRole(uid, 'supervisor'));
            console.log(user.username + ' is in role user? ' + Roles.userIsInRole(uid, 'user'));
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
                        supervisor: null,
                    }
                });
            Roles.addUsersToRoles(uid, 'user');
            return true;
        }
    },
    getSupervisors: function() {
        if(Roles.userIsInRole(this.userId, ['admin'])){
            return Roles.getUsersInRole(['supervisor']).fetch();
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