import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base'
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles

const SEED_USERNAME = 'testUser';
const SEED_PASSWORD = 'password';
const SEED_EMAIL = 'testUser@memphis.edu';
const SEED_FIRSTNAME = 'Johnny';
const SEED_LASTNAME = 'Test';
const SEED_ORGANIZATION  = 'IIS';
const SEED_SUPERVISORID = "0";
const SEED_SUPERVISORLINK = "12345";
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
    if (!Accounts.findUserByUsername(SEED_USERNAME)) {
        const uid = Accounts.createUser({
            username: SEED_USERNAME,
            password: SEED_PASSWORD,
            email: SEED_EMAIL,
        });

    }
    //create test organization
    Orgs.insert({
        orgId: 0,
        ownerEmail: "testadmin@memphis.edu",
        orgName: "Memphis IIS Testing",  
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
                    Meteor.users.update({ _id: uid }, 
                        {   $set: 
                            {
                                firstname: firstName,
                                lastname: lastName,
                                organization: targetOrgId,
                                supervisor: targetSupervisorId,
                            }
                        });
                    Roles.addUsersToRoles(uid, 'user');
                    serverConsole('create user', user, pass, emailAddr, firstName, lastName, targetOrgId, targetSupervisorId);
                    return true;
                }
            });
        }
    },
    createOrganization: function(newOrgName, newOrgOwner, newOrgDesc){
        Organizations.insert({
            orgName: newOrgName,
            orgOwner: newOrgOwner,
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