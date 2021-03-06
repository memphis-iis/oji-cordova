Template.assessment.helpers({
    'assessment': () => Assessments.findOne({_id: Meteor.user().curAssignment.id}),
    'isNotQuestion': () => this.isNotQuestion,
    'questionid': function() {return parseInt(this.questionid) + 1;},
    'completed' : function() {
        assessment = Assessments.findOne({_id: Meteor.user().curAssignment.id});
        if(this.questionid == "completed"){
            Meteor.call('clearAssessmentProgress');
            userId = Meteor.userId();
            user = Meteor.user();
            index = user.assigned.findIndex(x => x.assignmentId === assessment._id);
            if(index != -1){
                user.assigned.splice(index, 1);
            }
            user.assigned.splice(index, 1);
            Meteor.call('changeAssignmentOneUser', userId, user.assigned);
            return true;
        } else {
            return false;
        }
    },
    'isNewUserAssignment': function(){
        if(Meteor.user().curAssignment?.newUserAssignment) {
            let newUserAssignments = Orgs.findOne().newUserAssignments;
            const curAssignment = Meteor.user().curAssignment;
            const curAssignmentIndex = newUserAssignments.map(i => i.assignment).findIndex((element) => element == curAssignment.id)
            if(curAssignmentIndex >= newUserAssignments.length - 1){
                Meteor.call('userFinishedOrientation');
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    },
    'resumeableTrial': function() {
        user = Meteor.user();
        if(!user.curTrial.trialId){
            return false;
        } else {
            oldTrial = Trials.findOne({'_id': user.curTrial.trialId});
            if(oldTrial && Date.now() - oldTrial.lastAccessed < 1800000){ //30 minutes
                return oldTrial;
            } else {
                return false;
            }
        }
    },
    'question': function(){
        var assessment = Assessments.findOne({_id: Meteor.user().curAssignment.id});
        data = {
            text: assessment.questions[this.questionid].text,
            answers: assessment.answers,
            answerValues: assessment.answerValues,
            reversedValues: assessment.reversedValues,
            totalQuestions: assessment.questions.length,
            percentageCompleted: ((this.questionid - 1) / assessment.questions.length * 100).toFixed()
        }
        return data;
    },
})

Template.assessment.events({
    'click .continue': function(event) {
        event.preventDefault();
        userId = Meteor.userId();
        trialData = Meteor.user().curTrial;
        let curAssesment = Assessments.findOne({_id: Meteor.user().curAssignment.id});
        let completed = false;

        if(typeof trialData === "undefined"){
            trialId = 0;
        } else {
            trialId = trialData.trialId;
        }

        if(typeof trialData === "undefined"){
            curQuestion = 0; 
        } else {
            curQuestion =  trialData.questionId;
        }

        let nextQuestion = parseInt(curQuestion) + 1;

        if(curAssesment.questions.length <= nextQuestion) {
            target = "/assessment/" + curAssesment._id + "/" + "completed";
            completed = true;
        } else {
            target = "/assessment/" + curAssesment._id + "/" + nextQuestion;
        }

        let selectedAnswer = event.target.id;
        let subscales
        if(curAssesment.questions[curQuestion]?.subscales)
            subscales = curAssesment.questions[curQuestion]?.subscales || curAssesment.questions[curQuestion - 1].subscales;//temp fix
        let selectedAnswerValue = assessment.answerValues[selectedAnswer];
        if(curAssesment.reversedQuestions.includes(curQuestion)){
            selectedAnswerValue = curAssesment.reversedValues[selectedAnswer]
        }

        let data = {
            trialId: trialId,
            assessmentId: curAssesment._id,
            assessmentName: curAssesment.title,
            userId: this.userId,
            identifier: curAssesment.identifier,
            questionId: curQuestion,
            response: selectedAnswer,
            responseValue: selectedAnswerValue,
            subscales: subscales || "",
            nextQuestion: curQuestion
        }

        Meteor.call('saveAssessmentData', data, function(error, result){
            if(error){
                console.log(error);
            } else {
                if (completed) {
                    Meteor.call('endAssessment', result);
                }
                Router.go(target);
            }
        });
    },
    'click .begin': function(event) {
        curAssesment = Assessments.findOne({_id: Meteor.user().curAssignment.id});
        target = "/assessment/" + curAssesment._id + "/" + "0";
        Router.go(target);
    },
    'click .return': function(event) {
        target = "/profile";
        Router.go(target);
    },
    'click .resume': function(event){
        curAssesment = Assessments.findOne({_id: Meteor.user().curAssignment.id});
        userId = Meteor.userId();
        user = Meteor.user();
        target = "/assessment/" + curAssesment._id + "/" + user.curTrial.questionId;
        Router.go(target)
    },
    'click #goBack': function(event){
        target = "/profile/"
        Router.go(target);
    },
    'click #startNextAssignment': function(event){
        let newUserAssignments = Orgs.findOne().newUserAssignments;
        const curAssignment = Meteor.user().curAssignment;
        const curAssignmentIndex = newUserAssignments.map(i => i.assignment).findIndex((element) => element == curAssignment.id);
        const nextAssignment = newUserAssignments[curAssignmentIndex + 1];
        target = `/${nextAssignment.type}/${nextAssignment.assignment}`;
        Meteor.call('setCurrentAssignment', {id: nextAssignment.assignment, type: nextAssignment.type, newUserAssignment: true}, function(err, res){
            if(err){
                console.log(err);
            } else {
                Router.go(target);
            }
        });
    }
})


Template.assessment.onCreated(function() {
    Meteor.subscribe('usertrials');
});


