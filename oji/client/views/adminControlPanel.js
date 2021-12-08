Template.adminControlPanel.helpers({
    'supervisorsList': () => Session.get('supervisorsList').map(supervisor => supervisor.firstname + " " + supervisor.lastname)
})

Template.adminControlPanel.events({

})

Template.adminControlPanel.onCreated(function() {
    Meteor.call('getSupervisors',  function(err, res){
        Session.set('supervisorsList', res)
    })
})