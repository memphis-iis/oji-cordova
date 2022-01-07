Template.assessmentCenter.helpers({
    'assessment': () => Assessments.find({}),
})

Template.assessmentCenter.events({
    'click #startAssessment': function(){
        alert("edit click")
    },
})

Template.assessmentCenter.onCreated(function() {
    Meteor.subscribe('assessments');
})