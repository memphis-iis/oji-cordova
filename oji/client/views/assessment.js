Template.assessment.helpers({
    'assessment': () => Assessments.findOne({_id: Meteor.user().curAssignment.id}),
    'isNotQuestion': () => this.isNotQuestion,
    'questionid': function() {return parseInt(this.questionid) + 1;},
    'completed' : function() {
        assessment = Assessments.findOne({_id: Meteor.user().curAssignment.id});
        if(this.questionid == "completed"){
            Meteor.call('clearAssessmentProgress');
            //get user assignments
            const assignments = Meteor.user().assigned;
            //remove the assignment matching the current assignment
            const newAssignments = assignments.filter(function(assignment){
                return assignment.assignment !== Meteor.user().curAssignment.id;
            });
            //update the user's assigned array
            Meteor.call('changeAssignmentOneUser', Meteor.userId(), newAssignments);
            return true;
        } else {
            return false;
        }
    },
    'isNewUserAssignment': function(){
        if(!Meteor.user().hasCompletedFirstAssessment){
            let newUserAssignments = Orgs.findOne().newUserAssignments;
            const curAssignment = Meteor.user().curAssignment;
            const newUserAssignmentsRemaining = newUserAssignments.filter(assignment => assignment.assignmentId !== curAssignment.id);
            if(newUserAssignmentsRemaining.length == 0){
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
        console.log(trialData);
        console.log(curAssesment);

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
            }
        });
        Router.go(target);

    },
    'click .begin': function(event) {
        curAssesment = Assessments.findOne({_id: Meteor.user().curAssignment.id});
        Meteor.call('setUserTrial', Meteor.userId(), curAssesment._id, 0);
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
        Meteor.call('setCurrentAssignment',nextAssignment.assignment);     
        Meteor.call('createNewModuleTrial')
        //check if next assignment is a module
        if(nextAssignment.type == "module"){
            target = '/postAssessmentPrompt';
        } else {
            target = `/${nextAssignment.type}/${nextAssignment.assignment}`;
        }
        Router.go(target);
    }
})


Template.assessment.onCreated(function() {
    Meteor.subscribe('usertrials');
    this.TTSTracPlaying = new ReactiveVar(0);
    this.audioActive = new ReactiveVar(false);
    this.audioObjects = new ReactiveVar([]);
});


ffunction readTTS(template, message){
    console.log("readTTS", message);
    //remove quotes from message
    message = message.replace(/"/g, "");
    let audioActive = template.audioActive.get();
    template.audioActive.set(true);
    let audioObj = new Audio();
    let audioObjects = template.audioObjects.get();
    audioObjects.push({obj:audioObj});
    let order = audioObjects.length;
    template.audioObjects.set(audioObjects);
    voice = "en-US-Standard-C";
    Meteor.call('makeGoogleTTSApiCall', message, voice, function(err, res) {
        if(err){
            console.log("Something went wrong with TTS, ", err)
        }
        if(res != undefined){
            let audioObjects = template.audioObjects.get();
            audioObjects[order - 1].obj.src = "data:audio/ogg;base64," + res;
            template.audioObjects.set(audioObjects)
            if(!audioActive){
                $('.continue').prop('disabled', true); 
                $('.continue').prop('hidden', true); 
                template.audioActive.set(true);
                playAudio(template);
            }
        }
    });
}

async function playAudio(template){
    let TTSTracPlaying = template.TTSTracPlaying.get();
    let audioObjs = template.audioObjects.get();
    const audioObj = audioObjs[TTSTracPlaying].obj;
    template.TTSTracPlaying.set(TTSTracPlaying + 1);
    window.currentAudioObj = audioObj;
    window.currentAudioObj.addEventListener('ended', function(){
        TTSTracPlaying++;
        template.TTSTracPlaying.set(TTSTracPlaying);
        if(audioObjs.length > TTSTracPlaying){
            sleep(1000).then(function(){
                playAudio(template);       
            });
        }
        else{
            var curTime = new Date().getTime();
            sleep(1000).then(function(){
                template.audioActive.set(false);
            }
            );
        }
    });
    window.currentAudioObj.play();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}