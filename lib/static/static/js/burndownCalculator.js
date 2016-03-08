(function() {

  angular.module('huburn').factory('burndownCalculator', function() {
    
    var getBurndown = function(milestone, issues) {
      var daysToGo = getDaysToGo(new Date(milestone.due_on));
      var total = getTotalCapitalizablePoints(issues);
      var burndownLine = getBurndownLine(total, milestone, issues);
      var idealLine = getIdealLine(burndownLine, total);
      var pointsRemaining = burndownLine[burndownLine.length-1].remaining;
      var pointsInProgress = getPointsInProgress(issues);

      return { 
        title: milestone.title,
        remaining: pointsRemaining,
        burndownLine: burndownLine,
        daysToGo: daysToGo,
        idealLine: idealLine,
        pointsInProgress: pointsInProgress
      };
    };

    var getBurndownLine = function(total, milestone, issues) {      
      var dateBuckets = {};

      var d = new Date(milestone.due_on);
      dateBuckets[d.toDateString()] = [];

      for(var i = 0; i < 13; i++) {
        d.setDate(d.getDate() - 1);
        dateBuckets[d.toDateString()] = [];
      }      

      for(var i = 0; i < issues.length; i++) {
        if (!issues[i].closed_at) continue;

        var dateClosedStr = new Date(issues[i].closed_at).toDateString();
        
        if (dateBuckets.hasOwnProperty(dateClosedStr) == false)
          dateBuckets[dateClosedStr] = [];

        dateBuckets[dateClosedStr].push(issues[i]);
      }

      var keys = Object.keys(dateBuckets);

      var coords = [];

      keys.forEach(function(key) {
        coords.push({
          date: new Date(key),
          burned: getTotalCapitalizablePoints(dateBuckets[key])
        });
      });  

      coords.sort(function(a,b) { return a.date.getTime() - b.date.getTime(); });   

      coords = removeWeekends(coords);

      coords[0].remaining = total - coords[0].burned;

      for(var i = 1; i < coords.length; i++)
        coords[i].remaining = coords[i-1].remaining - coords[i].burned;

      return coords;
    }

    var getDaysToGo = function(dueOn) {
      var dueOnTime = new Date(dueOn).getTime();
      var d = new Date();

      if (d.getTime() > dueOnTime) 
        return 0;

      var daysToGo = 1;

      while (d.getTime() < dueOnTime) {
        if (!isWeekend(d))
          daysToGo++;

        d.setDate(d.getDate() + 1);
      }
      
      return daysToGo;
    }

    var getIdealLine = function (burndown, total) {
      var idealCoords = [];
      var dailyBurn = total / (burndown.length - 1);

      for (var i = 0; i < burndown.length; i++)
        idealCoords.push({ date: burndown[i].date, remaining: total - dailyBurn * i });
            
      return idealCoords;
    }

    var removeWeekends = function(coords) {
      var withoutWeekends = [];
      var carryOver = 0;

      for(var i = 0; i < coords.length; i++) {
        if (isWeekend(coords[i].date)) {
          carryOver += coords[i].burned;
        } else {
          coords[i].burned += carryOver;
          carryOver = 0;          
          withoutWeekends.push(coords[i]);
        }        
      }

      return withoutWeekends;
    }

    var isWeekend = function (d) {
      var day = new Date(d).getDay();
      return day == 6 || day == 0;
    }   

    var getPointsInProgress = function(issues) {
      if (!issues || !issues.length) return 0;

      var issuesInProgress = issues.filter(function(i) { return isInProgress(i); });
      return getTotalCapitalizablePoints(issuesInProgress);
    }

    var isInProgress = function(issue) {
      for(var i = 0; i < issue.labels.length; i++)
        if (/^(2 - In Progress|3 - Review|4 - Testing|5 - Merge)$/.test(issue.labels[i].name))
          return true;

      return false;
    };

    var getCapitalizablePoints = function(issue) {        
      var potentialPoints = 0;
      for(var i = 0; i < issue.labels.length; i++)
        if (/^points: \d+$/.test(issue.labels[i].name))
    	  potentialPoints = parseInt(issue.labels[i].name.substring(8));
        else if (issue.labels[i].name == 'non cap')
          return 0;
          
      return potentialPoints;
    };
    
    var getCategoryData = function(issues) {
        var categories = {
            firelane: 0,
            escalation: 0,
            freerange: 0,
            nearMiss: 0,
            build: 0,
            zeroDefect: 0,
            feature: 0,
            research: 0,
            technicalDebt: 0
        };
        
        categories.firelane = getPointsForLabel(issues, /firelane/);
        categories.escalation = getPointsForLabel(issues, /escalation/);
        categories.freerange = getPointsForLabel(issues, /freerange/);
        categories.nearMiss = getPointsForLabel(issues, /near-miss/);
        categories.build = getPointsForLabel(issues, /Build Machine/);
        categories.zeroDefect = getPointsForLabel(issues, /zero-defect/);
        categories.feature = getPointsForLabel(issues, /feature/);
        categories.research = getPointsForLabel(issues, /research/);
        categories.technicalDebt = getPointsForLabel(issues, /technical debt/);
        
        return categories;
    }
    
    var getPointsForLabel = function(issues, regex) {
        var issues = issues.filter(function(i) { return hasLabel(i, regex); });
        
        if (issues.length > 0)
            return issues.map(getPoints).reduce(function(a, b) { return a + b; });
        else
            return 0;
    }
    
    var getPoints = function(issue) {
        for(var i = 0; i < issue.labels.length; i++)
            if (/^points: \d+$/.test(issue.labels[i].name))
                return parseInt(issue.labels[i].name.substring(8));
            
        return 0;
    }

    var getNumberOfLabel = function(issues, regex) {
      return issues.filter(function(i) { return hasLabel(i, regex); }).length;
    };

    var getNumberOfLabelOpen = function(issues, regex) {
      return issues.filter(function(i) { return hasLabel(i, regex) && i.state == 'open'; }).length;
    };

    var hasLabel = function(issue, regex) {
      for(var i = 0; i < issue.labels.length; i++)
        if(regex.test(issue.labels[i].name))
          return true;

      return false;
    };
    
    var getTotalPoints = function(issues) {
      if (!issues || !issues.length)
        return 0;

      return issues.map(getPoints)
        .reduce(function(a, b) { 
          return a + b; 
        });
    };

    var getTotalCapitalizablePoints = function(issues) {
      if (!issues || !issues.length) return 0;

      return issues.map(getCapitalizablePoints).reduce(function(a,b) { return a+b; });
    };

    function Burndown() {}
    Burndown.prototype.getBurndown = getBurndown;
    Burndown.prototype.getCapitalizablePoints = getCapitalizablePoints;
    Burndown.prototype.getTotalPoints = getTotalPoints;
    Burndown.prototype.getTotalCapitalizablePoints = getTotalCapitalizablePoints;
    Burndown.prototype.getNumberOfLabel = getNumberOfLabel;
    Burndown.prototype.getNumberOfLabelOpen = getNumberOfLabelOpen;
    Burndown.prototype.getCategoryData = getCategoryData;
    return new Burndown();
  });
}());  
