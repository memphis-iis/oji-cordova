Template.usersAdmin.helpers({
    'usersList': function() {
        if(Roles.userIsInRole(Meteor.userId(), 'admin')) {
            return Meteor.users.find({ organization: Meteor.user().organization}, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch();
        } else {
            return Meteor.users.find({ role: 'user', organization: Meteor.user().organization, supervisor: Meteor.userId()}, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch();
        }
    },
    'supervisorsList': () => Meteor.users.find({ role: 'supervisor' }, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch(),
    'orgViewOn': function(){
        const t = Template.instance();
        userId = t.selectedUser.get();
        if(userId == false){
            return true;
        } else {
            return false;
        }
    },
    'supervisorsList': () => Meteor.users.find({ role: 'supervisor' }, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch(),
    
    'organization': () => Orgs.findOne(),

    'apiKeys': function (){
        keys = Meteor.user().api;
        isExpired = false;
        now = new Date();
        expDate = keys.expires;
        expDate.setDate(expDate.getDate());
        if(now >= expDate || typeof keys.token === 'undefined'){
            isExpired = true;
        }
        api = {
            token: keys.token,
            expires: expDate,
            expired: isExpired,
            curlExample: "curl " + window.location.protocol + "//" + window.location.host + "/api -o output.json -H \"x-user-id:" + Meteor.user().username +"\" -H \"x-auth-token:" + keys.token + "\""
        }

        return api;
    },

    'showToken': true,

    'orgLink': () => window.location.protocol + "//" + window.location.host + "/signup/" + Meteor.user().supervisorInviteCode,

    'orgCode': () => Meteor.user().supervisorInviteCode,

    'classes':function(){
        return Classes.find().fetch();
    },  


    'userFirebaseToken': function(){
        const t = Template.instance();
        userId = t.selectedUser.get();
        if(userId == false){
            return false;
        } else {
            return Meteor.users.findOne({_id: userId}).token;
        }
    },
    'userSelected': function(){
        const t = Template.instance();
        userId = t.selectedUser.get();
        console.log("here")
        user = Meteor.users.findOne({_id: userId});
        if(user.assessmentSchedule == "preOrientation"){
            user.schedule = "Pre-Orientation";
        }
        if(user.assessmentSchedule == "intevention"){
            user.schedule = "Intervention / Treatment";
        }
        if(user.assessmentSchedule == "postTreatment"){
            user.schedule = "Post-Treatment";
        }
        classList = user.classList || [];
        newClassList = [];
        for(course of classList){
            classToShow = Classes.findOne({_id: course.classId});
            data = {
                classId: course.classId,
                name: classToShow.name,
            }
            newClassList.push(data);
        }
        console.log("classlist",newClassList);
        user.editedClassList = newClassList;
        if(userId == "false"){
            return false;
        } else {
            return user;
        }
    },

    'modules': function() {
        const t = Template.instance();
        userId = t.selectedUser.get();
        data = ModuleResults.find({userId: userId}).fetch();
        for(trial of data){
            console.log(trial, userId);
            if(trial.moduleId){
                moduleInfo = Modules.findOne({_id: trial.moduleId});
                if(moduleInfo){
                    completed = false;
                    if(trial.nextPage == "completed"){
                        completed = true;
                    }
                    console.log(trial);
                    dateAccessed = new Date(0);
                    dateAccessed.setUTCSeconds(parseInt(trial.lastAccessed));
                    trial.id = trial._id;
                    trial.title = moduleInfo.title;
                    trial.dateAccessed = dateAccessed;
                    trial.lastPage = trial.nextPage;
                    trial.completed = completed;
                    trial.totalPages = moduleInfo.pages.length;
                    trial.percentDone = (trial.nextPage / moduleInfo.pages.length * 100).toFixed(0);
                }
            }
        }
        return data;
},

    'modulesAvailable': function() {
        data = Modules.find().fetch();
        return data;
    },
    'assignments': function(){
        user = Meteor.users.findOne({_id: userId});
        data = user.assigned;
        console.log("Assignments:" ,data);
        for(i = 0; i < data.length; i++){
            console.log(data[i]);
            data[i].first = false;
            data[i].last =  false;
            if(data[i].type == "module"){
                console.log("Module");
                data[i] = Modules.findOne({_id: data[i].assignment});
            } else {
                console.log("Assessments");
                data[i] = Assessments.findOne({_id: data[i].assignment});
            }
            if(i == 0){
                data[i].first = true;
            }
            if(i == data.length - 1){
                data[i].last = true;
            }
        }
        return data;
    },
    'assessments': function() {
        console.log('test');
        const t = Template.instance();
        userId = t.selectedUser.get();
        data = Trials.find({userId: userId}).fetch();
        console.log(data.length);
        results = [];
        for(i = 0; i < data.length; i++){
            console.log("data", data[i])
            assessmentInfo = Assessments.findOne({_id: data[i].assessmentId})
            console.log(assessmentInfo);
            completed = false;
            if(data[i].completed == "true"){
                completed = true;
            }
            dataToPush = {
                id: data[i]._id,
                lastAccessed: data[i].lastAccessed,
                title: assessmentInfo.title,
                lastPage: data[i].curQuestion || 0,
                totalPages : assessmentInfo.questions.length,
                percentDone: (data[i].curQuestion / assessmentInfo.questions.length * 100).toFixed(0),
                completed: completed
            };
            results.push(dataToPush);
        }
        console.log(results);
        if(results.length == 0){
            results = false;
        }
        return results;   
    },
    'assessmentsAvailable': function() {
        data = Assessments.find().fetch();
        return data
    }
    
});


Template.usersAdmin.events({
'click #usersEditButton': function(){
    alert("edit click")
},
'click #supervisorsEditButton': function(){
    alert("edit click")
},

'click #supervisorsDestroyButton': function(event){
    event.preventDefault();
    if (window.confirm(`Are you sure you want to delete user ${event.currentTarget.getAttribute("data-lastname")}, ${event.currentTarget.getAttribute("data-firstname")}? This cannot be undone.`)){
        Meteor.call('destroyUser', event.currentTarget.getAttribute("data-supervisorid"));
    }
},

'click #supervisorDemoteButton': function(event){
    Meteor.call('removeSupervisor', event.currentTarget.getAttribute("data-supervisorID"));
}, 

'change #user-select': function(event){
    console.log("change");
    const t = Template.instance();
    t.selectedUser.set(event.target.value);
    $('#user-select').val(t.selectedUser.get())
    if(event.target.value == "None"){
        $('.hideOnUserSelect').each(function(){
            //hide
            $(this).show();
        });
    } else {
        $('.hideOnUserSelect').each(function(){
            //hide
            $(this).hide();
        });
    }
},
'click #assign-new': function(event){
    event.preventDefault();
    org = Orgs.findOne({_id: Meteor.user().organization});
    assignment = $(event.target).data("assessment-id");
    data = {
        type: "assessment",
        assignment: assignment
    }
    org.newUserAssignments.push(data);
    Meteor.call('changeAssignmentToNewUsers', org.newUserAssignments);
},
'click #assign-new-module': function(event){
    event.preventDefault();
    org = Orgs.findOne({_id: Meteor.user().organization});
    assignment = $(event.target).data("module-id");
    data = {
        type: "module",
        assignment: assignment
    }
    org.newUserAssignments.push(data);
    Meteor.call('changeAssignmentToNewUsers', org.newUserAssignments);
},
'click #unassign-new': function(event){
    event.preventDefault();
    org = Orgs.findOne({_id: Meteor.user().organization});
    assignment = $(event.target).data("assessment-id");
    index = org.newUserAssignments.findIndex(x => x.assignment === assignment);
    org.newUserAssignments.splice(index, 1);
    Meteor.call('changeAssignmentToNewUsers', org.newUserAssignments);
},
'click #unassign-new-module': function(event){
    event.preventDefault();
    org = Orgs.findOne({_id: Meteor.user().organization});
    assignment = $(event.target).data("module-id");
    index = org.newUserAssignments.findIndex(x => x.assignment === assignment);
    org.newUserAssignments.splice(index, 1);
    Meteor.call('changeAssignmentToNewUsers', org.newUserAssignments);
},
'click #assign-assessment': function(event){
    event.preventDefault();
    const t = Template.instance();
    userId = t.selectedUser.get();
    user = Meteor.users.findOne({_id: userId});
    newAssignmentId = $(event.target).data("assessment-id");
    assignment = {
        assignment:  newAssignmentId,
        type: "assessment"
    }
    user.assigned.push(assignment);
    Meteor.call('changeAssignmentOneUser', userId, user.assigned);
},
'click #assign-all': function(event){
    event.preventDefault();
    const assessmentId = $(event.target).data("assessment-id");
    const newAssignment = {assignment: assessmentId, type: "assessment"};
    Meteor.call('assignToAllUsers', newAssignment);
    assignment = Assessments.findOne({_id: assessmentId});
    $('#alert').show();
    $('#alert').removeClass();
    $('#alert').addClass("alert alert-success");
    $('#alert-p').html("Successfully assigned " + assignment.title + " to all users.");
},
'click #assign-all-module': function(event){
    event.preventDefault();
    const moduleId = $(event.target).data("module-id");
    const newModule = {assignment: moduleId, type: "module"};
    Meteor.call('assignToAllUsers', newModule);
    module = Modules.findOne({_id: moduleId});
    $('#alert').show();
    $('#alert').removeClass();
    $('#alert').addClass("alert alert-success");
    $('#alert-p').html("Successfully assigned " + module.title + " to all users.");

},
'click #close-alert': function(event){
    $('#alert').hide();

},
'click #close-files-alert': function(event){
    $('#alert-files').hide();

},
'click #close-mods-alert': function(event){
    $('#alert-mods').hide();

},
'click #copy-assessment': function (event){
    assessment = $(event.target).data("assessment-id");
    newOwner = Meteor.user().organization;
    Meteor.call('copyAssessment', {
        newOwner: newOwner,
        assessment: assessment
    });
},
'click #edit-assessment': function (event){
    assessment = $(event.target).data("assessment-id");
    Router.go('/assessmentEditor/' + assessment);
},
'click #delete-assessment': function (event){
    event.preventDefault();
    deletedAssessment = $(event.target).data("assessment-id");
    assessment = Assessments.findOne({_id: deletedAssessment});
    $('#alert').show();
    $('#alert').removeClass();
    $('#alert').addClass("alert alert-danger");
    $('#alert-p').html("This cannot be undone." + assessment.title + " will be permanently deleted. Did you make a backup?");
    $('#alert-confirm').attr('data-assessment-id', deletedAssessment);
    $('#alert-confirm').addClass("confirm-delete-assessment");
},
'click #copy-module': function (event){
    newModule = $(event.target).data("module-id");
    newOwner = Meteor.user().organization;
    Meteor.call('copyModule', {
        newOwner: newOwner,
        module: newModule
    });
},
'click #edit-module': function (event){
    moduleId = $(event.target).data("module-id");
    Router.go('/moduleEditor/' + moduleId);
},
'click #delete-module': function (event){
    event.preventDefault();
    deletedModule = $(event.target).data("module-id");
    moduleDeleted = Modules.findOne({_id: deletedModule});
    $('#alert-mods').show();
    $('#alert-mods').removeClass();
    $('#alert-mods').addClass("alert alert-danger");
    $('#alert-mods-p').html("This cannot be undone." + moduleDeleted.title + " will be permanently deleted. Did you make a backup?");
    $('#alert-mods-confirm').attr('data-module-id', deletedModule);
    $('#alert-mods-confirm').addClass("confirm-delete-module");
},
'click .confirm-delete-module': function (event){
    event.preventDefault();
    deletedModule = event.target.getAttribute('data-module-id');
    Meteor.call('deleteModule',deletedModule);
    $('#alert-mods-confirm').removeAttr('module-id');
    $('#alert-mods').hide();
},
'click .confirm-delete-assessment': function (event){
    event.preventDefault();
    deletedAssessment= event.target.getAttribute('data-assessment-id');
    Meteor.call('deleteAssessment',deletedAssessment);
    $('#alert-confirm').removeAttr('assessment-id');
    $('#alert').hide();
},
'click #add-module': function (event){
    Meteor.call('createModule');
},
'click #add-assessment': function (event){
    Meteor.call('createAssessment');
},
'change #fileInput'(e, template) {
    if (e.currentTarget.files && e.currentTarget.files[0]) {
        // We upload only one file, in case
        // multiple files were selected
        const upload = Files.insert({
          file: e.currentTarget.files[0],
          chunkSize: 'dynamic'
        }, false);
  
        upload.on('start', function () {
          template.currentUpload.set(this);
        });
  
        upload.on('end', function (error, fileObj) {
          if (error) {
            alert(`Error during upload: ${error}`);
          } else {
            alert(`File "${fileObj.name}" successfully uploaded`);
            link = Files.link(fileObj);
            fileName = fileObj.name;
            type = fileObj.type;
            Meteor.call('addFileToOrg',  link, fileName, type);
            if(fileObj.ext == "json"){
              Meteor.call('uploadModule',fileObj.path,Meteor.userId(),function(err,res){
                  if(err){
                      alert("package failed");
                  } else {
                      console.log(res);
                  }
              });
              if(fileObj.ext == "zip"){
                console.log('package detected')
                Meteor.call('processPackageUpload', fileObj.path, Meteor.userId(), function(err,res){
                  if(err){
                    alert("Package upload failed.\n"+err);
                  } else {
                    console.log(res);
                  }
                });
              }
          }
          }
          template.currentUpload.set(false);
        });
  
        upload.start();
    }
},
'click #delete-file': function (event){
    event.preventDefault();
    deletedFile = $(event.target).data("name");
    $('#alert-files').show();
    $('#alert-files').removeClass();
    $('#alert-files').addClass("alert alert-danger");
    $('#alert-files-p').html("This cannot be undone." + deletedFile + " will be permanently deleted. Did you make a backup?");
    $('#alert-files-confirm').attr('name', deletedFile);
    $('#alert-files-confirm').addClass("confirm-delete-file");
},
'click .confirm-delete-file': function (event){
    event.preventDefault();
    deletedFile = $(event.target).data("name");
    Meteor.call('deleteFileFromOrg', deletedFile);
    $('#alert-files-confirm').removeAttr('module-id');
    $('#alert-files').hide();
},
'click #moveup-assignment': function(event){
    org = Orgs.findOne({_id: Meteor.user().organization});
    index = $(event.target).data("index");
    assigned = org.newUserAssignments;
    a = assigned[index];
    b = assigned[index - 1];
    assigned[index] = b;
    assigned[index - 1] = a;
    Meteor.call('changeAssignmentToNewUsers', assigned);
},
'click #movedown-assignment': function(event){
    org = Orgs.findOne({_id: Meteor.user().organization});
    index = $(event.target).data("index");
    assigned = org.newUserAssignments;
    a = assigned[index];
    b = assigned[index + 1];
    assigned[index] = b;
    assigned[index + 1] = a;
    Meteor.call('changeAssignmentToNewUsers', assigned);
},
'click #transferSupervisorButton': function(event){
    event.preventDefault();
    t = Template.instance();
    userId = t.selectedUser.get();
    alert(userId);
    newSupervisorId = $('#transferTo').val();
    Meteor.call('transferUserToOtherSupervisor', userId, newSupervisorId);
    alert("User transferred");
},
'click #transferOrgButton': function(event){
    event.preventDefault();
    t = Template.instance();
    userId = t.selectedUser.get();
    orgCode = $('#transferToOrg').val();
    Meteor.call('transferUserToOtherOrg', userId, orgCode, function(err,res){
           
    });
},
'click #gen-key': function(event){
    Meteor.call('generateApiToken', Meteor.userId());
},
'click #regen-link': function(event){
    Meteor.call('generateInvite', Meteor.userId());
},
'click #usersDestroyButton': function(event){
    event.preventDefault();
    if (window.confirm(`Are you sure you want to delete user ${event.currentTarget.getAttribute("data-lastname")}, ${event.currentTarget.getAttribute("data-firstname")}? This cannot be undone.`)){
        Meteor.call('destroyUser', event.currentTarget.getAttribute("data-userid"));
    }
},

'click #userPromoteButton': function(event){
    Meteor.call('addSupervisor', event.currentTarget.getAttribute("data-userID"));
},

'click #gen-key': function(event){
    Meteor.call('generateApiToken', Meteor.userId());
},
'click #regen-link': function(event){
    Meteor.call('generateInvite', Meteor.userId());
},
'change #user-select': function(event){
    console.log("change2" + event.target.value);
    const t = Template.instance();
    t.selectedUser.set(event.target.value);
    $('#user-select').val(t.selectedUser.get())
    if(event.target.value == "false"){
        $('.hideOnUserSelect').each(function(){
            //hide
            $(this).show();
        });
    } else {
        $('.hideOnUserSelect').each(function(){
            //hide
            $(this).hide();
        });
    }
},
'click #unassign-assignment': function(event){
    event.preventDefault();
    const t = Template.instance();
    userId = t.selectedUser.get();
    user = Meteor.users.findOne({_id: userId});
    assignment = $(event.target).data("assessment-id");
    index = user.assigned.findIndex(x => x.assignmentId === assignment);
    user.assigned.splice(index, 1);
    Meteor.call('changeAssignmentOneUser', [userId, user.assigned]);
},
'click #assign-assessment': function(event){
    event.preventDefault();
    const t = Template.instance();
    userId = t.selectedUser.get();
    user = Meteor.users.findOne({_id: userId});
    newAssignmentId = $(event.target).data("assessment-id");
    assignment = {
        assignment:  newAssignmentId,
        type: "assessment"
    }
    user.assigned.push(assignment);
    Meteor.call('changeAssignmentOneUser', [userId, user.assigned]);
},
'click #supervisorsDestroyButton': function(event){
    event.preventDefault();
    if (window.confirm(`Are you sure you want to delete user ${event.currentTarget.getAttribute("data-lastname")}, ${event.currentTarget.getAttribute("data-firstname")}? This cannot be undone.`)){
        Meteor.call('destroyUser', event.currentTarget.getAttribute("data-supervisorid"));
    }
},

'click #supervisorDemoteButton': function(event){
    Meteor.call('removeSupervisor', event.currentTarget.getAttribute("data-supervisorID"));
}, 
'click #assign-module': function(event){
    event.preventDefault();
    const t = Template.instance();
    userId = t.selectedUser.get();
    user = Meteor.users.findOne({_id: userId});
    newAssignmentId = $(event.target).data("module-id");
    assignment = {
        assignment:  newAssignmentId,
        type: "module"
    }
    console.log(assignment);
    user.assigned.push(assignment);
    Meteor.call('changeAssignmentOneUser', userId, user.assigned);
},
'click #moveup-assignment': function(event){
    event.preventDefault();
    const t = Template.instance();
    userId = t.selectedUser.get();
    user = Meteor.users.findOne({_id: userId});
    index = $(event.target).data("index");
    assigned = user.assigned;
    a = assigned[index];
    b = assigned[index - 1];
    console.log(index,a,b);
    assigned[index] = b;
    assigned[index - 1] = a;
    user.assigned = assigned;
    Meteor.call('changeAssignmentOneUser', [userId, user.assigned]);
},
'click #movedown-assignment': function(event){
    event.preventDefault();
    const t = Template.instance();
    userId = t.selectedUser.get();
    user = Meteor.users.findOne({_id: userId});
    index = $(event.target).data("index");
    assigned = user.assigned;
    a = assigned[index];
    b = assigned[index  + 1];
    console.log(index,a,b);
    assigned[index] = b;
    assigned[index + 1] = a;
    user.assigned = assigned;
    Meteor.call('changeAssignmentOneUser', [userId, user.assigned]);
},
'click #unassign-assignment': function(event){
    event.preventDefault();
    const t = Template.instance();
    userId = t.selectedUser.get();
    user = Meteor.users.findOne({_id: userId});
    assignment = $(event.target).data("assessment-id");
    index = user.assigned.findIndex(x => x.assignmentId === assignment);
    user.assigned.splice(index, 1);
    Meteor.call('changeAssignmentOneUser', userId, user.assigned);
},
'click #assign-assessment': function(event){
    event.preventDefault();
    const t = Template.instance();
    userId = t.selectedUser.get();
    user = Meteor.users.findOne({_id: userId});
    newAssignmentId = $(event.target).data("assessment-id");
    assignment = {
        assignment:  newAssignmentId,
        type: "assessment"
    }
    user.assigned.push(assignment);
    Meteor.call('changeAssignmentOneUser', userId, user.assigned);
},
'click #transferSupervisorButton': function(event){
    event.preventDefault();
    userId = $('#user-select').val();
    newSupervisorId = $('#transferTo').val();
    Meteor.call('transferUserToOtherSupervisor', userId, newSupervisorId);
    alert("User transferred");
},
'click #transferOrgButton': function(event){
    event.preventDefault();
    userId = $('#user-select').val();
    orgCode = $('#transferToOrg').val();
    Meteor.call('transferUserToOtherOrg', userId, orgCode, function(err,res){
           
    });
},
'click #resetJourneyButton': function(event){
    event.preventDefault();
    userId = $('#user-select').val();
    Meteor.call('resetUserJourney', userId);
    alert("User journey reset");

},
'click #awardCertificateButton': function(event){
    event.preventDefault();
    userId = $('#user-select').val();
    Meteor.call('generateCompletionCertificate', userId);
    alert("Certificate awarded");
},
});

Template.usersAdmin.onCreated(function() {
Meteor.subscribe('getUsersInOrg');
Meteor.subscribe('getUserModuleResults');
Meteor.subscribe('modules');
Meteor.subscribe('assessments');
Meteor.subscribe('getClasses');
this.selectedUser = new ReactiveVar("false");
})