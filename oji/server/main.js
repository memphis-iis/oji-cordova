import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base'
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles


const SEED_ADMIN = {
    username: 'testAdmin',
    password: 'password',
    email: 'testAdmin@memphis.edu',
    firstName: 'Johnny',
    lastName: 'Test',
    org : "",
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
    org : "",
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
    org : "",
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
    org : "alksdjhfaslkd",
    supervisorID: "0",
    role: 'user',
    supervisorInviteCode: null
};
const SEED_USERS = [SEED_ADMIN, SEED_SUPERVISOR, SEED_USER, SEED_USER2];
const SEED_ROLES = ['user', 'supervisor', 'admin']


Meteor.startup(() => {
    //load default JSON assessment into mongo collection
    if(Assessments.find().count() === 0){
        console.log('Importing Default Assessments into Mongo.')
        var data = JSON.parse(Assets.getText('defaultAssessments.json'));
        console.log(data);
        for (var i =0; i < data['assessments'].length; i++){
            assessment = data['assessments'][i]['assessment'];
            console.log(assessment);
            Assessments.insert(assessment);
        };
    }
    //create seed roles
    for(let role of SEED_ROLES){
        if(!Meteor.roles.findOne({ '_id' : role })){
            Roles.createRole(role);
        }
    }
    let newOrgId;
    //create seed user
    for(let user of SEED_USERS){
        if (!Accounts.findUserByUsername(user.username)) {
            const uid = Accounts.createUser({
                username: user.username,
                password: user.password,
                email: user.email,
            });
            
            addUserToRoles(uid, user.role);
            if(user.role == "admin"){
                Orgs.insert({
                    orgName: "IIS",
                    orgOwnerId: uid,
                    orgDesc: "Testing"
                });
                newOrgId = Orgs.findOne({orgOwnerId: uid})._id;
                Meteor.call('generateInvite',uid);
            }

            Meteor.users.update({ _id: uid }, 
                {   $set:
                    {
                        firstname: user.firstName,
                        lastname: user.lastName,
                        supervisor: user.supervisorID,
                        organization: user.org ? user.org: newOrgId
                    }
               }
            );
        }
    }
});

//Global Methods
Meteor.methods({
    getInviteInfo,
    createNewUser: function(user, pass, emailAddr, firstName, lastName, linkId=""){
        if(linkId){
            var {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName} = getInviteInfo(linkId);                    
        } else {
            var targetOrgId = null
            var targetSupervisorId = null;                     
        }
        if (!Accounts.findUserByUsername(user)) {
            if (!Accounts.findUserByEmail(emailAddr)){
                const uid = Accounts.createUser({
                    username: user,
                    password: pass,
                    email: emailAddr,
                    firstname: firstName,
                    lastname: lastName,
                    organization: targetOrgId,
                    supervisor: targetSupervisorId,
                    supervisorInviteCode: null,
                });
                Meteor.users.update({ _id: uid }, 
                    {   $set: 
                        {
                            firstname: firstName,
                            lastname: lastName,
                            organization: targetOrgId,
                            supervisor: targetSupervisorId,
                        }
                    });
                if(linkId != ""){
                    addUserToRoles(uid, 'user');
                } else {
                    addUserToRoles(uid, 'admin');
                }
            }
            else{
                throw new Meteor.Error ('user-already-exists', `Email ${emailAddr} already in use`);
            }
        }
        else{
            throw new Meteor.Error ('user-already-exists', `User ${user} already exists`);
        }
    },
    createOrganization: function(newOrgName, newOrgOwner, newOrgDesc){
        Orgs.insert({
            orgName: newOrgName,
            orgOwnerId: newOrgOwner,
            orgDesc: newOrgDesc
        });
        newOrgId = Orgs.findOne({orgOwnerId: newOrgOwner})._id;
        Meteor.users.update({ _id: newOrgOwner }, 
            {   $set: 
                {
                    organization: newOrgId,
                }
            });
        return true;
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
        Meteor.users.update({ _id: supervisorId }, 
        {   $set: 
            {
                supervisorInviteCode: link
            }
        });
        return link;
    },
    destroyUser: function(userID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){
            Meteor.users.remove(userID);
        }
    },
    removeSupervisor: function(userId){
        //removes a user from supervisors list if added by mistake. 
        if(Roles.userIsInRole(this.userId, 'admin')){
            addUserToRoles(userId, 'user');
            removeUserFromRoles(userId, 'supervisor');
        }
    },
    editSupervisor: function(supervisorID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){

        }
    },
    addSupervisor: function(userId) {
        //elevate user with user role to supervisor
        if(Roles.userIsInRole(this.userId, 'admin')){
            addUserToRoles(userId, 'supervisor');
            removeUserFromRoles(userId, 'user');
        }
    },

    //assessment data collection
    saveAssessmentData: function(newData){
        trialId = newData.trialId;
        userId = Meteor.userId();
        questionId = newData.questionId;
        console.log('questionid',questionId);
        oldResults = Trials.findOne({_id: trialId});
        if(typeof oldResults === "undefined"){
            data = [];
        } else {
            data = oldResults.data;
        }
        data[newData.questionId] = {
            response: newData.response,
            responseValue: newData.responseValue
        }
        var output = Trials.upsert({_id: trialId}, {$set: {userId: userId, lastAccessed: Date.now(),  data: data}});
        if(typeof output.insertedId === "undefined"){
            Meteor.users.update(userId, {
                $set: {
                  curTrial: {
                      trialId: trialId,
                      questionId: questionId + 1
                  }
                }
              });
            return trialId;
        } else {
            Meteor.users.update(userId, {
                $set: {
                    curTrial: {
                        trialId: output.insertedId,
                        questionId: 1
                    }
                }
              });
            return output.insertedId;
        }
    },
    clearAssessmentProgress: function (){
        userId = Meteor.userId();
        console.log('clear progress');
        Meteor.users.update(userId, {
            $set: {
              curTrial: {
                  trialId: 0,
                  questionId: 0
              }
            }
          });
    }
});

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

function getInviteInfo(inviteCode) {
    supervisor = Meteor.users.findOne({supervisorInviteCode: inviteCode});
    targetSupervisorId = supervisor._id;
    organization = Orgs.findOne({orgOwnerId: supervisor._id});
    targetSupervisorName = supervisor.firstname + " " + supervisor.lastname;
    targetOrgId = supervisor.organization;
    targetOrgName = organization.orgName;
    return {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName};
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

//Publish current assessment information
Meteor.publish('curAssessment', function(id) {
    return Assessments.find({_id: id});
});

//allow admins to see all users of org, Can only see emails of users. Can See full data of supervisors
Meteor.publish('getUsersInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin' )){ 
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user' });
    }
    else if(Roles.userIsInRole(this.userId, 'supervisor')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user', supervisor: this.userId})
    }
});

Meteor.publish('getSupervisorsInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'supervisor' });
    }
});

//Allow users access to Org information
Meteor.publish(null, function() {
    if(Meteor.user()){
        return Orgs.find({orgOwnerId: Meteor.user().organization});
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