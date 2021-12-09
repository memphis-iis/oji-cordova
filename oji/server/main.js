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


// Publish Collections

Meteor.publish('allInvites', function () {
    return Invites.find({})
  });
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

    //create test invite link
    Invites.insert({
        targetOrg: 0,
        code: 1234
    })



});

//Global Methods
Meteor.methods({
    createNewUser: function(user, pass, emailAddr, firstName, lastName, org){
        serverConsole('createNewUser', user);
        if (!Accounts.findUserByUsername(user)) {
            const uid = Accounts.createUser({
                username: user,
                password: pass,
                email: emailAddr,
                firstname: firstName,
                lastname: lastName,
                organization: org,
                supervisor: null,
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
    createOrganization: function(newOrgName, newOrgOwner, newOrgDesc){
        Organizations.insert({
            orgName: newOrgName,
            orgOwner: newOrgOwner,
            orgDesc: newOrgDesc
        });
        return true;
    },
    generateOrgLink: function(orgId){
        var link           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            link += characters.charAt(Math.floor(Math.random() * charactersLength));
        }    
        Invites.insert({
            targetOrg: orgId,
            code: link
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