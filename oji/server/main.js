import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles
import { calculateScores } from './subscaleCalculations.js';
import { Canvas, Image } from 'canvas';
import { firebaseConfig } from './private/firebaseConfig.js';
import { Push } from 'meteor/activitree:push';
import { serviceAccountData } from './private/serviceAccount.js';
import Papa from 'papaparse';
import { Email } from 'meteor/email';

Push.debug = true;

Push.Configure({
    // appName: 'Activitree',
    firebaseAdmin: {
      serviceAccountData,
      databaseURL: firebaseConfig.databaseURL,
    },
    defaults: {
      // ******** Meteor Push Messaging Processor *******
      sendBatchSize: 5,          // Configurable number of notifications to send per batch
      sendInterval: 3000,
      keepNotifications: false,  // the following keeps the notifications in the DB
      delayUntil: null,          // Date
      sendTimeout: 60000,        // miliseconds 60 x 1000 = 1 min
  
      // ******** Global Message *******
      appName: 'Oji',        // Serve it as a 'from' default for IOS notifications
      sound: 'note',             // String (file has to exist in app/src/res/... or default on the mobile will be used). For Android no extension, for IOS add '.caf'
      data: null,                // Global Data object - applies to all vendors if specific vendor data object does not exist.
      imageUrl: 'https://ojis-journey.com/logo.png', // String - URL to an image to be displayed in the notification
      badge: 1,                  // Integer
      vibrate: 1,                // Boolean // TODO see if I really use this.
      requireInteraction: false, // TODO Implement this and move it to where it belongs
      action: '', // Android, WebPush - on notification click follows this URL
      analyticsLabel: 'ojis-journey',   // Android, IOS: Label associated with the message's analytics data.
  
      // ******* IOS Specifics ******
      apnsPriority: '10',
      topic: 'com.uomiis.ojicordova',   // String = the IOS App id
      launchImage: '',           // IOS: String
      iosData: null,             // Data object targeted to the IOS notification
      // category: null,         // IOS: IOS - not in user
  
      // ******* Android Specificas *******
      icon: 'statusbaricon',     // String (name of icon for Android has to exist in app/src/res/....)
      color: '#337FAE',          // String e.g 3 rrggbb
      ttl: '86400s',             // if not set, use default max of 4 weeks
      priority: 'HIGH',          // Android: one of NORMAL or HIGH
      notificationPriority: 'PRIORITY_DEFAULT', // Android: one of none, or PRIORITY_MIN, PRIORITY_LOW, PRIORITY_DEFAULT, PRIORITY_HIGH, PRIORITY_MAX
      collapseKey: 1,            // String/ Integer??, Android:  A maximum of 4 different collapse keys is allowed at any given time.
      androidData: null,           // Data object targeted to the Android notiffication
      visibility: 'PRIVATE', // Android: One of 'PRIVATE', 'PUBLIC', 'SECRET'. Default is 'PRIVATE',
      // silent: false,             // Not implemented
      // sticky: false,             // Not implemented
      // localOnly: false,          // Not implemented: Some notifications can be bridged to other devices for remote display, such as a Wear OS watch.
      // defaultSound: false,       // Not implemented: If set to true, use the Android framework's default sound for the notification.
      // defaultVibrateTimings: false, // Not implemented: If set to true, use the Android framework's default vibrate pattern for the notification.
      // defaultLightSettings: true, // Not implemented: If set to true, use the Android framework's default LED light settings for the notification.
      // vibrateTimings: ['3.5s'],  // Not implemented: Set the vibration pattern to use.
  
      // ******* Web Specifics *******
      webIcon: 'https://ojis-journey.com/logo.png',
      webData: null,                 // Data object targeted to the Web notification
      webTTL: `${3600 * 1000}`       // Number of seconds as a string
    }
})
var fs = Npm.require('fs');

const SEED_ADMIN = {
    username: 'testAdmin',
    password: 'password',
    email: 'testAdmin@memphis.edu',
    firstName: 'Johnny',
    lastName: 'Test',
    org : "",
    supervisorID: "0",
    role: 'admin',
    supervisorInviteCode: "12345",
    sex: 'female',
    assigned: [],
    nextModule: -1
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
    supervisorInviteCode: "12345",
    sex: 'male',
    assigned: [],
    nextModule: -1
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
    supervisorInviteCode: null,
    sex: 'female',
    assigned: [],
    hasCompletedFirstAssessment: false,
    nextModule: 0
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
    supervisorInviteCode: null,
    sex: 'male',
    assigned: [],
    hasCompletedFirstAssessment: false,
    nextModule: 0
};
const SEED_USERS = [SEED_ADMIN, SEED_SUPERVISOR, SEED_USER, SEED_USER2];
const SEED_ROLES = ['user', 'supervisor', 'admin'];


//Configure Push Notifications
serviceAccountData = null;
//Public Dynamic Assets


