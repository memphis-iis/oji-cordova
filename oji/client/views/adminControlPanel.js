Template.adminControlPanel.helpers({
    'supervisorsList': () => Meteor.users.find({ role: 'supervisor' }, { sort: {lastname: -1}}).fetch(),

    'userList': () => Meteor.users.find({ role: 'user' }).fetch().map(x => x.emails[0].address),
})

Template.adminControlPanel.events({
    'click #supervisorsEditButton': function(){
        alert("edit click")
    },

    'click #supervisorsDestroyButton': function(event){
        event.preventDefault();
        if (window.confirm(`Are you sure you want to delete user ${event.currentTarget.getAttribute("data-lastname")}, ${event.currentTarget.getAttribute("data-firstname")}? This cannot be undone.`)){
            Meteor.call('destroySupervisor', event.currentTarget.getAttribute("data-supervisorid"));
        }
    },

    'click #addSupervisorSubmit': function(event){
        Meteor.call('elevateUser', $('#adminControlPanelSupervisorDropdown :selected').text());
    }, 

    'click #removeSupervisorButton': function(event){
        $('#removeSupervisorConfirmButton').show();
        for(let box of $('.supervisorListTableCheckbox')){
            box.removeAttribute("hidden")
        }
    },

    'click #removeSupervisorConfirmButton': function(event){
        $('#removeSupervisorConfirmButton').hide();
        let usersToRemove = [];
        for(let box of $('.supervisorListTableCheckbox')){
            if(box.checked){
                usersToRemove.push(box.getAttribute("data-supervisorID"))
            }
            box.setAttribute("hidden", "");
        }
        for(let user of usersToRemove){
            Meteor.call('removeSupervisor', user);
        }
    }
})

Template.adminControlPanel.onCreated(function() {
    Meteor.subscribe('getUsersInOrg');
    Meteor.subscribe('getSupervisorsInOrg');
})