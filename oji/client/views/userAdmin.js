Template.usersAdmin.helpers({
    'usersList': function() {
        if(Roles.userIsInRole(Meteor.userId(), 'admin')) {
            return Meteor.users.find({ role: 'user', organization: Meteor.user().organization}, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch();
        } else {
            return Meteor.users.find({ role: 'user', organization: Meteor.user().organization, supervisor: Meteor.userId()}, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch();
        }
    },
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
            curlExample: "curl " + window.location.protocol + "//" + window.location.host + "/api -H \"x-user-id:" + Meteor.user().username +"\" -H \"x-auth-token:" + keys.token + "\""
        }

        return api;
    },

    'showToken': true,

    'orgLink': () => window.location.protocol + "//" + window.location.host + "/signup/" + Meteor.user().supervisorInviteCode,

    'orgCode': () => Meteor.user().supervisorInviteCode,

    'classes':function(){
        return Classes.find().fetch();
    },

    'userSelected': function(){
        const t = Template.instance();
        userId = t.selectedUser.get();
        console.log("here")
        user = Meteor.users.findOne({_id: userId});
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
        console.log(data);
        for(i = 0; i < data.length; i++){
            data.first = false;
            data.last =  false;
            if(data[i].type == "module"){
                data[i] = Modules.findOne({_id: data[i].assignment});
            }
            if(data[i].type == "assessment"){
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
    const t = Template.instance();
    t.selectedUser.set(event.target.value);
    $('#user-select').val(t.selectedUser.get())
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
}
})

Template.usersAdmin.onCreated(function() {
Meteor.subscribe('getUsersInOrg');
Meteor.subscribe('getUserModuleResults');
Meteor.subscribe('modules');
Meteor.subscribe('assessments');
Meteor.subscribe('getClasses');
this.selectedUser = new ReactiveVar("false");
})