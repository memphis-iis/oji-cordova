Template.userAssessmentReportLanding.helpers({
    'trialsList': getAssessments,

    'currentUserIsAdmin': () => Roles.userIsInRole(Meteor.userId(), 'admin')
})

Template.userAssessmentReportLanding.events({
})

function getAssessments(){
    let trials = Trials.find({}, {sort: {assessmentName: 1, _id:-1}}).fetch();
    let uniqueTrials = [];
    let trialsRet = []
    for(let trial of trials){
        if(!uniqueTrials.includes(trial.identifier)){
            trial.lastAccessed = trial.lastAccessed.toUTCString();
            uniqueTrials.push(trial.identifier);
            trialsRet.push(trial)
        }
    }
    return trialsRet
}
Template.userAssessmentReportLanding.onCreated(function() {
    Meteor.subscribe('usertrials');
})