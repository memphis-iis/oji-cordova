import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles
import { calculateScores } from './subscaleCalculations.js';
import { Push } from 'meteor/activitree:push';
import { FilesCollection } from 'meteor/ostrio:files';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from 'fontkit';

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
const SEED_ROLES = ['user', 'supervisor', 'admin']

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
    importDefaultModules = false;
    importDefaultUsers = true;
    importDefaultAssessments = true;

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
            organization = Orgs.findOne({orgOwnerId: user._id});
            userlist = Meteor.users.find({organization: organization._id}, {
                fields: {
                    firstname: 0,
                    lastname: 0,
                    emails: 0,
                    username: 0,
                    role: 0,
                    supervisorInviteCode: 0,
                    services: 0,
                    organization: 0,
                    api: 0
                },
            }).fetch();
            userListResponse = []
            for(i = 0; i < userlist.length; i++){
                userTrials = Trials.find({userId: userlist[i]._id}).fetch();
                userModules = Modules.find({userId: userlist[i]._id}).fetch();
                curUser = userlist[i];
                curUser.trials = JSON.parse(JSON.stringify(userTrials));
                curUser.modules = JSON.parse(JSON.stringify(userModules));
                userListResponse.push(curUser);
            }
            organization.users = userListResponse;
            this.response.end(JSON.stringify(organization));
            }
        }
  });

    //load default JSON assessment into mongo collection
    if(Assessments.find().count() === 0 && importDefaultAssessments){
        console.log('Importing Default Assessments into Mongo.')
        var data = JSON.parse(Assets.getText('defaultAssessments.json'));
        for (var i =0; i < data['assessments'].length; i++){
            assessment = data['assessments'][i]['assessment'];
            assessment.owner = false;
            Assessments.insert(assessment);
        };
    }

    //load default JSON modules into mongo collection
    if(Modules.find().count() === 0 && importDefaultModules){
        console.log('Importing Default Modules into Mongo.')
        var data = JSON.parse(Assets.getText('defaultModules.json'));
        for (var i =0; i < data['modules'].length; i++){
            newModule = data['modules'][i]['module'];
            newModule.owner = false;
            Modules.insert(newModule);
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
                    const d = new Date();
                    let month = d.getMonth(); 
                    let day = d.getDate();
                    let year = d.getFullYear();
                    let title = "test event";
                    Events.insert({
                        type: "org",
                        org: newOrgId,
                        month: month,
                        day: day,
                        year: year,
                        title: title,
                        createdBy: uid
                    });
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
                            nextModule: 0,
                            author: true
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
    createNewUser: function(user, pass, emailAddr, firstName, lastName, sex, gender, linkId=""){
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
                            goals: []
                        }
                    });
                if(linkId != ""){
                    addUserToRoles(uid, 'user');
                    targetOrgOwner = Orgs.findOne({_id: targetOrgId}).orgOwnerId;
                    sendSystemMessage(targetOrgOwner, `${firstName} ${lastName} has joined ${targetOrgName}`, 'New User Added');
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
    destroyUser: function(userID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){
            Meteor.users.remove(userID);
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
        Meteor.users.upsert({_id: userId},{$set: {assigned: assignment}});
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
    uploadModule: function(path,user, data=false){
        if(data){
            console.log("uploading module from data");
            var newModule = JSON.parse(data);
            newModule.owner = user;
            newModule.orgOwnedBy = Meteor.users.findOne({_id: user}).organization;
            newModule.createdBy = user;
            delete newModule._id;
            Modules.insert(newModule);
        } else {
            const fs = Npm.require('fs');
            var newModule = JSON.parse(fs.readFileSync(path, 'utf8'));
            newModule.owner = user;
            newModule.orgOwnedBy = Meteor.users.findOne({_id: user}).organization;
            newModule.createdBy = user;
            delete newModule._id;
            Modules.insert(newModule);
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
                console.log("new contents: " + newContents);
                // show the new contents
                newContents = JSON.parse(newContents);
                newContentsString = JSON.stringify(newContents);
                Meteor.call("uploadModule",path, owner, newContentsString);
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
        data[newData.questionId] = {
            response: newData.response,
            responseValue: newData.responseValue,
            subscales: newData.subscales
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
            }
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
    createNewAssessmentTrial: function(data){
        Meteor.users.update(Meteor.userId(), {
            $set: {
                curTrial: {
                    trialId: data._id,
                    questionId: 0,
                    pageId: 0
                }
            }
        });
    return data._id;
    },

    saveModuleData: function (moduleData){
        ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
        nextModule = Meteor.user().nextModule;
        console.log("nextModule", nextModule, typeof nextModule);
        if(moduleData.nextPage == 'completed'){
            nextModule++;
            const supervisor = Meteor.users.findOne({'_id': Meteor.userId()}).supervisor;
            sendSystemMessage(supervisor, "The module " + moduleData.name + " has been completed by " + Meteor.user().firstname + " " + Meteor.user().lastname + ". Please review the results.", "Module Completed");
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
        Meteor.users.update(Meteor.userId(), {
            $set: {
                hasCompletedFirstAssessment: true
            }
        });
        sendSystemMessage(Meteor.userId(), "You have completed the orientation. You can now begin taking the first assessment.");
    },
    getAsset: function(fileName){
        result =  Assets.absoluteFilePath(fileName);
        return result;
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
        Events.insert({
            type: type,
            org: Meteor.user().organization,
            month: month,
            day: day,
            year: year,
            title: title,
            time: time,
            importance: importance,
            createdBy: this.userId
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
            status: "unread"
        })
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
        console.log("org", org.orgName, "file", fileName);
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
    generateCertificate: async function(moduleId=false){
        user = Meteor.user().firstName + " " + Meteor.user().lastName;
        let page = 0;
        let type = "completion";
        file = Assets.getBinary('certificates.pdf');
        const pdfDoc = await PDFDocument.load(file);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        let pages = await pdfDoc.getPages();
        const { width, height } = pages[0].getSize();
        let nameHeightOffset = 70;
        let dateAndSigY = 125;
        let dateOffsetX = 100;
        let sigOffsetX = -200;
        if(moduleId){
            page = 1;
            type = Modules.findOne({_id: moduleId}).title;
            nameHeightOffset = 0;
        }
        for(let i=0; i < pages.length; i++){
            if(i != page){
                pdfDoc.removePage(i)
            }
        }
        pages = pdfDoc.getPages();
        page = pages[0];
        let nameText = Meteor.user().firstname + " " + Meteor.user().lastname;
        let nameWidth = helveticaFont.widthOfTextAtSize(nameText, 30);
        let nameX = (width - nameWidth) / 2;
        let date = new Date(Date.now()).toLocaleString().split(",")[0];
        orgOwnerId = Orgs.findOne({_id: Meteor.user().organization}).orgOwnerId;
        orgOwner = Meteor.users.findOne({_id: orgOwnerId});
        orgOwnerName = orgOwner.firstname + " " + orgOwner.lastname;
        console.log(orgOwnerName, moduleId, type, nameText, nameX, nameHeightOffset, dateOffsetX, sigOffsetX);
        page.drawText(nameText,{
            x: nameX,
            y: height / 2 + nameHeightOffset,
            size: 30,
            font: helveticaFont,
            color: rgb(0,0,0)
        });
        page.drawText(date,{
            x: width / 2 + dateOffsetX,
            y: dateAndSigY,
            size: 15,
            font: helveticaFont,
            color: rgb(0,0,0)
        });

        page.drawText(orgOwnerName,{
            x: width / 2 + sigOffsetX,
            y: dateAndSigY,
            size: 15,
            font: helveticaFont,
            color: rgb(0,0,0)
        });
        const pdfSave = await pdfDoc.save();
        let fileName = Meteor.user().lastname + "_" + Meteor.user().firstname + "_" + type + ".pdf";
        supervisor = Meteor.user().supervisor;
        await Files.write(pdfSave, {
            fileName:  fileName,
            meta: {
                user: Meteor.userId(),
                moduleId: type,
                supervisor: supervisor
            }
        });
        Meteor.user().certificates.push({
            fileName: fileName,
            type: type,
            date: new Date()
        });
        sendSystemMessage(supervisor, "You have been issued a certificate for completing " + type + " for " + nameText + ".");
        sendSystemMessage(Meteor.userId(), "You have been issued a certificate for completing " + type + " for " + nameText + ".");
        return {pdfDoc: pdfSave, fileName: fileName};     
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
    organization = Orgs.findOne({_id: supervisor.organization});
    targetSupervisorName = supervisor.firstname + " " + supervisor.lastname;
    targetOrgId = supervisor.organization;
    targetOrgName = organization.orgName;
    console.log(targetOrgId,targetOrgName,targetSupervisorId,targetSupervisorName);
    return {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName};
}

function sendSystemMessage(userId, message, subject) {
    dateReadable = new Date().toLocaleDateString();
    Chats.insert({
        from: "00000000-0000-0000-0000-000000000000",
        fromName: "System",
        subject: subject,
        to: userId,
        message: message,
        date: Date.now(),
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

//Show current user data for current user
Meteor.publish(null, function() {
    return Meteor.users.find({_id: this.userId});
});

//Publish all user chats that include the current user
Meteor.publish('chats', function() {
    return Chats.find({'to': this.userId});
} );

// Publish all of users exercises
Meteor.publish('exercises', function() {
    return Exercises.find({'userId': this.userId});
})

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
Meteor.publish('assessments', function () {
    return Assessments.find({});
});

//allow current users trial data to be published
Meteor.publish('usertrials', function () {
    if(Roles.userIsInRole(this.userId, ['admin', 'supervisor']))
        return Trials.find();
    return Trials.find({'userId': this.userId});
});

//allow cur
//allow current module pages to be published
Meteor.publish('curModule', function (id) {
    return Modules.find({_id: id});
});
//allow all modules to be seen
Meteor.publish('modules', function () {
    return Modules.find({});
});
//get module results
Meteor.publish('getUserModuleResults', function (id) {
    return ModuleResults.find({});
});

Meteor.publish('getModuleResultsByTrialId', function (id) {
    return ModuleResults.find({_id: id});
});
Meteor.publish('getAssessmentsResultsByTrialId', function (id) {
    return Trials.find({_id: id});
});

//get my events
Meteor.publish(null, function() {
    return Events.find({createdBy: this.userId});
});
//get my events
Meteor.publish(null, function() {
    return Journals.find({createdBy: this.userId});
});

//get all organization events
Meteor.publish('events', function() {
    if(Meteor.user()){
        return Events.find({$or: [{ $and: [{org: Meteor.user().organization},{createdBy: this.userId}]},{$and:[{createdBy: Meteor.user().supervisor},{type:"Supervisor Group"}]},{$and: [{org: Meteor.user().organization},{type: "All Organization"}]},{type:this.userId}]}, {sort: {year:1 , month:1, day:1, time:1}})
    }
});