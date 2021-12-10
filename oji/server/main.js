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
    role: 'admin',
    supervisorInviteCode: "12345"
};
const SEED_SUPERVISOR = {
    username: 'testSupervisor',
    password: 'password',
    email: 'testSupervisor@memphis.edu',
    firstName: 'Supervisor',
    lastName: 'Test',
    org : 'IIS',
    supervisorID: "0",
    role: 'supervisor',
    supervisorInviteCode: "12345"
};
const SEED_USER = {
    username: 'testUser',
    password: 'password',
    email: 'testUser@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : 'IIS',
    supervisorID: "0",
    role: 'user',
    supervisorInviteCode: null
};
const SEED_USER2 = {
    username: 'testUserNotInIIS',
    password: 'password',
    email: 'testUserNotInIIS@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : 'UUS',
    supervisorID: "0",
    role: 'user',
    supervisorInviteCode: null
};
const SEED_USERS = [SEED_ADMIN, SEED_SUPERVISOR, SEED_USER, SEED_USER2];
const SEED_ROLES = ['user', 'supervisor', 'admin']


// Publish Collections


  Meteor.publish('allOrgs', function () {
    return Orgs.find({})
  });

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
    //create test organization
    Orgs.insert({
        orgId: 0,
        ownerID: "0",
        orgName: "Memphis IIS Testing",  
        orgDesc: "Organizational description."
    })
});

//Global Methods
Meteor.methods({
    createNewUser: function(user, pass, emailAddr, firstName, lastName, linkId=null){
        if(linkId != null){
            Meteor.call('getInviteInfo', linkId, (err, res) => {
                var targetOrgId = null;
                var targetSupervisorId = null;
                if(err){
                    Router.go('linkNotFound');
                    return false;
                } else {
                    var {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName} = res;                    
                }
                if (!Accounts.findUserByUsername(user)) {
                    const uid = Accounts.createUser({
                        username: user,
                        password: pass,
                        email: emailAddr,
                        firstname: firstName,
                        lastname: lastName,
                        organization: targetOrgId,
                        supervisor: targetSupervisorId,
                        supervisorInviteCode: null
                    });
                }
                if(linkId != null){
                    addUsersToRoles(uid, 'user');
                } else {
                    addUsersToRoles(uid, 'admin');
                }
                serverConsole('create user', user, pass, emailAddr, firstName, lastName, targetOrgId, targetSupervisorId);
                return true;
            });
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
    addSupervisor: function(userId) {
        //elevate user with user role to supervisor
        if(Roles.userIsInRole(this.userId, 'admin')){
            addUserToRoles(userId, 'supervisor');
            removeUserFromRoles(userId, 'user');
        }
    },
    createOrganization: function(newOrgName, newOrgOwner, newOrgDesc){
        Orgs.insert({
            orgName: newOrgName,
            orgOwnerId: newOrgOwner,
            orgDesc: newOrgDesc
        });
        return true;
    },
    getInviteInfo: function(inviteCode){
        console.log(inviteCode);
        if(inviteCode == "A"){
            console.log('testing invite routing');
            targetSupervisorId = 0;
            targetSupervisorName = "Super Visor";
            targetOrgId = 0;
            targetOrgName = "UofM IIS";
        } else {
            supervisor = Meteor.users.findOne({supervisorInviteCode: inviteCode});
            targetSupervisorId = supervisor._id;
            targetSupervisorName = supervisor.firstname + " " + supervisor.lastname;
            targetOrgId = supervisor.organization;
            targetOrgName = "";
            console.log(targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName);
        }
        return {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName};
    },
    generateInvite: function(supervisorId){
        var link = '';
        var length = 16;
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        var unique = false;
        while(unique == false){;
            for ( var i = 0; i < length; i++ ) {
                link += characters.charAt(Math.floor(Math.random() * charactersLength));
            }  
            linkFound = Meteor.users.find({supervisorInviteCode: link}).fetch().length; 
            if(linkFound == 0){
                unique = true;
            } else {
                link = "";
            }
        }
        serverConsole(link);
        Meteor.users.update({ _id: supervisorId }, 
        {   $set: 
            {
                supervisorInviteCode: link
            }
        });
        return link;
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
    Meteor.users.update({ _id: uid }, { $set: { role: Roles.getRolesForUser(uid)[0] }});
}

function removeUserFromRoles(uid, roles){
    Roles.removeUsersFromRoles(uid, roles);
    Meteor.users.update({ _id: uid }, { $set: { role: Roles.getRolesForUser(uid)[0] }});
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
Meteor.publish(null, function() {
    return Meteor.users.find({_id: this.userId});
});

//allow admins to see all users of org, Can only see emails of users. Can See full data of supervisors
Meteor.publish('getUsersInOrg', function() {
    if(Roles.userIsInRole(this.userId, ['admin', 'supervisor'] )){
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