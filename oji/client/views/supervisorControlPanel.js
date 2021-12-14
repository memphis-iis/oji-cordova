Template.supervisorControlPanel.helpers({
    'usersList': () => Meteor.users.find({ role: 'user' }, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch(),

    'currentUserIsAdmin': () => Roles.userIsInRole(Meteor.userId(), 'admin')
})

Template.supervisorControlPanel.events({
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
    }
})

Template.supervisorControlPanel.onCreated(function() {
    Meteor.subscribe('getUsersInOrg');
})