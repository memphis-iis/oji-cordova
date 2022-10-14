Template.module.helpers({
    'module': () => Modules.findOne({_id: Meteor.user().curAssignment?.id}),
    'pageid': function() {return parseInt(this.pageId) + 1;},
    'questionid': function() {return parseInt(this.questionId) + 1;},
    'totalpages': function(){
        if(Meteor.user().curAssignment){
            return Modules.findOne({_id: Meteor.user().curAssignment.id}).pages.length;
        }
    },
    'resume': function(){
        curPage = Meteor.user().curModule.pageId || 0;
        curQuestion = Meteor.user().curModule.questionId || 0;
        console.log(curPage, curQuestion);
        if(curPage > 0){
            return true;
        }
        return false;
    },
    'completed' : function(){
        if(Meteor.user().curModule.pageId == "completed"){
            //get user assignments
            const assignments = Meteor.user().assigned;
            //remove the assignment matching the current assignment
            const newAssignments = assignments.filter(function(assignment){
                return assignment.assignment !== Meteor.user().curAssignment.id;
            });
            //check if this is the last assignment
            if(newAssignments.length == 0){
                //call userFinishedOrientation
                Meteor.call('userFinishedOrientation');
            }
            //update the user's assigned array
            Meteor.call('changeAssignmentOneUser', Meteor.userId(), newAssignments);
            return true;
        } else {
            return false;
        }
    },
    'isNewUserAssignment': function(){
        if(!Meteor.user().hasCompletedFirstAssessment){
           //check if user has completed the first assessment
           return true;
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
                //check if page image is url or file
                if(page.image && page.image.startsWith("http")){
                    page.image = page.image;
                } else if(page.image){
                    //add full url
                    page.image = window.location.origin + "/" + page.image;
                }

                if(page.type == "activity"){
                    page.typeActivity = true;
                    t.pageType.set("activity");
                };
                if(!page.imgStyle){
                    page.imgStyle = "max-width:50%; height:auto; margin:10px;"
                }
                return page;
            }
            console.log("no page");
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
                if(fields[i].type == "displayText"){
                    fields[i].typeDisplayText = true;
                }
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
        let allowContinue = true;
        let moduleId = curUser.curModule.moduleId;
        console.log("curUSer", curUser);
        let moduleData = ModuleResults.findOne({_id: moduleId});
        console.log("moduleData", moduleData);
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
                goalIndexes = [];
                //iterate through each question in the combo
                for(i = 0; i < curModule.pages[thisPage].questions[thisQuestion].fields.length; i++){
                    //check if the question has a goal tag
                    if(curModule.pages[thisPage].questions[thisQuestion].fields[i].tag == "goals"){
                        //if it does, add the quesion index and the goal tag array
                        goalIndexes.push(i);
                    }
                }
                console.log("goalIndexes", goalIndexes);
                btnGrps = [];
                for(i = 0; i < allInput.length; i++){
                    //check if html element is a text area
                    if(allInput[i].nodeName == "TEXTAREA" || allInput[i].nodeName == "INPUT"){
                        //check if text area is empty
                        if(allInput[i].value == ""){
                            //change border color to red 1px
                            allInput[i].style.border = "1px solid red";
                            allowContinue = false;
                        } else {
                            response.push(allInput[i].value);
                        }
                    }
                    //get all buttons
                    if(allInput[i].nodeName == "BUTTON"){
                        //get the button group
                        groupIndex = parseInt(allInput[i].getAttribute("data-group") - 1);
                        //check if the button group is false or undefined
                        if(!btnGrps[groupIndex]){
                            //if it is, then check if the button has the class btn-info
                            if(allInput[i].classList.contains("btn-info")){
                                //if it does, then set the button group index to true
                                btnGrps[groupIndex] = true;
                            } else {
                                //if it doesn't, then set the button group index to false
                                btnGrps[groupIndex] = false;
                            }
                        }
                    }
                }
                console.log("btnGrps", btnGrps);
                //iterate over all button groups
                for(j = 0; j < btnGrps.length; j++){
                    //check if the button group is false or undefined
                    if(!btnGrps[j]){
                        //if it is, then set allowContinue to false
                        allowContinue = false;
                    } else {
                        allowContinue = true;
                    }
                }
                //check if there are any goals
                if(goalIndexes.length > 0){
                    goals = [];
                    //iterate trough each goal and add the response to the goals array
                    for(i = 0; i < goalIndexes.length; i++){
                        goals.push(response[goalIndexes[i]]);
                    }
                    //update the goals using a meteor call
                    Meteor.call('updateGoals', goals);
                }
            }
            data = {
                pageId: thisPage,
                questionId: thisQuestion,
                response: response,
                responseTimeStamp: Date.now().toString()
            }
            if(curModule.pages[thisPage].questions[thisQuestion].tag == "goals"){
                Meteor.call('updateGoals', response);
            }
            moduleData.responses.push(data);
            moduleData.nextPage = thisPage;
            moduleData.nextQuestion = parseInt(thisQuestion) + 1;
            if(typeof curModule.pages[moduleData.nextPage] !== "undefined"){
                if(typeof curModule.pages[moduleData.nextPage].questions !== "undefined"){
                    if(moduleData.nextQuestion >= curModule.pages[moduleData.nextPage].questions.length){
                        moduleData.nextPage = thisPage + 1;
                        moduleData.nextQuestion = 0;
                        moduleData.nextPage = thisPage + 1;
                        moduleData.nextQuestion = 0;
                        target = "/module/" + curModule._id + "/" + moduleData.nextPage + "/" + moduleData.nextQuestion;    
                      
                    } else  {
                        target = "/module/" + curModule._id + "/" + moduleData.nextPage + "/" + moduleData.nextQuestion;
                    }
                 } else {
                    moduleData.nextPage = thisPage + 1;
                    moduleData.nextQuestion = 0;
                    target = "/module/" + curModule._id + "/" + moduleData.nextPage + "/" + moduleData.nextQuestion;
                }
            } 
        } else {
            moduleData.nextPage = parseInt(thisPage) + 1;
            moduleData.nextQuestion = 0;
            if(curModule.pages[moduleData.nextPage]?.type == "activity" && curModule.pages[moduleData.nextPage]?.questions.length > 0){
                target = "/module/" + curModule._id + "/" + moduleData.nextPage + "/" + moduleData.nextQuestion;
            } else {
                target = "/module/" + curModule._id + "/" + moduleData.nextPage;
            }
            data = {
                pageId: thisPage,
                response: "read",
                responseTimeStamp: Date.now().toString()
            }
        }
        if(moduleData.nextPage >= curModule.pages.length){
            moduleData.nextPage = "completed";
            moduleData.nextQuestion = "completed";
            //update the user's assignments
            curAssignments = curUser.assigned;
            //remove the first assignment
            curAssignments.shift();
            //update the user's assignments
            Meteor.call('changeAssignmentOneUser', Meteor.userId(),  curAssignments);
            target = "/module/" + curModule._id + "/completed";
        } 
        $('textArea').val("");
        //if allowContinue is false, do not redirect
        if(allowContinue){
            Meteor.call("saveModuleData", moduleData);
            Router.go(target);
        } else {
            alert("Please fill in all fields and select an option for each question.");
        }
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
        module = Modules.findOne({_id: Meteor.user().curAssignment.id});
        console.log("start module " + this._id);
        data = {
            moduleId: module._id,
            userId: Meteor.userId(),
            lastAccessed: Date.now().toString(),
            responses: [],
        }
        Meteor.call('createNewModuleTrial',data);
        target = "/module/" + Meteor.user().curAssignment?.id + "/0";
        Router.go(target);
    },
    
    'click #resumeModule': function(event){
        event.preventDefault();
        curPage = Meteor.user().curModule.pageId;
        curQuestion = Meteor.user().curModule.questionId;
        if(curPage){
            target = "/module/" + Meteor.user().curAssignment?.id + "/" + curPage 
        }
        if(curQuestion){
            target = "/module/" + Meteor.user().curAssignment?.id + "/" + curPage + "/" + curQuestion;
        }
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
        if(nextAssignment){
            const target = `/${nextAssignment.type}/` + nextAssignment.assignment;
            Router.go(target);
        } else {
            Meteor.call('userFinishedOrientation');
            Router.go("/profile");
        }
    }
    
})

Template.module.onCreated(function(){
    Meteor.subscribe('getUserModuleResults');
    this.questionType = new ReactiveVar("");
    this.pageType = new ReactiveVar("");
    this.pageId = new ReactiveVar("");
})