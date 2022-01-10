Template.assessment.helpers({
    'assessment': () => Assessments.findOne(),
    'isNotQuestion': () => this.isNotQuestion,
    'questionid': function() {return parseInt(this.questionid) + 1;},
    'completed' : function() {
        assessment = Assessments.findOne();
        if(this.questionid == "completed"){
            Meteor.call('clearAssessmentProgress')
            return true;
        } else {
            return false;
        }
    },
    'question': function(){
        var assessment = Assessments.findOne();
        data = {
            text: assessment.questions[this.questionid].text,
            answers: assessment.answers,
            answerValues: assessment.answerValues,
            reversedValues: assessment.reversedValues,
        }
        console.log(data);
        return data;
    }
})

Template.assessment.events({
    'click .continue': function(event) {
        event.preventDefault();
        trialData = Meteor.users.findOne().curTrial;
        console.log('trialData', trialData);
        assessment = Assessments.findOne();
        trialId = trialData.trialId
        selectedAnswer = event.target.id;
        selectedAnswerValue = assessment.answerValues[selectedAnswer];
        selectedAnserReversedValue = assessment.reversedValues[selectedAnswer];
        curAssesment = Assessments.findOne();
        curQuestion = trialData.questionId;
        nextQuestion = parseInt(curQuestion) + 1;
        if(curAssesment.questions.length <= nextQuestion) {
            target = "/assessment/" + curAssesment._id + "/" + "completed";
        } else {
            target = "/assessment/" + curAssesment._id + "/" + nextQuestion;
        }
        data = {
            trialId: trialId,
            userId: this.userId,
            questionId: curQuestion,
            response: selectedAnswer,
            responseValue: selectedAnswerValue,
            reversedValue: selectedAnserReversedValue
        }
        curTrialId = Meteor.call('saveAssessmentData', data, function(error, result){
            Session.set('curTrialId',result);
        });
        console.log('curTrialId', Session.get('curTrialId'));
        Router.go(target);
    },
    'click .begin': function(event) {
        curAssesment = Assessments.findOne();
        target = "/assessment/" + curAssesment._id + "/" + "0";
        Router.go(target);
    },
    'click .return': function(event) {
        target = "/assessmentCenter";
        Router.go(target);
    }

})





