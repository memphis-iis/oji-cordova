Template.userAssessmentReport.helpers({
    'assessment': function() {
        let trial = Trials.findOne({'userId': Meteor.userId(), 'identifier': 'CCSM'});
        let assessment = Assessments.findOne({"identifier": "CCSM"});
        subscales = Object.keys(trial.subscaleTotals);
        console.log(Trials.findOne({'userId': Meteor.userId(), 'identifier': 'CCSM'}))
        let scales = [];
        for(let i = 0; i < subscales.length; i++){
            scales[i] = {
                'subscaleName': assessment.subscaleTitles[subscales[i]],
                'subscaleScore': trial.subscaleTotals[subscales[i]]
            }
        }
        console.log(scales)
        return scales;
    }
})

Template.userAssessmentReport.onCreated(function() {
    Meteor.subscribe('usertrials');
    Meteor.subscribe('assessments');
});