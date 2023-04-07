import html2canvas from 'html2canvas';

Template.assessment.helpers({
    'assessment': () => Assessments.findOne({_id: Meteor.user().curAssignment.id}),
    'isNotQuestion': () => this.isNotQuestion,
    'questionid': function() {return parseInt(this.questionid) + 1;},
    'completed' : function() {
        assessment = Assessments.findOne({_id: Meteor.user().curAssignment.id});
        if(this.questionid == "completed"){
            Meteor.call('clearAssessmentProgress');
            //get user assignments
            var assignments = Meteor.user().assigned;
            //remove the assignment matching the current assignment
            const newAssignments = assignments.filter(function(assignment){
                return assignment.assignment !== Meteor.user().curAssignment.id;
            });
            //update the user's assigned array
            Meteor.call('changeAssignmentOneUser', Meteor.userId(), newAssignments);
            //check if the user has completed all the assignments
            assignments = assignments.filter(function(assignment){
                return assignment.type !== "module";
            });
            //if there are no assignments left, the user has completed all the assignments
            if(assignments.length == 0 && Meteor.user().assessmentSchedule == "preOrientation"){
                Meteor.call('userFinishedOrientation');
            }
            return true;
        } else {
            return false;
        }
    },
    'isNewUserAssignment': function(){
    if(Meteor.user().hasCompletedFirstAssessment){
            return false;
        } else {
            return true;
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
    'postTreatment': function(){
        const schedule = Meteor.user().assessmentSchedule;
        if(schedule === "postTreatment"){
            //change the user's assessment schedule to finished
            Meteor.call('userFinishedPostTreatment');
            return true;
        } else {
            return false;
        }
    },
})

Template.assessment.events({
    'click .continue': function(event) {
        event.preventDefault();
        //change the color of the button to indicate that it has been clicked
        $(event.target).css("background-color", "#4CAF50");
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
        //get time stamp
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
            nextQuestion: curQuestion,
            date: Date.now().toString()
        }
        //use html2canvas to take a screenshot of the page
        html2canvas(document.body, {scale:0.25}).then(canvas => {
            console.log("saving screenshot");
            //convert the canvas to a data url
            let dataURL = canvas.toDataURL();
            //save the data url to the data object
            data.screenshot = dataURL;
            console.log(data);
            Meteor.call('saveAssessmentData', data, function(error, result){
                if(error){
                    console.log(error);
                } else {
                    if (completed) {
                        Meteor.call('endAssessment', result);
                    }
                }
            });
            //reset the button color
            $(event.target).css("background-color", "#22847f");
            Router.go(target);
        });
    },
    'click #congrats': function(event) {
        target = "/congrats";
        Router.go(target);
    },
    'click .begin': function(event) {
        curAssesment = Assessments.findOne({_id: Meteor.user().curAssignment.id});
        Meteor.call('setUserTrial', Meteor.userId(), curAssesment._id, 0);
        target = "/assessment/" + curAssesment._id + "/" + "0";
        Router.go(target);
    },
    'click #returnComplete': function(event) {
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
    },
    'click .readTTS': function(event){
        event.preventDefault();
        //disable all buttons
        $('.continue').prop('disabled', true);
        $('.readTTS').prop('disabled', true);
        //get data-text attribute from button
        let text = $(event.target).attr('data-text');
        console.log(text);
        //get template instance
        let instance = Template.instance();
        //read text using readTTS function
        readTTS(instance, text);
    },
    'click .glyphicon-bullhorn': function(event){
        event.preventDefault();
        //click parent button
        $(event.target).parent().click();
    }
})


Template.assessment.onCreated(function() {
    console.log("Meteor.user", Meteor.user());
    Meteor.subscribe('usertrials');
    this.TTSTracPlaying = new ReactiveVar(0);
    this.audioActive = new ReactiveVar(false);
    this.audioObjects = new ReactiveVar([]);
});


function readTTS(template, message){
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
                //enable all buttons
                $('.continue').prop('disabled', false);
                $('.readTTS').prop('disabled', false);
            }
            );
        }
    });
    window.currentAudioObj.play();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}