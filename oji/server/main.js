import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

const SEED_USERNAME = 'testUser';
const SEED_PASSWORD = 'password';
const SEED_EMAIL = 'testUser@memphis.edu';
const SEED_FIRSTNAME = 'Johnny';
const SEED_LASTNAME = 'Test';
const SEED_ORGANIZATION  = 'IIS';
const SEED_SUPERVISORID = "0"


// Publish Collections

Meteor.publish('allInvites', function () {
    return Invites.find({})
  });
  Meteor.publish('allOrgs', function () {
    return Orgs.find({})
  });

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
    //create test organization
    if(!Orgs.find()){
        Orgs.insert({
            orgId: 0,
            ownerEmail: "testadmin@memphis.edu",
            orgName: "Memphis IIS Testing",  
        })
    }

    //create test invite link
    if(!Invites.find()){
        Invites.insert({
            targetOrg: 0,
            code: 1234
        })
    }
});

//Global Methods
Meteor.methods({
    createNewUser: function(user, pass, emailAddr, firstName, lastName, org){
        serverConsole('createNewUser', user);
        if (!Accounts.findUserByUsername(user)) {
            Accounts.createUser({
                username: user,
                password: pass,
                email: emailAddr,
                firstname: firstName,
                lastname: lastName,
                organization: org,
                supervisor: null,
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