Meteor.startup(() => {
    if (Meteor.isServer) {
        Meteor.publish('files.images.all', function () {
          return Files.find().cursor;
        });
    }

    //Change for defaults
    importDefaultContent = Meteor.settings.importDefaultContent;
    importDefaultUsers = Meteor.settings.importDefaultUsers;
    importOutsideSeedUsers = Meteor.settings.importOutsideSeedUsers;

    //start synchron job to send notification emails
    SyncedCron.add(
        {
            name: 'Send Notification Emails/Mobile Push Notifications',
            schedule: function(parser) {
                // parser is a later.parse object
                return parser.text('every 5 minutes');
            },
            job: function() {
                Meteor.call('sendNotificationEmails');
                sendPushNotifications();
            }
        }
    );
    //start synchron job to import private asset into files collection
    SyncedCron.start();
    
    //Iron Router Api
    Router.route('/api',{
    where: "server",
    action: function (){
        this.response.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        username = this.request.headers['x-user-id'];
        loginToken = this.request.headers['x-auth-token'];
        user = Meteor.users.findOne({username: username});
        isTokenExpired = true;
        keys = user.api;
        now = new Date();
        expDate = keys.expires;
        expDate.setDate(expDate.getDate())
        if(now < expDate){
            isTokenExpired = false;
        }
        if(!user || user.api.token != loginToken || isTokenExpired == true){
            this.response.end("{sucess: false, message: 'incorrect username or expired token'}");
        } else {
            //check if user is an author
            if(user.author){
                console.log('author request from API, user: ' + user.username);
                //get all users in organization
                organizationUsers = Meteor.users.find({}).fetch();
                //for each user, get their data
                organizationData = [];
                //console.log count of users
                for(let user of organizationUsers){
                    //get user data
                    data = getAllDataFromUser(user._id);
                    organizationData.push(data);
                }
                returnData = {
                    success: true,
                    note: "Author request, all users returned.",
                    data: organizationData
                }
                //return data
                this.response.end(JSON.stringify(returnData));
                return;
            }
            //check if user is an admin
            if(Roles.userIsInRole(user, 'admin')){
                console.log('admin request from API, user: ' + user.username);
                //get all users in organization
                organizationUsers = Meteor.users.find({organization: user.organization}).fetch();
                //for each user, get their data
                organizationData = [];
                //console.log count of users
                for(let user of organizationUsers){
                    //get user data
                    data = getAllDataFromUser(user._id);
                    organizationData.push(data);
                }
                returnData = {
                    success: true,
                    data: organizationData
                }
                //return data
                this.response.end(JSON.stringify(returnData));
                return;
            } else {
                console.log('supervisor request from API, user: ' + user.username);
                //get user data of everyone supervised by user
                organizationUsers = Meteor.users.find({supervisorID: user._id}).fetch();
                //for each user, get their data
                organizationData = [];
                for(let user of organizationUsers){
                    //get user data
                    data = getAllDataFromUser(user._id);
                    organizationData.push(data);
                }
                //return data
                returnData = {
                    success: true,
                    data: organizationData
                }
                //return data
                this.response.end(JSON.stringify(returnData));
                return;
            }
        } 
    }
  });


    //load default JSON assessment into mongo collection
    if((Assessments.find().count() === 0 || Modules.find().count() === 0) && importDefaultContent){
        console.log('Importing Default Content');
        Meteor.call('reloadDefaults');
    }


    //create seed roles
    for(let role of SEED_ROLES){
        if(!Meteor.roles.findOne({ '_id' : role })){
            Roles.createRole(role);
        }
    }

        //check for seed users in /ojifiles/seedUsers.json
        if (importOutsideSeedUsers){
        newSeedUsers = [];
        //get a list of all assessments ids
        assessmentIDs = Assessments.find({}).map(function(assessment){return assessment._id});
        //get a list of all module ids
        moduleIDs = Modules.find({}).map(function(module){return module._id});
        console.log("Assessment IDs: " + assessmentIDs);
        console.log("Module IDs: " + moduleIDs);
        fs = Npm.require('fs');
            var data = fs.readFileSync('/ojidocs/testusers.json', 'utf8');
            newSeedUsers = JSON.parse(data);
            console.log("Imported seed users from /ojifiles/seedUsers.json");
            //get a list of all admin users in newSeedUsers
            newAdminUsers = newSeedUsers.admins || [];
            //iterate through newAdminUsers, checking if they exist in the database, if so, drop them from the array
            for (var i = 0; i < newAdminUsers.length; i++) {
               //filter out existing users
                if (Meteor.users.findOne({username: newAdminUsers[i].username})) {
                    console.log("User " + newAdminUsers[i].username + " already exists, removing from newAdminUsers array.");
                    newAdminUsers.splice(i, 1);
                    i--;
                }
            }
            console.log("There are " + newAdminUsers.length + " new admin users to create.")
            //create a user for each admin user
            for (var i = 0; i < newAdminUsers.length; i++) {
                console.log("Creating user " + newAdminUsers[i].username);
                const uid = Accounts.createUser({
                    username: newAdminUsers[i].username,
                    password: newAdminUsers[i].password,
                    email: newAdminUsers[i].email,
                });
                //set the user's role to admin
                Roles.addUsersToRoles(uid, 'admin');
                //increment the index of the assessment and module arrays, set to 0 if they are at the end
                assindex = newAdminUsers[i].AssessmentIndex || 0;
                modindex = newAdminUsers[i].ModuleIndex || 0;
                //make an array containing an assessment and a module
                assignments = [];
                if(assessmentIDs[i]){
                    assignments.push({type: "assessment", id: assessmentIDs[i]});
                }
                if(moduleIDs[i]){
                    assignments.push({type: "module", id: moduleIDs[i]});
                }
                console.log("Assignments: " + assignments.length);
                //remove the first assessment and the first module from their respective arrays
                assessmentIDs.splice(0,1);
                moduleIDs.splice(0,1);
                //create an organization for the user
                ordId = Orgs.insert({
                    orgName: newAdminUsers[i].org,
                    orgOwnerId: uid,
                    orgDesc: "Testing",
                    newUserAssignments: assignments,
                });
                //set the user's first and last name
                Meteor.users.update({_id: uid}, {
                    $set: {
                        "firstname": newAdminUsers[i].firstname,
                        "lastname": newAdminUsers[i].lastname,
                        "organization" : ordId,
                        "supervisorID": "",
                        "role": "user",
                        "supervisorInviteCode": null,
                        "supervisorID": "",
                        "role": "admin",
                        "supervisorInviteCode": null,
                        "sex": "male",
                        "assigned": [],
                        "hasCompletedFirstAssessment": false,
                        "nextModule": 0
                    }
                });
                //generate a supervisor invite code for the user
                Meteor.call('generateInvite',uid);
                  //export all orgs to a flat csv file
                  allOrgs = Orgs.find({}).fetch();
                  //remove the _id field from all orgs
                  for (var j = 0; j < allOrgs.length; j++) {
                      delete allOrgs[j]._id;
                      //replace the orgOwnerId with the supervisorInviteCode of the owner
                      allOrgs[j].inviteCode = Meteor.users.findOne({_id: allOrgs[j].orgOwnerId}).supervisorInviteCode;
                      //delete the orgOwnerId field
                      delete allOrgs[j].orgOwnerId;
                      //delete the orgDesc and newUserAssignments fields
                      delete allOrgs[j].orgDesc;
                      delete allOrgs[j].newUserAssignments;
                  }
                  csv = Papa.unparse(allOrgs);
                  //write to file in /ojifiles
                  fs.writeFileSync('/ojidocs/orgs.csv', csv);
            }
            //get a list of all supervisor users in newSeedUsers
            newSupervisorUsers = newSeedUsers.supervisors || [];
            //filter out existing users
            //iterate through newSupervisorUsers, checking if they exist in the database, if so, drop them from the array
            for (var i = 0; i < newSupervisorUsers.length; i++) {
                //filter out existing users
                    if (Meteor.users.findOne({username: newSupervisorUsers[i].username})) {
                        console.log("User " + newSupervisorUsers[i].username + " already exists, removing from newAdminUsers array.");
                        newSupervisorUsers.splice(i, 1);
                        i--;
                    }
                }
                console.log("There are " + newSupervisorUsers.length + " new supervisor users to create.")
            //create a user for each supervisor user
            for (var i = 0; i < newSupervisorUsers.length; i++) {
                //get the organization id for the supervisor's organization
                Orgs.find({orgName: newSupervisorUsers[i].org}).forEach(function(org){
                    ordId = org._id;
                }
                );
                //match the supervisor's organization to an existing organization
                orgId = Orgs.findOne({orgName: newSupervisorUsers[i].org})._id;
                //create the user
                const uid = Accounts.createUser({
                    username: newSupervisorUsers[i].username,
                    password: newSupervisorUsers[i].password,
                    email: newSupervisorUsers[i].email,
                });
                //set the user's role to supervisor
                Roles.addUsersToRoles(uid, 'supervisor');
                //set the user's first and last name
                Meteor.users.update({_id: uid}, {
                    $set: {
                        "firstname": newSupervisorUsers[i].firstname,
                        "lastname": newSupervisorUsers[i].lastname,
                        "organization" : ordId,
                        "supervisorID": "",
                        "role": "user",
                        "supervisorInviteCode": null,
                        "supervisorID": "",
                        "role": "supervisor",
                        "supervisorInviteCode": null,
                        "sex": "male",
                        "assigned": [],
                        "hasCompletedFirstAssessment": false,
                        "nextModule": 0
                    }
                });
                //generate a supervisor invite code for the user
                Meteor.call('generateInvite',uid);
            }
            //get a list of all user users in newSeedUsers
            newUserUsers = newSeedUsers.users || [];
            //iterate through newUserUsers, checking if they exist in the database, if so, drop them from the array
            for (var i = 0; i < newUserUsers.length; i++) {
                //filter out existing users
                    if (Meteor.users.findOne({username: newUserUsers[i].username})) {
                        console.log("User " + newUserUsers[i].username + " already exists, removing from newAdminUsers array.");
                        newSupervisorUsers.splice(i, 1);
                        i--;
                    }
                }
                console.log("There are " + newUserUsers.length + " new users to create.")
            //create a user for each user user
            for (var i = 0; i < newUserUsers.length; i++) {
                //get the organization id for the user's organization
                Orgs.find({orgName: newUserUsers[i].org}).forEach(function(org){
                    ordId = org._id;
                    supervisorId = org.orgOwnerId;
                }
                );
                //create the user
                const uid = Accounts.createUser({
                    username: newUserUsers[i].username,
                    password: newUserUsers[i].password,
                    email: newUserUsers[i].email,
                });
                //set the user's role to user
                Roles.addUsersToRoles(uid, 'user');
                //set the user's first and last name
                Meteor.users.update({_id: uid}, {
                    $set: {
                        "firstname": newUserUsers[i].firstname,
                        "lastname": newUserUsers[i].lastname,
                        "organization" : ordId,
                        "supervisorID": "",
                        "role": "user",
                        "supervisorInviteCode": null,
                        "supervisor": supervisorId,
                        "role": "user",
                        "supervisorInviteCode": null,
                        "sex": "male",
                        "assigned": [],
                        "hasCompletedFirstAssessment": false,
                        "nextModule": 0
                    }
                });
            }           
        }
        
    let newOrgId;
    //create seed user
    if(importDefaultUsers){
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
                        orgDesc: "Testing",
                        newUserAssignments: []
                    });
                    newOrgId = Orgs.findOne({orgOwnerId: uid})._id;
                    Meteor.call('generateInvite',uid);
                }

                let supervisorID = '';
                if(user.username == 'testUser'){
                    supervisorID =  Accounts.findUserByUsername(SEED_SUPERVISOR.username)._id;
                }
                Meteor.users.update({ _id: uid }, 
                    {   $set:
                        {
                            sex: user.sex,
                            firstname: user.firstName,
                            lastname: user.lastName,
                            supervisor: supervisorID,
                            organization: user.org ? user.org: newOrgId,
                            sex: user.sex,
                            assigned: user.assigned,
                            hasCompletedFirstAssessment: false,
                            startedJourney: false,
                            nextModule: 0,
                            author: true,
                            assessmentSchedule: "preOrientation"
                        }
                    }
                );
            }
        }
    }
});

