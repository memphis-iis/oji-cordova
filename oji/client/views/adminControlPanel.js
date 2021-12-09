Template.adminControlPanel.helpers({
    'supervisorsList': () => Session.get('supervisorsList').sort(function(a, b){
        if(a.lastname < b.lastname) { return -1; }
        if(a.lastname > b.lastname) { return 1; }
        return 0;
    })
})

Template.adminControlPanel.events({
    'click #supervisorsEditButton': () => alert("edit click"),

    'click #supervisorsDestroyButton': () => alert("Destroy click")
})

Template.adminControlPanel.onCreated(function() {
    Meteor.call('getSupervisors',  function(err, res){
        Session.set('supervisorsList', res)
    })
})