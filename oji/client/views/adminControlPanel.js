Template.adminControlPanel.helpers({
    'supervisorsList': () => Meteor.users.find({ role: 'supervisor' }, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch(),

    'userInfo': () => Meteor.users.find({role: 'user'}),

    'orgLink': () => window.location.protocol + "//" + window.location.host + "/signup/" + Meteor.user().supervisorInviteCode,
  
    'assessments': function (){
      const t = Template.instance();
      userId = t.selectedUser.get();
      data = Assessments.find().fetch();
      org = Orgs.findOne({_id: Meteor.user().organization});
      if(userId == "org"){
        for(i = 0; i < data.length; i++){
            data[i].orgView = true;
            if(org.newUserAssignments.includes(data[i]._id)){
                data[i].status = "Assigned to new users.";
                data[i].newUserRequired = true;
            } else {
                data[i].status = ""; 
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
    
    'organization': () => Orgs.findOne(),
    
    'apiKeys': function (){
        keys = Meteor.user().api;
        isExpired = false;
        now = new Date();
        expDate = keys.expires;
        expDate.setDate(expDate.getDate());
        console.log('date', now, expDate, keys.expires);
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

Template.adminControlPanel.events({
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
    'click #regen-link': function(event){
        Meteor.call('generateInvite', Meteor.userId());
    },
    'change #user-select': function(event){
        const t = Template.instance();
        t.selectedUser.set(event.target.value);
    },
    'click #assign-new': function(event){
        event.preventDefault();
        org = Orgs.findOne({_id: Meteor.user().organization});
        assignment = $(event.target).data("assessment-id");
        org.newUserAssignments.push(assignment);
        Meteor.call('changeAssignmentToNewUsers', org.newUserAssignments);
    },
    'click #unassign-new': function(event){
        event.preventDefault();
        org = Orgs.findOne({_id: Meteor.user().organization});
        assignment = $(event.target).data("assessment-id");
        index = org.newUserAssignments.indexOf(assignment);
        org.newUserAssignments.splice(index, 1);
        Meteor.call('changeAssignmentToNewUsers', org.newUserAssignments);
    },
    'click #assign-all': function(event){
        event.preventDefault();
        newAssignment = $(event.target).data("assessment-id");
        Meteor.call('assignToAllUsers', newAssignment);
        assignment = Assessments.findOne({_id: newAssignment});
        console.log('assessment', assignment);
        $('#alert').show();
        $('#alert').addClass("alert-success");
        $('#alert-p').html("Successfully assigned " + assignment.title + " to all users.");

    },
    'click #close-alert': function(event){
        $('#alert').hide();
    },
    'click #unassign-one': function(event){
        event.preventDefault();
        const t = Template.instance();
        userId = t.selectedUser.get();
        user = Meteor.users.findOne({_id: userId});
        assignment = $(event.target).data("assessment-id");
        index = user.assigned.indexOf(assignment);
        user.assigned.splice(index, 1);
        Meteor.call('changeAssignmentOneUser', [userId, user.assigned]);
    },
    'click #assign-one': function(event){
        event.preventDefault();
        const t = Template.instance();
        userId = t.selectedUser.get();
        user = Meteor.users.findOne({_id: userId});
        assignment = $(event.target).data("assessment-id");
        user.assigned.push(assignment)
        Meteor.call('changeAssignmentOneUser', [userId, user.assigned]);
    }
    'click #gen-key': function(event){
        Meteor.call('generateApiToken', Meteor.userId());
    },
})

Template.adminControlPanel.onCreated(function() {
    Meteor.subscribe('getUsersInOrg');
    Meteor.subscribe('getSupervisorsInOrg');
    Meteor.subscribe('assessments');
    this.selectedUser = new ReactiveVar("org");
})
Template.adminControlPanel.onCreated(function(){
    this.selectedUser = new ReactiveVar("org");
})
