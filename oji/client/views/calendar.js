Template.calendar.helpers({
    'calendar': function(){
        const t = Template.instance();
        displayMonthName =  t.displayMonthName.get();
        displayMonth = t.displayMonth.get();
        displayYear =  t.displayYear.get();
        displayMonth = t.displayMonth.get();
        daysInMonth = new Date(displayMonth, displayYear, 0).getDate(),
        daysStartsOnA = new Date(displayMonth, displayYear, 1).getDay(),
        curDay = 1;
        weeks = [];
        monthStarted = false;
        for(i = 0; i < 5; i++){
            weekDays = []
            for(j = 0; j < 7; j++){
                today = false;
                hasEvents = false;
                events = Events.find({month: displayMonth, day: curDay, year: displayYear}).fetch();
                if(curDay == new Date().getDate()){
                    today = true;
                }
                if(events.length != 0){
                    hasEvents = true;
                }
                if(!monthStarted && daysStartsOnA == j){
                    data = {
                        dayNum: curDay,
                        display: true,
                        today: today,
                        hasEvents: hasEvents
                    }
                    monthStarted = true;
                    curDay++;
                } else {
                    if(monthStarted && curDay <= daysInMonth){
                        data = {
                            dayNum: curDay,
                            display: true,
                            today: today,
                            hasEvents: hasEvents
                        }
                        curDay++;
                    } else {
                        data = {
                            dayNum: 0,
                            display: false
                        }
                    }
                }
                weekDays.push(data);
            }
            data = {
                days: weekDays
            }
            weeks.push(data);
        }
        calStarted = false;
        data = {
            Month: displayMonthName,
            NumMonth: displayMonth,
            Year: displayYear,
            DaysInMonth: daysInMonth,
            startsOn: daysStartsOnA,
            weeks: weeks
        };
        return data;
    },
    'agenda': function(){
        var date = new Date();
        var day = date.getDate();
        var month = date.getMonth();
        var year = date.getFullYear();
        events = Events.find({year: {$gte: year}, month: {$gte: month}, day:{$gte: day}}).fetch();
        events.forEach(element => {
            if(element.type == "All Organization" || element.onCreatedBy != Meteor.userId()){
                element.deleteShow = false;
            }

            if(element.type == "Supervisor Group" || element.onCreatedBy != Meteor.userId()){
                element.deleteShow = false;
            }
            if(element.type == "Personal"){
                element.deleteShow = true;
            }
        });
        return events;
    }
})

Template.calendar.events({
    'change #month-select': function(event){
        const t = Template.instance();
        t.selectedUser.set(event.target.value);
    },
    'click #createEvent': function(event){
        event.preventDefault();
        var date = new Date($('#date').val());
        var day = date.getDate();
        var month = date.getMonth();
        var year = date.getFullYear();
        type = $('#type').val();
        title = $('#title').val();
        Meteor.call('createEvent', type ,month, day, year, title);
    },
    'click #deleteEvent': function(event){
        event.preventDefault();
        eventId = $(event.target).data('id');
        Meteor.call('deleteEvent',eventId);
    }
})

Template.calendar.onCreated(function() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
    unixDate = new Date();
    curMonthName = monthNames[unixDate.getMonth()];
    curYear = unixDate.getFullYear();
    this.displayMonth = new ReactiveVar(unixDate.getMonth());
    this.displayMonthName = new ReactiveVar(curMonthName);
    this.displayYear = new ReactiveVar(curYear);
})