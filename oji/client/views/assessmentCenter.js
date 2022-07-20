Template.assessmentCenter.helpers({
    'assessment': getAssessments
})

Template.assessmentCenter.events({
    'click .startAssessment': function(event){
        event.preventDefault();
        target = "/assessment/" + event.currentTarget.id;
        Meteor.call('setCurrentAssignment', {id: event.currentTarget.id, type: "assessment"}, function(err, res){
            if(err){
                console.log(err);
            } else {
                Router.go(target);
            }
        });
    },
})

Template.assessmentCenter.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('usertrials');
})

function getAssessments(){
    return Assessments.find({})
}