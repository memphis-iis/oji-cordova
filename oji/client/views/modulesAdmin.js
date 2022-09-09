import { Template }    from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FilesCollection } from 'meteor/ostrio:files';

Template.modulesAdmin.helpers({
    'supervisorsList': () => Meteor.users.find({ role: 'supervisor' }, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch(),

    'userInfo': () => Meteor.users.find({role: 'user'}),

    currentUpload() {
        return Template.instance().currentUpload.get();
    },
    'assignments': function(){
        data =  Orgs.findOne({_id: Meteor.user().organization}).newUserAssignments;
        console.log(data);
        for(i = 0; i < data.length; i++){
            data.first = false;
            data.last =  false;
            if(data[i].type == "assessment"){
                data[i] = Assessments.findOne({_id: data[i].assignment});
            }
            if(data[i].type == "module"){
                data[i] = Modules.findOne({_id: data[i].assignment});
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
    'files':  function(){
        files = Orgs.findOne({_id: Meteor.user().organization}).files;
        if(files){
            for(i = 0; i < files.length; i++){
                files[i].isImage = false;
                if(files[i].type.includes("image")){
                    files[i].isImage = true;
                }
            }
            return files;
        }
        return false;
    },
    'assessments': function (){
        const t = Template.instance();
        userId = t.selectedUser.get();
        data = Assessments.find().fetch();
        org = Orgs.findOne({_id: Meteor.user().organization});
        if(userId == "org"){
          for(i = 0; i < data.length; i++){
              data[i].status = "";
              data[i].orgView = true;
              if(org.newUserAssignments.findIndex(x => x.assignment === data[i]._id) > -1){
                  data[i].status += "Assigned to new users. ";
                  data[i].newUserRequired = true;
              } 
              if(data[i].owner == org._id){
                  data[i].status += "Created by your organization."
                  data[i].owned = true;
              }
              if(data[i].createdBy == Meteor.user()._id){
                    data[i].status += "Created by you."
                    data[i].owned = true;
              }
              if(data[i].owner == false){
                  data[i].status += "Uploaded by App Administrator."
              }
          }
        } else {
          user = Meteor.users.findOne({_id: userId});
          for(i = 0; i < data.length; i++){
              data[i].orgView = false;
              if(user.assigned.includes(data[i]._id)){
                  data[i].assigned = true;
                  data[i].status = "Assigned and not completed.";
              } else {
               
                  data[i].status = "Not assigned.";
                  data[i].assigned = false;
              }
          }
          } 
          return data;
      },
    'module': function(){
        data = Modules.find().fetch();
        org = Orgs.findOne({_id: Meteor.user().organization});     
        for(i = 0; i < data.length; i++){
            data[i].status = "";
            data[i].orgView = true;
            if(org.newUserAssignments&& org.newUserAssignments.findIndex(x => x.assignment === data[i]._id) > -1){
                data[i].status += "Assigned to new users. ";
                data[i].newUserRequired = true;
            } 
            if(data[i].orgOwnedBy == org._id){
                data[i].status += "Owned by your organization. "
                data[i].owned = false;
            }
            if(data[i].owner == Meteor.userId()){
                data[i].status += "Created by you. ";
                data[i].owned = true;
            }
            if(data[i].public == false && data[i].owner != Meteor.userId() ){
                data.slice(i,1);
            }
            if(data[i].public == true){
                data[i].status += "Publically available. "
            }
            if(data[i].owner == false){
                data[i].status += "Uploaded by App Administrator. "
                data[i].owned = false;
            }
        }
          return data;
    },

    'author': function(){
        return Meteor.user().author;
    } ,

    'orgLink': () => window.location.protocol + "//" + window.location.host + "/signup/" + Meteor.user().supervisorInviteCode,

    'orgCode': () => Meteor.user().supervisorInviteCode,


    'organization': () => Orgs.findOne(),
    
    'apiKeys': function (){
        keys = Meteor.user().api;
        isExpired = false;
        now = new Date();
        expDate = keys.expires;
        expDate.setDate(expDate.getDate());
        if(now >= expDate){
            isExpired = true;
        }
        api = {
            token: keys.token,
            expires: expDate,
            expired: isExpired,
            curlExample: "curl " + window.location.protocol + "//" + window.location.host + "/api -H \"x-user-id:" + Meteor.user().username +"\" -H \"x-auth-token:" + keys.token + "\""
        }

        return api;
      },
    'showToken': true,
})

Template.modulesAdmin.events({
    'click #supervisorsEditButton': function(){
        alert("edit click")
    },

    'click #test-module': function (event){
        testModule = $(event.target).data("module-id");
        Meteor.call('createModuleStorageforUser',testModule);
        target = "/module/" + testModule;
        window.location.href = target;
    },
    'click #test-assessment': function (event){
        testModule = $(event.target).data("module-id");
        target = "/assessment/" + testModule;
        window.location.href = target;
    },
    'click #supervisorsDestroyButton': function(event){
        event.preventDefault();
        if (window.confirm(`Are you sure you want to delete user ${event.currentTarget.getAttribute("data-lastname")}, ${event.currentTarget.getAttribute("data-firstname")}? This cannot be undone.`)){
            Meteor.call('destroyUser', event.currentTarget.getAttribute("data-supervisorid"));
        }
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
        const t = Template.instance();
        t.selectedUser.set(event.target.value);
        $('#user-select').val(t.selectedUser.get())
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
        userId = $('#transferUser').val();
        newSupervisorId = $('#transferTo').val();
        Meteor.call('transferUserToOtherSupervisor', userId, newSupervisorId);
        alert("User transferred");
    },
    'click #transferOrgButton': function(event){
        event.preventDefault();
        userId = $('#transferUser').val();
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
    'click #supervisorDemoteButton': function(event){
        Meteor.call('removeSupervisor', event.currentTarget.getAttribute("data-supervisorID"));
    }, 

    'change #user-select': function(event){
        const t = Template.instance();
        t.selectedUser.set(event.target.value);
        $('#user-select').val(t.selectedUser.get())
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
    'click #close-alert': function(event){
        $('#alert').hide();

    },
    'click #close-files-alert': function(event){
        $('#alert-files').hide();

    },
    'click #close-mods-alert': function(event){
        $('#alert-mods').hide();

    },
    'click #copy-module': function (event){
        newModule = $(event.target).data("module-id");
        newOwner = Meteor.user().organization;
        Meteor.call('copyModule', {
            newOwner: newOwner,
            module: newModule
        });
    },
    'click #test-module': function (event){
        testModule = $(event.target).data("module-id");
        target = "/module/" + testModule;
        window.location.href = target;
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
    'click .confirm-delete-assessment': function (event){
        event.preventDefault();
        deletedAssessment= event.target.getAttribute('data-assessment-id');
        Meteor.call('deleteAssessment',deletedAssessment);
        $('#alert-confirm').removeAttr('assessment-id');
        $('#alert').hde();
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
})

Template.modulesAdmin.onCreated(function() {
    Meteor.subscribe('getUsersInOrg');
    Meteor.subscribe('getSupervisorsInOrg');
    Meteor.subscribe('getUserModuleResults');
    Meteor.subscribe('modules');
    Meteor.subscribe('assessments');
    this.selectedUser = new ReactiveVar("org");
    this.currentUpload = new ReactiveVar(false);
})