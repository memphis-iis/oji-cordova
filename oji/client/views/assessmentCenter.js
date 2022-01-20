Template.assessmentCenter.helpers({
    'assessment': getUsersAssignedAssessments
})

Template.assessmentCenter.events({
    'click .startAssessment': function(event){
        event.preventDefault();
        target = "/assessment/" + event.target.id;
        window.location.href = target;
    },
})

Template.assessmentCenter.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('usertrials');
})

function getUsersAssignedAssessments(){
    if(Roles.userIsInRole(Meteor.userId(), ['supervisor', 'admin']) || Meteor.user().hasCompletedFirstAssessment){
        return Assessments.find({})
    }
    else{
        return Assessments.find({identifier: "DSM_5"})
    }
}