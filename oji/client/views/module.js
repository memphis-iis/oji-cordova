Template.module.helpers({
    'module': () => Modules.findOne({_id: Meteor.user().curAssignment?.id}),
    'pageid': function() {return parseInt(this.pageId) + 1;},
    'questionid': function() {return parseInt(this.questionId) + 1;},
    'totalpages': function(){
        if(Meteor.user().curAssignment){
            return Modules.findOne({_id: Meteor.user().curAssignment.id}).pages.length;
        }
    },
    'completed' : function(){
        if(Meteor.user().curModule.pageId == "completed"){
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
    'isFurthestPage': function(){
        return Meteor.user().curModule.pageId == this.pageId;
    },
    'displayNextPageBtn': function(){
        if(Meteor.user().curModule){
            if(parseInt(this.pageId) < Meteor.user().curModule.pageId){
                return true;
            } else {
                return false;
            }
        }
    },
    'displayLastPageBth': function() {
        if(this.pageId  > 0){
            return true;
        } else {
            return false;
        }
    },
    'page': function(){
        const user = Meteor.user();
        if(user && user.curAssignment){
            page = Modules.findOne({_id: Meteor.user().curAssignment.id}).pages[parseInt(this.pageId)];
            if(page) {
                const t = Template.instance();
                $('.continue').show();
                if(parseInt(this.pageId) < Meteor.user().curModule.pageId){
                    $('.continue').hide();
                }
                if(page.type == "text"){
                    page.typeText = true;
                    t.pageType.set("text");
                };
                if(page.type == "activity"){
                    page.typeActivity = true;
                    t.pageType.set("activity");
                };
                if(!page.imgStyle){
                    page.imgStyle = "max-width:50%; height:auto; margin:10px;"
                }
                return page;
            }
        }
    },
    'question': function(){
        page = Modules.findOne({_id: Meteor.user().curAssignment.id}).pages[parseInt(this.pageId)];
        question = page.questions[parseInt(this.questionId)];
        const t = Template.instance();
        $('#continue').prop('disabled', false);
        if(parseInt(this.pageId) < Meteor.user().curModule.pageId){
            $('#continue').prop('disabled', true);
        }
        if(question.type.toLowerCase() == "blank"){
            question.typeBlank = true;
        };
        if(question.type.toLowerCase() == "multichoice"){
            question.typeMultiChoice = true;
        };
        if(question.type.toLowerCase() == "longtext"){
            question.typeLongText = true;
        };
        if(question.type.toLowerCase() == "dropdown"){
            question.typeDropDown = true;
        };
        if(question.type.toLowerCase() == "combo"){
            question.typeCombo= true;
            fields = question.fields;
            for(i = 0; i < fields.length; i++){
                if(fields[i].type == "blank"){
                    fields[i].typeBlank = true;
                };
                if(fields[i].type == "longtext"){
                    fields[i].typeLongText = true;
                };
                if(fields[i].type == "multiChoice"){
                    fields[i].typeMultiChoice = true;
                    for(j = 0; j < fields[i].answers.length; j++){
                        fields[i].answers[j].group = i;
                    }
                };
                
            }
        };
        t.questionType.set(question.type);
        question.length = question.length;
        if(!question.imgStyle){
            question.imgStyle = "max-width:50%; height:auto; margin:10px;";
        }
        return question;
    },
    'percentDone': function(){
        const user = Meteor.user();
        if(user && user.curAssignment){
            const length = Modules.findOne({_id: Meteor.user().curAssignment.id}).pages.length;
            percent = parseInt(this.pageId) / length * 100;
            return percent.toFixed(0);
        }
    },
});

Template.module.events({
    'click .continue': function(event) {
        event.preventDefault();
        const curModule = Modules.findOne({_id: Meteor.user().curAssignment.id});
        const curUser = Meteor.user();
        const t = Template.instance();
        let target = "";
        let moduleId = curUser.curModule.moduleId;
        let moduleData = ModuleResults.findOne({_id: moduleId});
        moduleData.lastAccessed = Date.now().toString();
        thisPage = curUser.curModule.pageId;
        thisQuestion = parseInt(curUser.curModule.questionId);
        if(t.pageType.get() == "activity"){
            questionData = {};
            questionData.questionType = t.questionType.get();
            if(questionData.questionType.toLowerCase() == "blank"){
                response = $('.textInput').val();
            }
            if(questionData.questionType.toLowerCase() == "multichoice"){
                response = $(event.target).html();
            }
            if(questionData.questionType.toLowerCase() == "longtext"){
                response = $('.textareaInput').val();
            }
            if(questionData.questionType.toLowerCase() == "combo"){
                allInput = document.getElementsByClassName('combo');
                response = [];
                for(i = 0; i < allInput.length; i++){
                    if ($(allInput[i]).prop('nodeName') == "INPUT" || $(allInput[i]).prop('nodeName') == "TEXTAREA"){
                        response.push($(allInput[i]).val());
                    }
                    if ($(allInput[i]).hasClass('btn-info')){
                        response.push($(allInput[i]).html());
                    }
                }
            }
            data = {
                pageId: thisPage,
                questionId: thisQuestion,
                response: response,
                responseTimeStamp: Date.now().toString()
            }
            moduleData.responses.push(data);
            moduleData.nextPage = thisPage;
            moduleData.nextQuestion = parseInt(thisQuestion) + 1;
            if(typeof curModule.pages[moduleData.nextPage] !== "undefined"){
                if(typeof curModule.pages[moduleData.nextPage].questions !== "undefined"){
                    if(moduleData.nextQuestion >= curModule.pages[moduleData.nextPage].questions.length){
                        moduleData.nextPage = thisPage + 1;
                        moduleData.nextQuestion = 0;
                        target = "/module/" + curModule._id + "/" + moduleData.nextPage;
                    } else  {
                        target = "/module/" + curModule._id + "/" + moduleData.nextPage + "/" + moduleData.nextQuestion;
                    }
                 }
            }
            
        } else {
            moduleData.nextPage = parseInt(thisPage) + 1;
            moduleData.nextQuestion = 0;
            data = {
                pageId: thisPage,
                response: "read",
                responseTimeStamp: Date.now().toString()
            }
            target = "/module/" + curModule._id + "/" + moduleData.nextPage;
        }
        if(moduleData.nextPage >= curModule.pages.length){
            moduleData.nextPage = "completed";
            moduleData.nextQuestion = "completed";
            index = curUser.assigned.findIndex(x => x.assignmentId === moduleId);
            if(index != -1){
                curUser.assigned.splice(index, 1);
            }
            curUser.assigned.splice(index, 1);
            Meteor.call('changeAssignmentOneUser', Meteor.userId(),  curUser.assigned);
            target = "/module/" + curModule._id + "/completed";
            Meteor.call('generateCertificate',curModule._id);
            if(curModule.lastModule){
                Meteor.call('generateCertificate');
            }
        } 
        Meteor.call("saveModuleData", moduleData);

        Router.go(target);
    },
    'click #startActivity': function(event){
        target =  $(location).attr('href') + "/0";
        Router.go(target);
    },
    'click .multichoice': function(event){
        event.preventDefault();
        const collection = document.getElementsByClassName("multichoice");
        for (let i = 0; i < collection.length; i++){
            if(collection[i].dataset.group == $(event.target).data("group")){
                collection[i].classList.remove("btn-info");
            }
        }
        event.target.classList.toggle('btn-info');
    },
    'click #startModule': function(event){
        event.preventDefault();
        data = {
            userId: Meteor.userId(),
            moduleId: Meteor.user().curAssignment?.id, 
            responses: []
        }
        Meteor.call("createNewModuleTrial", data);
        target = "/module/" + Meteor.user().curAssignment?.id + "/0";
        Router.go(target);
    },
    'click #goBack': function(event){
        target = "/profile/"
        Router.go(target);
    },
    'click #goBackPage': function(event){
        lastPage = this.pageId - 1
        target = "/module/" + Meteor.user().curAssignment?.id + "/" + lastPage;
        Router.go(target);
    },
    'click #goForward': function(event){
        nextPage = parseInt(this.pageId) + 1;
        target = "/module/" + Meteor.user().curAssignment?.id + "/" + nextPage;
        Router.go(target);
    },
    'click #continueJourney': function(event){
        let newUserAssignments = Orgs.findOne().newUserAssignments;
        const curAssignment = Meteor.user().curAssignment;
        let curAssignmentIndex = newUserAssignments.map(i => i.assignment).findIndex((element) => element == curAssignment.id)
        const nextAssignment = newUserAssignments[curAssignmentIndex + 1];
        const target = `/${nextAssignment.type}/` + nextAssignment.assignment;
        Meteor.call('setCurrentAssignment', {id: nextAssignment.assignment, type: nextAssignment.type, newUserAssignment: true}, function(err, res){
            if(err){
                console.log(err);
            } else {
                Router.go(target);
            }
        });
    }
    
})

Template.module.onCreated(function(){
    this.questionType = new ReactiveVar("");
    this.pageType = new ReactiveVar("");
    this.pageId = new ReactiveVar("");
})