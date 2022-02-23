Template.profile.helpers({
    'assignment': function(){
        assigned = Meteor.user().assigned;
        if(assigned.length == 0){
            assignment = false;
        } else {
            assignment = Assessments.findOne({_id: assigned[0]});
        }
        return assignment;
    },
    'userIsAdminOrSupervisor': () => Roles.userIsInRole(Meteor.userId(), ['admin', 'supervisor']),
})

Template.profile.events({
    'click #startAssessment': function(){
        assignment = $(event.target).data("assessment-id");
        target = "/assessment/" + assignment
        Router.go(target);
    },
    'click #assessmentCenter': function(){
        target = "/assessmentCenter/";
        Router.go(target);
    },
    'click #moduleCenter': function(){
        target = "/moduleCenter/";
        Router.go(target);
    },
    'click #controlPanel': function(){
        target = "/control-panel/";
        Router.go(target);
    },
    'click #calendar': function(){
        target = "/calendar/";
        Router.go(target);
    },
    'click #logout': function(){
        Meteor.logout();
        Router.go("/");
    },
})


Template.profile.onCreated(function() {
    Meteor.subscribe('assessments');
})