//Global Methods
Meteor.methods({
    getInviteInfo,
    createNewUser: function(user, pass, emailAddr, firstName, lastName, sex, gender ,acceptedTermsTimestamp, linkId=""){
        if(linkId){
            var {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName} = getInviteInfo(linkId);    
            var organization = Orgs.findOne({_id: targetOrgId});          
        } else {
            var targetOrgId = null
            var targetSupervisorId = null;  
            var organization = {newUserAssignments: []};   
        }
        if (!Accounts.findUserByUsername(user)) {
            if (!Accounts.findUserByEmail(emailAddr)){
                const uid = Accounts.createUser({
                    username: user,
                    password: pass,
                    email: emailAddr
                });
                const authors = Meteor.settings.public.authors;
                console.log(authors);
                author = false;
                if(authors?.indexOf(emailAddr) !== -1){
                    author = true;
                }
                Meteor.users.update({ _id: uid }, 
                    {   $set: 
                        {
                            sex: sex,
                            firstname: firstName,
                            lastname: lastName,
                            organization: targetOrgId,
                            supervisor: targetSupervisorId,
                            supervisorInviteCode: null,
                            hasCompletedFirstAssessment: false,
                            gender: gender,
                            assigned: organization.newUserAssignments || [],
                            nextModule: 0,
                            author: author,
                            goals: [],
                            assessmentSchedule: "preOrientation",
                            acceptedTermsTimestamp: acceptedTermsTimestamp
                        }
                    });
                if(linkId != ""){
                    addUserToRoles(uid, 'user');
                    targetOrgOwner = Orgs.findOne({_id: targetOrgId}).orgOwnerId;
                    sendSystemMessage(targetSupervisorId, `${firstName} ${lastName} has joined your organization.`, "New User Added");
                } else {
                    addUserToRoles(uid, 'admin');
                    sendSystemMessage(uid, "Welcome to Oji!", "Welcome");
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
    createOrganization: function(newOrgName, newOrgOwner, newOrgDesc, useDefaultFlow){
        allAssessments = Assessments.find().fetch();
        allModules = Modules.find().fetch();
        newUserAssignments = [];
        if(useDefaultFlow){
            for(i=0; i<allAssessments.length; i++){
                assessment = allAssessments[i]._id;
                data = {
                    assignment: assessment,
                    type: "assessment"
                }
                newUserAssignments.push(data);
            }
            for(i=0; i<allModules.length; i++){
                modules = allModules[i]._id;
                data = {
                    assignment: modules,
                    type: "module"
                }
                newUserAssignments.push(data);
            }
        }
        Orgs.insert({
            orgName: newOrgName,
            orgOwnerId: newOrgOwner,
            orgDesc: newOrgDesc,
            newUserAssignments: newUserAssignments
        });
        sendSystemMessage(newOrgOwner, `${newOrgName} has been created.`, "New Organization Created");
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
        var length = 5;
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
    sendNotificationEmails: function(){
        if(Meteor.settings.public.sendEmails){
            var Emails = Emails.find.fetch();
            for(i=0; i<Emails.length; i++){
                var email = Emails[i];
                var emailAddr = email.email;
                var subject = email.subject;
                var message = email.message;
                var emailData = {
                    to: emailAddr,
                    from: 'Oji',
                    subject: subject,
                    text: message
                };
                Email.send(emailData);
                Emails.remove({_id: email._id});
            }
        }
    },
    destroyUser: function(userID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){
            Meteor.users.remove(userID);
        }
    },
    resetUserJourney: function(userID) {
        console.log("Reset User Journey: ",userID);
        if(Roles.userIsInRole(this.userId, ['admin'])){
            userOrg = Meteor.users.findOne({_id: userID}).organization;
            userOrgInfo = Orgs.findOne({_id: userOrg});
            Meteor.users.update({
                _id: userID
            }, {
                $set: {
                    hasCompletedFirstAssessment: false,
                    assigned: userOrgInfo.newUserAssignments || [],
                    nextModule: 0,
                    goals: [],
                    assessmentSchedule: "preOrientation",
                    curModule: null,
                    curAssessment: null,
                    curAssingment: null,
                    certificates: []
                }
            });
            //remove all user trials
            Trials.remove({userId: userID});
            //remove each user's assessment results
            ModuleResults.remove({userId: userID});
        }
    },
    transferUserToOtherSupervisor: function(userID, newSupervisorID){
        console.log("Transfer Supervisor: ",userID, newSupervisorID);
        if(Roles.userIsInRole(this.userId, ['admin'])){
            Meteor.users.update({ _id: userID }, 
                {   $set: 
                    {
                        supervisor: newSupervisorID,
                    }
                });
        }
        sendSystemMessage(newSupervisorID, `${Meteor.users.findOne({_id: userID}).firstname} ${Meteor.users.findOne({_id: userID}).lastname} has been transferred to you.`, "New User Added");
    },
    transferUserToOtherOrg: function(userID, newOrgCode){
        console.log("Transfer Organization: ",userID, newOrgCode);
        inviteInfo = getInviteInfo(newOrgCode);
        inviteOrgId = inviteInfo.targetOrgId;
        inviteSupervisorId = inviteInfo.targetSupervisorId;
        if(Roles.userIsInRole(this.userId, ['admin'])){
            Meteor.users.update({ _id: userID }, 
                {   $set: 
                    {
                        supervisor: inviteSupervisorId,
                        organization: inviteOrgId,
                    }
                });
        }
        sendSystemMessage(inviteSupervisorId, `${Meteor.users.findOne({_id: userID}).firstname} ${Meteor.users.findOne({_id: userID}).lastname} has been transferred to you.`, "New User Added");
    },
    userIsAdmin: function(){
        return Roles.userIsInRole(Meteor.userId(), ['admin']);
    },
    removeSupervisor: function(userId){
        //removes a user from supervisors list if added by mistake. 
        if(Roles.userIsInRole(this.userId, 'admin')){
            addUserToRoles(userId, 'user');
            removeUserFromRoles(userId, 'supervisor');
        }
    },
    getAsset: function(assetId){
        return Assets.getBinary(assetId);
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
    changeAssignmentToNewUsers: function(assignment){
        Orgs.upsert({_id: Meteor.user().organization},{$set: {newUserAssignments: assignment}});
    },
    assignToAllUsers: function(assignment){
        org = Meteor.user().organization;
        allUsers = Meteor.users.find({organization: org, role: 'user'}).fetch();
        for(i = 0; i < allUsers.length; i++){
            curAssignments = allUsers[i].assigned;
            if(!curAssignments.includes(assignment)){
                curAssignments.push(assignment);
            }
            Meteor.users.upsert({_id: allUsers[i]._id}, {$set: {assigned: curAssignments}});
        }
    },
    changeAssignmentOneUser: function(userId, assignment){
        curUser = Meteor.users.findOne({_id: userId});
        curAssignment = curAssignment.id;
        //compare if curAssignment  is in assignment array in .assignment, if it is, reset curAssignment to null
        filter = assignment.filter(function(assignment){
            return assignment.assignment == curAssignment;
        });
        //if filter is empty, then curAssignment is not in assignment array, so we need to reset curModule
        curModule = curUser.curModule;
        if(filter.length == 0){
            curModule = {
                moduleId: null,
                pageId: 0,
                questionId: 0,
            }
        }
        Meteor.users.upsert({_id: userId},{$set: {
            assigned: assignment,
            curModule: curModule
        }});
    },
    deleteAssessment: function(assessment){
        Assessments.remove({_id: assessment});
    },
    copyAssessment: function(input){
        orgId = input.newOwner;
        assessment = input.assessment;
        copiedAssessment = Assessments.findOne({_id: assessment});
        delete copiedAssessment._id;
        copiedAssessment.owner = orgId;
        copiedAssessment.title = copiedAssessment.title + " copy";
        Assessments.insert(copiedAssessment);
    },
    createAssessment: function(){
        orgId = Meteor.user().organization,
        newAssessment = {
            title: "New Assessment",
            identifier: "New",
            display: false,
            description: "Description",
            questions: [],
            answers: [],
            answerValues: [],
            reversedValues: [],
            reversedQuestions: [],
            owner: orgId
        }
        Assessments.insert(newAssessment);
    },
    deleteModule: function(module){
        Modules.remove({_id: module});
    },
    copyModule: function(input){
        orgId = input.newOwner;
        newModule = input.module;
        copiedModule = Modules.findOne({_id: newModule});
        delete copiedModule._id;
        copiedModule.owner = orgId;
        copiedModule.title = copiedModule.title + " copy";
        Modules.insert(copiedModule);
    },
    createModule: function(){
        orgId = Meteor.user().organization,
        newModule = {
            title: "New Module",
            identifier: "New",
            display: false,
            description: "Description",
            pages: [],
            owner: orgId,
            createdBy: Meteor.userId()
        }
        Modules.insert(newModule);
    },
    saveModuleToDefaults: function(module){
        //get the module from the Modules collection
        thisModule = Module.findOne({_id: module});
        //get the defaultModules asset location
        defaultModulesLocation = "/ojidocs/defaultModules";
        //save the module to the defaultModules location as _id.json
        require('fs').writeFileSync(defaultModulesLocation + "/" + module + ".json", JSON.stringify(thisModule));
        console.log("Saved module" + module + " to defaultModules");
    },
    saveAssessmentToDefaults: function(assessment){
       //get the assessment from the Assessments collection
       thisAssessment = Assessments.findOne({_id: assessment});
       //get the defaultAssessments asset location
         defaultAssessmentsLocation = "/ojidocs/defaultAssessments";
         //save the assessment to the defaultAssessments location as _id.json
            require('fs').writeFileSync(defaultAssessmentsLocation + "/" + assessment + ".json", JSON.stringify(thisAssessment));
            console.log("Saved assessment" + assessment + " to defaultAssessments");
    },
    reloadDefaults: function(){
       //use fs to read the directory of the defaultModules and defaultAssessments assets
    defaultModulesDir = "/ojidocs/defaultModules/"
    defaultAssessmentsDir = "/ojidocs/defaultAssessments/"
    //get a list of the files in the defaultModules directory
    defaultModuleFiles = fs.readdirSync(defaultModulesDir);
    //iterate through the list of files and read them into a variable called defaultModules
    defaultModules = [];
    for(i = 0; i < defaultModuleFiles.length; i++){
        defaultModules.push(JSON.parse(fs.readFileSync(defaultModulesDir + defaultModuleFiles[i], "utf8")));
    }
    //delete all modules
    Modules.remove({});
    //insert each module into the Modules collection
    for(i = 0; i < defaultModules.length; i++){
        delete defaultModules[i]._id;
        //set owner to false
        defaultModules[i].owner = false;
        Modules.insert(defaultModules[i]);
    }
    //get a list of the files in the defaultAssessments directory
    defaultAssessmentFiles = fs.readdirSync(defaultAssessmentsDir);
    //iterate through the list of files and read them into a variable called defaultAssessments
    defaultAssessments = [];
    //delete all assessments
    Assessments.remove({});
    for(i = 0; i < defaultAssessmentFiles.length; i++){
        //load defaultAssessments files into variable
        thisAssessment = JSON.parse(fs.readFileSync(defaultAssessmentsDir + defaultAssessmentFiles[i], "utf8"));
        //set owner to false
        thisAssessment.owner = false;
        //remove _id
        delete thisAssessment._id;
        //insert into Assessments collection
        defaultAssessments.push(thisAssessment);
    }
    //insert each assessment into the Assessments collection
    for(i = 0; i < defaultAssessments.length; i++){
        Assessments.insert(defaultAssessments[i]);
    }
    },
    uploadJson: function(path,user, data=false){
        if(data){
            console.log("uploading module from data");
            //check if Json is a module or assessment
            if(data.pages){
                console.log("uploading module");
                var newModule = JSON.parse(data);
                newModule.owner = user;
                newModule.orgOwnedBy = Meteor.users.findOne({_id: user}).organization;
                newModule.createdBy = user;
                delete newModule._id;
                Modules.insert(newModule);
            } else if(data.assessmentReportConstants){
                console.log("uploading assessment");
                var newAssessment = JSON.parse(data);
                newAssessment.owner = user;
                newAssessment.orgOwnedBy = Meteor.users.findOne({_id: user}).organization;
                delete newAssessment._id;
                Assessments.insert(newAssessment);
            }
        } else {
            //check if Json is a module or assessment
            //open path 
            var fs = Npm.require('fs');
            var data = fs.readFileSync(path, 'utf8');
            //convert to json
            var json = JSON.parse(data);
            if(json.pages){
                console.log("uploading module");
                var newModule = JSON.parse(data);
                newModule.owner = user;
                newModule.orgOwnedBy = Meteor.users.findOne({_id: user}).organization;
                newModule.createdBy = user;
                delete newModule._id;
                Modules.insert(newModule);
            }
            if(json.assessmentReportConstants){
                console.log("uploading assessment");
                var newAssessment = JSON.parse(data);
                newAssessment.owner = user;
                newAssessment.orgOwnedBy = Meteor.users.findOne({_id: user}).organization;
                delete newAssessment._id;
                Assessments.insert(newAssessment);
            }
        }
    },
    processPackageUpload: function(path, owner){
        const fs = Npm.require('fs');
        const unzip = Npm.require('unzipper');
        fs.createReadStream(path)
          .pipe(unzip.Parse())
          .on('entry', async function(entry){
            var jsonContent = [];
            var fileNameArray = entry.path.split("/");
            var fileName = fileNameArray[fileNameArray.length - 1];
            var content =  await entry.buffer().then(async function(file){
              let fileSplit = fileName.split(".");
              let type = fileSplit[fileSplit.length - 1];
              if(type =="json"){
                console.log("json file found");
                rawFileContents = file.toString();
                parsedFileContents = JSON.parse(rawFileContents);
                JSONStringContents = JSON.stringify(parsedFileContents);
                fileFinal = {
                    contents: JSONStringContents,
                    fileName: fileName
                }
                jsonContent.push(fileFinal);
              } else {
                const foundFile = Files.findOne({userId: owner, name: fileName});
                if(foundFile){
                  foundFile.remove(function (error){
                    if (error) {
                      console.log(`File ${fileName} could not be removed`, error)
                    }
                    else{
                      console.log(`File ${fileName} already exists, overwritting.`)
                      Files.write(file, {
                        fileName: fileName,
                        userId: owner,
                        parent: path
                      });
                    }
                  })
                }
                else{
                  console.log(`File ${fileName} doesn't exist, uploading`)
                  Files.write(file, {
                    fileName: fileName,
                    userId: owner,
                    parent: path
                  });
                }
              }
              console.log("Processing file: " + fileName);
              return {jsonContent}
            });
            referenceContents = [];
            referenceFiles = Files.find({}).forEach(function(fileRef){
                replacePath = Files.link(fileRef);
                data = {
                  fileName: fileRef.name,
                  replacePath: replacePath,
                  parent: fileRef.name
                }
                referenceContents.push(data);
                Files.collection.update({_id: fileRef._id}, {$set: {meta: {link: replacePath}}});
            });
            for(let files of content.jsonContent){
                newContents = files.contents;
                for(let referenceFile of referenceContents){
                  toReplace = newContents;
                  theSplit = toReplace.split(referenceFile.fileName);
                  if(theSplit.length > 1){
                    newContents = theSplit.join(referenceFile.replacePath);
                  } 
                }
                // show the new contents
                newContents = JSON.parse(newContents);
                newContentsString = JSON.stringify(newContents);
                //chck if it is a module or an assessment
                if(newContentsString.includes("assessmentReportConstants")){
                    // it is a module
                    console.log("uploading module");
                    Meteor.call("uploadModule",path, owner, newContentsString);
                } else {
                    console.log("uploading assessment");
                    // it is an assessment
                    Meteor.call("uploadAssessment",path, owner, newContentsString);
                }
            }
          });
          assets = Files.find({}).fetch();
          return assets;
      },

    changeAssessment(input){
        assessmentId = input.assessmentId;
        field = input.field;
        result = input.result
        assessment = Assessments.findOne({_id: assessmentId});
        if(field == "reversedQuestions"){
            result = parseInt(result);
            index = assessment.reversedQuestions.indexOf(result);
            if(index > -1){
                assessment.reversedQuestions.splice(index,1);
            } else {
                assessment.reversedQuestions.push(result);
            }
            assessment.reversedQuestions.sort(function(a,b){return a - b});
        } else {
            text = "assessment." + field + "=" + result;
            eval(text);
        }
        Assessments.update(assessmentId, {$set: assessment});

    },
    exportModule: function(moduleId){
        //get module by moduleId and return it as a json string
        const fs = Npm.require('fs');
        const bound = Meteor.bindEnvironment((callback) => {callback();});
        var module = Modules.findOne({_id: moduleId});
        //export as json pretty print
        var json = JSON.stringify(module, null, 2);
        return json;
    },
    exportAssessment: function(assessmentId){
        //get module by moduleId and return it as a json string
        const fs = Npm.require('fs');
        const bound = Meteor.bindEnvironment((callback) => {callback();});
        var assessment = Assessments.findOne({_id: assessmentId});
        //export as json pretty print
        var json = JSON.stringify(assessment, null, 2);
        console.log(json);
        return json;
    },
    changeModule(input){
        moduleId = input.moduleId;
        field = input.field;
        result = input.result
        curModule = Modules.findOne({_id: moduleId});
        text = "curModule." + field + "=" + result;
        eval(text);
        Modules.update(moduleId, {$set: curModule});
    },
    deleteAssessmentItem(input){
        assessmentId = input.assessmentId;
        field = input.field;
        assessment = Assessments.findOne({_id: assessmentId})
        fieldParsed = field.split(".")
        item = fieldParsed[fieldParsed.length - 1].split("[");
        index = item[1].substring(0, item[1].length - 1);
        index = parseInt(index);
        if(fieldParsed.length == 1){
            items = eval("assessment." + item[0])
        } else {
            prefix = "";
            for(i = 0; i < fieldParsed.length - 1; i++){
                prefix+=fieldParsed[i] + ".";
            }
            items = eval("assessment." + prefix + item[0])
        }
        items.splice(index, 1);
        text = "assessment." + item[0] + "=items";
        eval(text);
        Assessments.update(assessmentId, {$set: assessment});
    },
    addAssessmentItem(input){
        assessmentId = input.assessmentId;
        field = input.field;
        assessment = Assessments.findOne({_id: assessmentId});
        text = "assessment." + field;
        newField = eval(text);
        if(typeof newField[0] === "object"){
            keys = Object.keys(newField[0]);
            newItem = {};
            for(i = 0; i < keys.length; i++){
                text = "newField[i]." + keys[i];
                key = eval(text);
                subField = eval('newField[i].' + keys[i] );
                if(typeof subField == 'string'){
                    text = 'newItem.' + keys[i] + '= \"New\"';
                    eval(text);
                }
                if(typeof subField == "object"){
                    text = 'newItem.' + keys[i] + '= []';
                    eval(text);
                }
            }
            newField.push(newItem)
        
        } else {
            newField.push('New');
        }
        Assessments.upsert(assessmentId, {$set: assessment});
    },
    deleteModuleItem(input){
        moduleId = input.moduleId;
        field = input.field;
        curModule = Modules.findOne({_id: moduleId})
        fieldParsed = field.split(".")
        item = fieldParsed[fieldParsed.length - 1].split("[");
        index = item[1].substring(0, item[1].length - 1);
        index = parseInt(index);
        if(fieldParsed.length == 1){
            items = eval("curModule." + item[0])
        } else {
            prefix = "";
            for(i = 0; i < fieldParsed.length - 1; i++){
                prefix+=fieldParsed[i] + ".";
            }
            items = eval("curModule." + prefix + item[0])
        }
        items.splice(index, 1);
        text = "curModule." + item[0] + "=items";
        eval(text);
        Modules.update(moduleId, {$set: curModule});
    },
    addModuleItem(input){
        moduleId = input.moduleId;
        field = input.field;
        curModule = Modules.findOne({_id: moduleId});
        text = "curModule." + field;
        newField = eval(text);
        if(typeof newField !== "undefined" && typeof newField[0] !== "undefined"){
            if(typeof newField[0] === "object"){
                keys = Object.keys(newField[0]);
                newItem = {};
                for(i = 0; i < keys.length; i++){
                    text = "newField[0]." + keys[i];
                    console.log(text);
                    eval(text);
                    console.log(keys[i], typeof key);
                    subField = eval('newField[0].' + keys[i] );
                    if(typeof subField == 'string'){
                        text = 'newItem.' + keys[i] + '= \"New\"';
                        eval(text);
                        console.log('evaltext',text)
                    }
                    if(typeof subField == "object"){
                        text = 'newItem.' + keys[i] + '= []';
                        eval(text);
                        console.log('evaltext',text)
                    }
                }
                newField.push(newItem)
            
            } 
        } else {
            addedField = field.split(".");
            addedField = addedField[addedField.length - 1];
            console.log('undefined: ' + addedField);          
            if(addedField == "questions"){
                data = {
                    type :"New",
                    prompt: "New"
                }
                text = "curModule." + field + "=[data]";
                console.log(text);
                eval(text);
            }
            if(addedField == "pages" || addedField == "fields"){
                data = {
                    type :"New",
                    text: "New"
                }
                text = "curModule." + field + "=[data]";
                console.log(text);
                eval(text);
            }
            if(addedField == "answers"){
                data = {
                    answer:"New",
                }
                text = "curModule." + field + "=[data]";
                console.log(text);
                eval(text);
            }
        }
        Modules.upsert(moduleId, {$set: curModule});
    },
    hasStartedJourney: function(userId){
        user = Meteor.users.findOne({_id: userId});
        if(user.journeyStarted){
            return true;
        } else {
            return false;
        }
    },
    startJourney: function(userId){
        Meteor.users.update(userId, {$set: {journeyStarted: true}});
    },
    //assessment data collection
    saveAssessmentData: function(newData){
        trialId = newData.trialId;
        assessmentId = newData.assessmentId
        assessmentName = newData.assessmentName
        userId = Meteor.userId();
        questionId = newData.questionId;
        oldResults = Trials.findOne({_id: trialId});
        let identifier;
        if(typeof oldResults === "undefined"){
            data = [];
            subscaleTotals = {};
            identifier = newData.identifier;
        } else {
            data = oldResults.data;
            subscaleTotals = oldResults.subscaleTotals;
            identifier = oldResults.identifier;
        }
        //convert screenshot URI to buffer
        if(newData.screenshot){
            let base64Data = newData.screenshot.replace(/^data:image\/png;base64,/, "");
            let binaryData = new Buffer.from(base64Data, 'base64').toString('binary');
            screenshot = binaryData;
            //save screenshot to file using Files collection
            Files.write(screenshot, {
                fileName: Meteor.userId() + '_' + assessmentName + '_' + questionId + '.png',
                type: 'image/png',
                meta: {
                    verificationCode: newData.verificationCode
                }
            } , function (error, fileObj) {
                if (error) {
                    console.log(error);
                } else {
                    screenshotId = fileObj._id;
                    console.log('screenshot saved to file collection');
                    newData.screenshot = Files.link(fileObj);
                }
            });
        }
        //get the current date and time 
        now = new Date().getTime();
        data[newData.questionId] = {
            response: newData.response,
            responseValue: newData.responseValue,
            subscales: newData.subscales,
            timestamp: now,
            screenshot: newData.screenshot
        }
        //sum the response values by subscale for data reporting
        if(!newData.subscales){
            //current assessment doesnt use subscales, just tally the totalls
            if(subscaleTotals['default']){
                subscaleTotals['default'] += newData.responseValue;
            }
            else{
                subscaleTotals['default'] = newData.responseValue;
            }
        }
        for(let subscale of newData.subscales){
            if(subscaleTotals[subscale]){
                subscaleTotals[subscale] += newData.responseValue;
            }
            else{
                subscaleTotals[subscale] = newData.responseValue;
            }
        }
        var output = Trials.upsert({_id: trialId}, {$set: {userId: userId, assessmentId: assessmentId, assessmentName: assessmentName, lastAccessed: new Date(), identifier: identifier, data: data, subscaleTotals: subscaleTotals, curQuestion: newData.questionId}});

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
    endAssessment: function(trialId) {
        let trial = Trials.findOne({'_id': trialId});3
        const adjustedScores = calculateScores(trial.identifier, trial.subscaleTotals, Meteor.user().sex)
        if(adjustedScores)
            Trials.upsert({_id: trialId}, {$set: {subscaleTotals: adjustedScores, completed: "true"}});
            
    },
    setCurrentAssignment(assignmentId){
        //set the users current assessment
        userId = Meteor.userId();
        Meteor.users.update(userId, {
            $set: {
                curAssignment: {
                    id: assignmentId
                }
            }
        });
    },
    clearAssessmentProgress: function (){
        userId = Meteor.userId();

        Meteor.users.update(userId, {
            $set: {
              curTrial: {
                  trialId: 0,
                  questionId: 0
              }
            }
          });
    },
    createModuleStorageforUser: function(moduleId){
        userId = Meteor.userId();
        Meteor.users.update(userId, {
            curModule: {
                moduleId: moduleId,
                pageId: 0,
                questionId: 0
            },

        });
    },
    createNewModuleTrial: function(data){
        const results = ModuleResults.insert(data);
            Meteor.users.update(Meteor.userId(), {
                $set: {
                curModule: {
                    moduleId: results,
                    pageId: 0,
                    questionId: 0,
                 }
                }
            });
        return results;
    },
    evaluateModule: function(curModuleId, moduleData){
        curModule = Modules.findOne({_id: curModuleId});
        moduleData.score = 0;
        moduleData.maxScore = 0;
        moduleData.passed = true;
        //get pages where the page type is a quiz
        pages = curModule.pages;
        for(let page of pages){
            if(page.type == "quiz"){
                //get the questions for the page
                questions = page.questions;
                for(let question of questions){
                    //add the max score
                    moduleData.maxScore++;
                    //get the question id
                    questionId = question.id;
                    //get the correct answer
                    correctAnswer = question.correctAnswer;
                    //get the user's answer
                    userAnswer = moduleData.responses[questionId];
                    //compare the two
                    if(correctAnswer == userAnswer){
                        //correct
                        moduleData.score++;
                    }
                }
            }
            //calculate the percentage
            moduleData.percentage = (moduleData.score / moduleData.maxScore) * 100;
            //set the user's curModule.passed to true or false based on the percentage
            //if the number is NaN, set it to true 
            if(isNaN(moduleData.percentage)){
                moduleData.passed = true;
                console.log("passed grade of", moduleData.percentage);
            } else {
                if(moduleData.percentage >= 70){
                    moduleData.passed = true;
                    console.log("passed grade of", moduleData.percentage);
                } else {
                    moduleData.passed = false;
                    console.log("failed grade of", moduleData.percentage);
                }
            }
            Meteor.users.update(Meteor.userId(), {
                $set: {
                    curModule: {
                        moduleId: curModuleId,
                        pageId: 0,
                        questionId: 0,
                        passed: moduleData.passed
                    },
                    lastModule: moduleData._id,
                    lastPass: moduleData.passed
                }
            });
            ModuleResults.upsert(moduleData);
        }

    },
    getModuleQuizScore: function(moduleId){
        //get ModuleResults for user with moduleId
        moduleData = ModuleResults.findOne({userId: Meteor.userId(), moduleId: moduleId});
        return moduleData.score;
    },
    saveModuleData: function (moduleData){
        //check if a screenshot was passed
        if(moduleData.screenshot){
            let base64Data = moduleData.screenshot.replace(/^data:image\/png;base64,/, "");
            let binaryData = new Buffer.from(base64Data, 'base64').toString('binary');
            moduleName = Modules.findOne({_id: moduleData.moduleId}).title;
            questionId = moduleData.questionId;
            pageId = moduleData.pageId;
            questionId = moduleData.questionId;
            screenshot = binaryData;
            //save screenshot to file using Files collection
            Files.write(screenshot, {
                fileName: Meteor.userId() + '_' + moduleName + '_' + questionId + '.png',
                type: 'image/png',
            } , function (error, fileObj) {
                if (error) {
                    console.log(error);
                } else {
                    screenshotId = fileObj._id;
                    console.log('screenshot saved to file collection');
                    //append the screenshot id to the most recent moduleData.responses
                    moduleData.responses[moduleData.responses.length - 1].screenshot = Files.link(fileObj);
                }
            });
        }
        ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
        // get the Module data
 
        nextModule = Meteor.user().nextModule;
        console.log("nextModule", nextModule, typeof nextModule);
        if(moduleData.nextPage == 'completed'){
            nextModule++;
            supervisor = Meteor.user().supervisor;
            console.log("sending message to supervisor", supervisor);
            sendSystemMessage(supervisor, moduleInfo.title + " has been completed by " + Meteor.user().firstname + " " + Meteor.user().lastname + ". Please review the results.", "Module Completed");
        }
        Meteor.users.upsert(Meteor.userId(), {
            $set: {
                curModule: {
                    moduleId: Meteor.user().curModule.moduleId,
                    pageId: moduleData.nextPage,
                    questionId: moduleData.nextQuestion,
                },
                nextModule: nextModule
            }
        })
    },

    updateGoals: function (goals){
        // get the current goals
        const currentGoals = Meteor.user().goals;
        // if there are no current goals, just set the goals
        if(!currentGoals){
            Meteor.users.update(Meteor.userId(), {
                $set: {
                    goals: [goals]
                }
            });
        } else {
            // if there are current goals, append the given array to goal array
            Meteor.users.update(Meteor.userId(), {
                $set: {
                    goals: currentGoals.concat(goals)
                }
            });
        }
    },
    deleteGoal: function (goalId){
        //delete goal by array index
        const currentGoals = Meteor.user().goals;
        currentGoals.splice(goalId, 1);
        Meteor.users.update(Meteor.userId(), {
            $set: {
                goals: currentGoals
            }
        });
    },
    addGoal: function (goal){
        //add goal to the end of the array
        const currentGoals = Meteor.user().goals;
        currentGoals.push(goal);
        Meteor.users.update(Meteor.userId(), {
            $set: {
                goals: currentGoals
            }
        });
    },
    
    userFinishedOrientation: function(){
        user = Meteor.user();
        console.log("userFinishedOrientation", user._id);
        //get assessment schedule
        assessmentSchedule = user.assessmentSchedule;
        assigned = user.assigned;
        //if assessment schedule is "preOrientation", set it to "intervention"
        assessmentSchedule = "intervention";
        Meteor.users.update(Meteor.userId(), {
            $set: {
                hasCompletedFirstAssessment: true,
                assessmentSchedule: assessmentSchedule,
            }
        });
    },
    changeUserSchedule: function(schedule, userId){
        Meteor.users.update({_id: userId}, {
            $set: {
                assessmentSchedule: schedule
            }
        });
        console.log("changeUserSchedule: ", userId, schedule);
        //console log the user's schedule
        console.log("user's schedule: ", Meteor.users.findOne({_id: userId}).assessmentSchedule);
    },
    userFinishedIntervention: function(){
        user = Meteor.user();
        console.log("userFinishedIntervention: ", user._id);
        //get assessment schedule
        assessmentSchedule = user.assessmentSchedule;
        assigned = user.assigned;
         //if assessment schedule is "intervention", set it to "postTreatment"
        
        assessmentSchedule = "postTreatment";
        //get user org
        org = Orgs.findOne({_id: user.organization});
        //get org's newUserAssessments
        newUserAssessments = org.newUserAssignments;
        //filter out the module type
        newUserAssessments = newUserAssessments.filter(function( obj ) {
            return obj.type !== "module";
        }
        );
        //replace assigned with newUserAssessments
        assigned = newUserAssessments;
    
        Meteor.users.update(Meteor.userId(), {
            $set: {
                hasCompletedFirstAssessment: true,
                assessmentSchedule: assessmentSchedule,
                assigned: assigned
            }
        });
    },
    userFinishedPostTreatment: function(){
        user = Meteor.user();
        console.log("userFinishedPostTreatment: ", user._id);
        //get assessment schedule
        assessmentSchedule = user.assessmentSchedule;
        assigned = user.assigned;
         //if assessment schedule is "intervention", set it to "postTreatment"
        
        assessmentSchedule = "finished";

        //replace assigned with newUserAssessments
        assigned = [];
    
        Meteor.users.update(Meteor.userId(), {
            $set: {
                hasCompletedFirstAssessment: true,
                assessmentSchedule: assessmentSchedule,
                assigned: assigned
            }
        });
    },
    getFirebaseConfig: function(){
        return firebaseConfig;
    },
    saveVerificationCode: function(code){
        console.log("saving verification code", code);
        //update the user's verification code
        Meteor.users.update(Meteor.userId(), {
            $set: {
                verificationCode: code
            }
        });
        //verify the change by comparing the code to the user's verification code
        if(Meteor.user().verificationCode){
            if(Meteor.user().verificationCode == code){
                console.log("verification code saved");
            } else {
                console.log("verification code not saved");
            }
        } else {
            console.log("verification code not saved");
        }
    },
    saveLoginScreenshot: function(screenshot, verficationCode){
        console.log("saving login screenshot with verification code", verficationCode);
        //convert screenshot URI to array buffer            
        const screenshotBuffer = new Buffer.from(screenshot.replace(/^data:image\/\w+;base64,/, ""),'base64');
        //save screenshot to file using Files collection
        user = Meteor.user();
        Files.write(screenshotBuffer, {
            fileName: user + "_" + verficationCode + '.png',
            type: 'image/png',
            meta: {
                verificationCode:  verficationCode  
            }
        } , function (error, fileObj) {
            if (error) {
                console.log(error);
            } else {
                screenshotId = fileObj._id;
                console.log('screenshot saved to file collection');
                        //get the screenshot's link
                screenshot = Files.link(fileObj);
                Meteor.users.update(user, {
                    $set: {
                        loginScreenshot: screenshot,
                        verificationCode: verficationCode
                    }
                });
            }
        });
    },
    generateApiToken: function(userId){
        var newToken = "";
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < 16; i++ ) {
            newToken += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        var future = new Date();
        future.setDate(future.getDate() + 30);
        Meteor.users.update(userId, {
            $set: {
              api: {
                  token: newToken,
                  expires: future
              }
            }
        });
    },
    calcOrgStats: function(){
        users = Meteor.users.find({organization: Meteor.user().organization}).fetch();
        subscales = [];
        subscaleList = [];
        data = {};
        data.userCount = users.length;
        data.assessmentCount = 0;
        data.moduleCount = 0;
        subscaleData = [];
        for(i = 0; i < users.length; i++){
            trials = Trials.find({"userId": users[i]._id}).fetch();
            for(j = 0; j < trials.length; j++){
                data.assessmentCount++;
                for(k = 0; k < Object.getOwnPropertyNames(trials[j].subscaleTotals).length; k++){
                    subscale = Object.getOwnPropertyNames(trials[j].subscaleTotals)[k];
                    subscaleIndex = subscaleList.indexOf(subscale);
                    if(subscaleIndex === -1){
                        subscaleList.push(subscale);
                        subscaleIndex = subscaleList.indexOf(subscale);
                        subscaleData[subscaleIndex] = {
                            name: subscale,
                            all: [trials[j].subscaleTotals[subscale]],
                            count: 1,
                            sum: trials[j].subscaleTotals[subscale],
                            avg:  trials[j].subscaleTotals[subscale],
                            median: trials[j].subscaleTotals[subscale],
                        };
                    } else {
                        subscaleData[subscaleIndex].all.push(trials[j].subscaleTotals[subscale]);
                        subscaleData[subscaleIndex].count++;
                        subscaleData[subscaleIndex].sum+= trials[j].subscaleTotals[subscale];
                        subscaleData[subscaleIndex].avg = subscaleData[subscaleIndex].sum / subscaleData[subscaleIndex].count;
                        const sorted = subscaleData[subscaleIndex].all.slice().sort((a, b) => a - b);
                        const middle = Math.floor(sorted.length / 2);
                        if (sorted.length % 2 === 0) {
                            median = (sorted[middle - 1] + sorted[middle]) / 2;
                        } else {
                            median = sorted[middle];
                        }
                        subscaleData[subscaleIndex].median = median;
                    }
           
                }
            }
        }
        data.subscaleData = subscaleData;
        Orgs.upsert({_id: Meteor.user().organization},{
            $set: {
                orgStats: data
            }
        })
    },
    createEvent: function(type, month, day, year, time, title, importance){
        //convert mm/dd/yyyy and time to unix timestamp
        var date = new Date(year, month, day, time);
        var unixDate = date.getTime();
        Events.insert({
            type: type,
            org: Meteor.user().organization,
            month: month,
            day: day,
            year: year,
            title: title,
            time: time,
            importance: importance,
            createdBy: this.userId,
            unixDate: unixDate,
            notified: false
        })
    },
    deleteEvent: function(eventId){
        Events.remove({_id: eventId})
    },
    newMessage: function(message, to, subject){
        dateReadable = new Date().toLocaleDateString();
        Chats.insert({
            message: message,
            from: Meteor.user()._id,
            fromName: Meteor.user().firstname + " " + Meteor.user().lastname,
            to: to,
            subject: subject,
            time: new Date(),
            dateReadable: dateReadable,
            status: "unread",
            notified: false
        });
        if(Meteor.settings.public.sendEmails){
            //get the user's email
            var toUser = Meteor.users.findOne({_id: to});
            var toEmail = toUser.emails[0].address;
            var fromUser = Meteor.users.findOne({_id: Meteor.userId()});
            var fromEmail = fromUser.emails[0].address;
            var fromName = fromUser.firstname + " " + fromUser.lastname;
            var subject = "New message from " + fromName;
            var message = "You have a new message from " + fromName + ". Log in to your account to view it.";
            var html = "<p>You have a new message from " + fromName + ". Log in to your account to view it.</p>";
            var text = "You have a new message from " + fromName + ". Log in to your account to view it.";
            var email = {
                to: toEmail,
                from: fromEmail,
                subject: subject,
                text: text,
                html: html
            };
            Emails.insert(email);
        }
    },
    updateMessageStatus: function(messageId, status){
        Chats.update({_id: messageId}, {$set: {status: status}})
    },
    addEntry: function(data){
        console.log("data", data);
        dateReadable = new Date().toISOString().slice(0, 10);
        dateArray = dateReadable.split("-");
        unixDate = new Date().getTime();
        data.year = parseInt(dateArray[0]);
        data.month = parseInt(dateArray[1]);
        data.day = parseInt(dateArray[2]);
        data.createdBy = this.userId;
        data.unixDate = unixDate;
        Journals.insert(data);
    },
    deleteEntry: function(entryId){
        Journals.remove({_id: entryId})
    },
    addFileToOrg: function(filePath, fileName,type){
        org = Orgs.findOne({_id: Meteor.user().organization});
        console.log("organization", org.orgName, "file", fileName);
        if(typeof org.files === "undefined"){
            org.files = [];
        }
        image = Files.findOne({})
        data = {
            filePath: filePath,
            name: fileName,
            type: type,
            dateUploaded: Date.now(),
            createdBy: Meteor.userId()
        }
        org.files.push(data);
        Orgs.update({_id: Meteor.user().organization}, {$set: {files: org.files} })
    },
    deleteFileFromOrg: function(fileName){
        Files.remove({name: fileName})
        org = Orgs.findOne({_id: Meteor.user().organization});
        orgFiles = org.files
        index = orgFiles.findIndex(x => x.name === fileName);
        orgFiles.splice(index, 1);
        Orgs.update({_id: Meteor.user().organization}, {$set: {files: orgFiles} })
    },
    deleteAllFilesFromOrg: function(){
        org = Orgs.findOne({_id: Meteor.user().organization});
        orgFiles = org.files
        for(i=0;i<orgFiles.length;i++){
            Files.remove({name: orgFiles[i].name})
        }
        Orgs.update({_id: Meteor.user().organization}, {$set: {files: []} })
    },
    makeGoogleTTSApiCall: async function(message, voice) {
        //get googleApiKey from Organization
        var org = Orgs.findOne({_id: Meteor.user().organization});
        console.log("organization", org);
        var ttsAPIKey = org.googleAPIKey;
        console.log("ttsAPIKey", ttsAPIKey);
        voiceOptions = {languageCode:"en-US", name:voice, ssmlGender:"FEMALE"};
        const request = JSON.stringify({
            input: {text: message},
            voice: voiceOptions,
            audioConfig: {audioEncoding: 'MP3', speakingRate: 1, volumeGainDb: .5},
        });
        const options = {
            hostname: 'texttospeech.googleapis.com',
            path: '/v1/text:synthesize?key=' + ttsAPIKey,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        }
        console.log("request", request);
        return await makeHTTPSrequest(options, request).then(data => {
            response = JSON.parse(data.toString('utf-8'))
            const audioDataEncoded = response.audioContent;
            return audioDataEncoded;
        });
    },
    setGoogleAPIKey: function(key){
        organization = Orgs.findOne({_id: Meteor.user().organization});
        organization.googleAPIKey = key;
        Orgs.update({_id: Meteor.user().organization}, {$set: {googleAPIKey: key}})
        //get org again
        organization = Orgs.findOne({_id: Meteor.user().organization});
        //print organization googleAPIKey
        console.log("organization.googleAPIKey", organization.googleAPIKey);
    },
    generateModuleCertificate: async function(moduleId,userId){
        console.log("generateModuleCertificate", moduleId, userId);
        //get module
        mod = Modules.findOne({_id: moduleId});
        title = mod.title;
        subtitle = mod.subtitle;
        //get user
        user = Meteor.users.findOne({_id: userId});
        console.log("user", user.id, user.supervisor);
        //get user's supervisor
        supervisor = Meteor.users.findOne({_id: user.supervisor});
        console.log("supervisor", supervisor._id);
        //get user's firstname and lastname, concatenate
        name = user.firstname + " " + user.lastname;
        //get user's supervisor's firstname and lastname, concatenate
        supervisorName = supervisor.firstname + " " + supervisor.lastname;
        //use canvas to open certificate template
        var canvas = new Canvas(2252, 1562);
        var ctx = canvas.getContext('2d');
        //load image from file
        var img = new Image;
        img.src = Assets.absoluteFilePath('module_completion.png');
        console.log("img", img.src);
        ctx.drawImage(img, 0, 0);
        //set font
        ctx.font = 'bold 30px Arial';
        //set text color
        ctx.fillStyle = '#000000';
        //set text alignment
        ctx.textAlign = 'center';
        //set text baseline
        ctx.textBaseline = 'middle';
        //write name
        ctx.fillText(name, 2252 / 2, 600 );
        //write supervisor name
        ctx.fillText(supervisorName, 788, 1079);
        //write module title
        ctx.fillText(title, 2252 / 2, 891);
        //write module subtitle
        ctx.fillText(subtitle, 2252 / 2, 950);
        //write date
        ctx.fillText(new Date().toISOString().slice(0, 10), 1424, 1079);
        //get image buffer
        var imageBuffer = canvas.toBuffer();
        //write buffer to filescollection
        Files.write(imageBuffer, {fileName: "module_completion.png", type: "image/png"}, function (error, fileObj) {
            if(error){
                console.log("error", error);
            }
            if(fileObj){
                //get file url
                var fileUrl = Files.link(fileObj);
                console.log("fileUrl", fileUrl);
                //add file to user's certificates
                if(!user.certificates){
                    user.certificates = [];
                }
                user.certificates.push({
                    title: title,
                    subtitle: subtitle,
                    date: new Date().toISOString().slice(0, 10),
                    file: fileUrl
                });
                Meteor.users.update({_id: userId}, {$set: {certificates: user.certificates}});
            }
        });
    },
    generateCompletionCertificate: async function(userId){
        console.log("generateCompletionCertificate",  userId);
        //get user
        user = Meteor.users.findOne({_id: userId});
        console.log("user", user.id, user.supervisor);
        //get user's organization
        org = Orgs.findOne({_id: user.organization});
        //get orgs owner
        owner = Meteor.users.findOne({_id: org.orgOwnerId});
        console.log("owner", owner._id);
        //get user's firstname and lastname, concatenate
        name = user.firstname + " " + user.lastname;
        //get user's supervisor's firstname and lastname, concatenate
        ownerName = owner.firstname + " " + owner.lastname;
        //use canvas to open certificate template
        var canvas = new Canvas(2224, 1570);
        var ctx = canvas.getContext('2d');
        //load image from file
        var img = new Image;
        img.src = Assets.absoluteFilePath('program_completion.png');
        console.log("img", img.src);
        ctx.drawImage(img, 0, 0);
        //set font
        ctx.font = 'bold 30px Arial';
        //set text color
        ctx.fillStyle = '#000000';
        //set text alignment
        ctx.textAlign = 'center';
        //set text baseline
        ctx.textBaseline = 'middle';
        //write name
        ctx.fillText(name, 2224 / 2, 580 );
        //write supervisor name
        ctx.fillText(ownerName, 716, 1270);
        //write date
        ctx.fillText(new Date().toISOString().slice(0, 10), 1493,1270);
        //get image buffer
        var imageBuffer = canvas.toBuffer();
        //write buffer to filescollection
        Files.write(imageBuffer, {fileName: "program_completion.png", type: "image/png"}, function (error, fileObj) {
            if(error){
                console.log("error", error);
            }
            if(fileObj){
                //get file url
                var fileUrl = Files.link(fileObj);
                console.log("fileUrl", fileUrl);
                //add file to user's certificates
                if(!user.certificates){
                    user.certificates = [];
                }
                user.certificates.push({
                    title: "Program Completion",
                    date: new Date().toISOString().slice(0, 10),
                    file: fileUrl
                });
                Meteor.users.update({_id: userId}, {$set: {certificates: user.certificates}});
            }
        });
    },
    swapPageOrder: function(moduleId, pageId, swapTo){
        moduleToChange = Modules.findOne({_id: moduleId});
        pageToMemory1 = moduleToChange.pages[pageId];
        pageToMemory2 = moduleToChange.pages[swapTo];
        moduleToChange.pages[swapTo] = pageToMemory1;
        moduleToChange.pages[pageId] = pageToMemory2;
        Modules.update({_id: moduleId},{$set: {pages: moduleToChange.pages}});
    },
    addExercise: function(data){
        data.time = new Date();
        data.month = new Date().getMonth();
        data.year = new Date().getFullYear();
        data.day = new Date().getDate();
        data.user = Meteor.userId();
        data.timeReadable = new Date().toISOString().slice(0, 10);
        Exercises.insert(data);
    },
    getAPKURL: function(){
        //open /ojidocs/apkurl.txt
        var fs = Npm.require('fs');
        var path = Npm.require('path');
        var filePath = '/ojidocs/apkurl.txt';
        file = fs.readFileSync(filePath, 'utf8');
        return file;
    },
    logError: function(error){
        console.log("Client Error:" + error);
    },
    setServerMessage: function(message){
        Settings.update({}, {$set: { publicMessage: message}});
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
    console.log("getInviteInfo", inviteCode);
    supervisor = Meteor.users.findOne({supervisorInviteCode: inviteCode});
    console.log("supervisor", supervisor);
    targetSupervisorId = supervisor._id;
    organization = Orgs.findOne({_id: supervisor.organization});
    targetSupervisorName = supervisor.firstname + " " + supervisor.lastname;
    targetOrgId = supervisor.organization;
    targetOrgName = organization.orgName;
    console.log(targetOrgId,targetOrgName,targetSupervisorId,targetSupervisorName);
    return {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName};
}

function sendSystemMessage(to, message, subject) {
    dateReadable = new Date().toLocaleDateString();
    Chats.insert({
        message: message,
        from: "system",
        fromName: "System Notification",
        to: to,
        subject: subject,
        time: new Date(),
        dateReadable: dateReadable,
        status: "unread"
    });
}
//Publications and Mongo Access Control
Meteor.users.deny({
    update() { return true; }
});

Meteor.users.allow({

});

//publish settings to everyone
Meteor.publish(null, function(){
    return Settings.find();
});

//Show current user data for current user
Meteor.publish(null, function() {
    return Meteor.users.find({_id: this.userId});
});

//Publish all user chats that include the current user
Meteor.publish(null, function() {
    return Chats.find({'to': this.userId});
} );

// Publish all of users exercises
Meteor.publish(null, function() {
    return Exercises.find({'user': this.userId});
})

//Publish current assessment information
Meteor.publish(null, function(id) {
    return Assessments.find({_id: id});
});

//allow admins to see all users of org, Can only see emails of users. Can See full data of supervisors
Meteor.publish(null, function() {
    if(Roles.userIsInRole(this.userId, 'admin' )){ 
        return Meteor.users.find({ organization: Meteor.user().organization});
    }
    else if(Roles.userIsInRole(this.userId, 'supervisor')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user', supervisor: this.userId})
    }
});

//Allow users access to Org information
Meteor.publish(null, function() {
    if(Meteor.user()){
        return Orgs.find({_id: Meteor.user().organization});
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
//allow assessments to be published
Meteor.publish(null, function () {
    return Assessments.find({});
});

//allow current users trial data to be published
Meteor.publish(null, function () {
    if(Roles.userIsInRole(this.userId, ['admin', 'supervisor']))
        return Trials.find();
    return Trials.find({'userId': this.userId});
});

//allow current module pages to be published
Meteor.publish(null, function (){
    return Modules.find({});
});
//get module results
Meteor.publish(null, function () {
    if(Roles.userIsInRole(this.userId, ['admin', 'supervisor']))
        return ModuleResults.find({});
    return ModuleResults.find({userId: Meteor.userId()});
});

Meteor.publish(null, function () {
    if(Roles.userIsInRole(this.userId, ['admin', 'supervisor']))
        return ModuleResults.find({});
    return
});
Meteor.publish(null, function () {
    if(Roles.userIsInRole(this.userId, ['admin', 'supervisor']))
        return ModuleResults.find({});
    return Trials.find({userId: Meteor.userId()});
});

//get my events
Meteor.publish(null, function() {
    return Events.find({createdBy: this.userId});
});
//get my events
Meteor.publish(null, function() {
    return Journals.find({createdBy: this.userId}, {sort: {unixDate: -1}});
});

//get all organization events
Meteor.publish(null, function() {
    if(Meteor.user()){
        return Events.find({$or: [{ $and: [{org: Meteor.user().organization},{createdBy: this.userId}]},{$and:[{createdBy: Meteor.user().supervisor},{type:"Supervisor Group"}]},{$and: [{org: Meteor.user().organization},{type: "All Organization"}]},{type:this.userId}]}, {sort: {year:1 , month:1, day:1, time:1}})
    }
});

async function makeHTTPSrequest(options, request){
    const https = require('https');
    return new Promise((resolve, reject) => {
        let chunks = []
        const req = https.request(options, res => {        
            res.on('data', d => {
                chunks.push(d);
            })
            res.on('end', function() {
                resolve(Buffer.concat(chunks));
            })
        })
        
        req.on('error', (e) => {
            reject(e.message);
        });
    
        req.write(request)
        req.end()
    });
}

function getAllDataFromUser(userId){
    //user data
    user = Meteor.users.findOne({_id: userId});
    console.log(user);
    //get all trials of user
    trials = Trials.find({userId: userId}).fetch();
    //get all module results of user
    moduleResults = ModuleResults.find({userId: userId}).fetch();
    //get all journal entries of user
    journals = Journals.find({createdBy: userId}).fetch();
    //return all data
    return {
        userId: userId,
        organization: user.organization,
        supervisor: user.supervisor,
        gender: user.gender,
        assessmentResults: trials,
        moduleResults: moduleResults,
        journals: journals,
        goals: user.goals
    }
}

function sendPushNotifications(){
    //get all chats where notified is false
    chats = Chats.find({notified: false}).fetch();
    //loop through chats, send push notification, and set notified to true
    chats.forEach(chat => {
        Meteor.call('userPushNotification',{
            title: "You have a new message from " + chat.fromName + "!",
            body: "Open your Oji app to view your messages.",
            userId: chat.to,
            badge: 1
        });
        Chats.update({_id: chat._id}, {$set: {notified: true}});
    });
    //get all events where notified is false, and the event is in the next hour
    events = Events.find({notified: false, unixDate: {$lt: new Date().getTime() + 3600000}}).fetch();
    //loop through events, send push notification, and set notified to true
    events.forEach(event => {
        Meteor.call('userPushNotification',{
            title: "You have an event coming up!",
            body: "The event " + event.title + " is soon at " + event.time + "!",
            userId: event.createdBy,
            badge: 1
        });
        Events.update({_id: event._id}, {$set: {notified: true}});
    });
}