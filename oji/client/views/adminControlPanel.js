Template.adminControlPanel.helpers({
    'supervisorsList': () => Meteor.users.find({ role: 'supervisor' }, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch(),

    'orgLink': () => window.location.protocol + "//" + window.location.host + "/signup/" + Meteor.user().supervisorInviteCode,

    'organization': () => Orgs.findOne(),
    
    'api': function (){
        api = {
            token: 0,
            expires: 0
        };
        return api;
      },
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
})

Template.adminControlPanel.onCreated(function() {
    Meteor.subscribe('getUsersInOrg');
    Meteor.subscribe('getSupervisorsInOrg');
})