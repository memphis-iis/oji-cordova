Template.assessmentCenter.helpers({
    'assessment': () => Assessments.find({}),
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