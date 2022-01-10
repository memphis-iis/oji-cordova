Template.assessmentCenter.helpers({
    'assessment': getUsersAssignedAssessments
})

Template.assessmentCenter.events({
    'click #startAssessment': function(){
        alert("edit click")
    },
})

Template.assessmentCenter.onCreated(function() {
    Meteor.subscribe('assessments');
})

function getUsersAssignedAssessments(){
    if(Roles.userIsInRole(Meteor.userId(), ['supervisor', 'admin']) || Meteor.user().hasCompletedFirstAssessment){
        return Assessments.find({})
    }
    else{
        return Assessments.find({identifier: "DSM_5"})
    }
}