Template.userAssessmentReport.helpers({
    'assessment': function() {
        Trials.findOne({'userId': Meteor.userId(), 'identifier': 'PICTS'}).subscaleTotals.MOLL;
    },
})

Template.userAssessmentReport.onCreated(function() {
    Meteor.subscribe('usertrials');
});