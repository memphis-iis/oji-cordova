Template.adminControlPanel.helpers({
    'supervisorsList': () => Session.get('supervisorsList').sort(function(a, b){
        if(a.lastname < b.lastname) { return -1; }
        if(a.lastname > b.lastname) { return 1; }
        return 0;
    })
})

Template.adminControlPanel.events({
    'click #supervisorsEditButton': function(){
        alert("edit click")
    },

    'click #supervisorsDestroyButton': function(event){
        Meteor.call('destroySupervisor', event.currentTarget.getAttribute("data-supervisorid"));
        updateSupervisorsList();
    }
})

Template.adminControlPanel.onCreated(function() {
    updateSupervisorsList();
})

function updateSupervisorsList(){
    Meteor.call('getSupervisors',  function(err, res){
        Session.set('supervisorsList', res)
    })
}